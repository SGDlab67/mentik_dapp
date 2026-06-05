use anchor_lang::prelude::*;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

use crate::constants::*;
use crate::error::PoolError;
use crate::rewards::{pending_since_debt, update_pool};
use crate::state::{GlobalState, StakeAccount};

#[derive(Accounts)]
pub struct ClaimMentik<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_SEED],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [STAKE_SEED, user.key().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.owner == user.key() @ PoolError::InsufficientStake,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(
        mut,
        seeds = [MENTIK_MINT_SEED],
        bump,
        address = global_state.mentik_mint
    )]
    pub mentik_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = mentik_mint,
        token::authority = user,
    )]
    pub user_mentik_ata: Account<'info, TokenAccount>,

    #[account(
        seeds = [MINT_AUTHORITY_SEED],
        bump
    )]
    /// CHECK: mint authority PDA
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimMentik>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let global = &mut ctx.accounts.global_state;
    update_pool(global, now)?;

    let stake = &mut ctx.accounts.stake_account;
    let newly_accrued = pending_since_debt(stake, global)?;
    let total_claim = stake
        .pending_rewards
        .checked_add(newly_accrued)
        .ok_or(PoolError::MathOverflow)?;

    require!(total_claim > 0, PoolError::NothingToClaim);

    let mint_authority_bump = ctx.bumps.mint_authority;
    let signer_seeds: &[&[u8]] = &[MINT_AUTHORITY_SEED, &[mint_authority_bump]];

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            MintTo {
                mint: ctx.accounts.mentik_mint.to_account_info(),
                to: ctx.accounts.user_mentik_ata.to_account_info(),
                authority: ctx.accounts.mint_authority.to_account_info(),
            },
            &[signer_seeds],
        ),
        total_claim,
    )?;

    stake.pending_rewards = 0;
    stake.reward_debt = (stake.sol_amount as u128)
        .checked_mul(global.reward_per_lamport)
        .ok_or(PoolError::MathOverflow)?
        .checked_div(ACC_PRECISION)
        .ok_or(PoolError::MathOverflow)?;

    msg!("Claimed {} MENTIK base units", total_claim);
    Ok(())
}
