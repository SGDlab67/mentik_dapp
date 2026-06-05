use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::constants::*;
use crate::error::PoolError;
use crate::rewards::{settle_stake, update_pool};
use crate::state::{GlobalState, StakeAccount};

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_SEED],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    /// CHECK: SOL vault PDA.
    #[account(
        mut,
        seeds = [SOL_VAULT_SEED],
        bump
    )]
    pub sol_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [STAKE_SEED, user.key().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.owner == user.key() @ PoolError::InsufficientStake,
    )]
    pub stake_account: Account<'info, StakeAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
    require!(amount > 0, PoolError::ZeroDeposit);

    let now = Clock::get()?.unix_timestamp;
    let global = &mut ctx.accounts.global_state;
    update_pool(global, now)?;

    let stake = &mut ctx.accounts.stake_account;
    settle_stake(stake, global)?;

    require!(stake.sol_amount >= amount, PoolError::InsufficientStake);

    stake.sol_amount = stake
        .sol_amount
        .checked_sub(amount)
        .ok_or(PoolError::MathOverflow)?;
    global.total_staked = global
        .total_staked
        .checked_sub(amount)
        .ok_or(PoolError::MathOverflow)?;

    stake.reward_debt = (stake.sol_amount as u128)
        .checked_mul(global.reward_per_lamport)
        .ok_or(PoolError::MathOverflow)?
        .checked_div(ACC_PRECISION)
        .ok_or(PoolError::MathOverflow)?;

    let vault_bump = ctx.bumps.sol_vault;
    let signer_seeds: &[&[u8]] = &[SOL_VAULT_SEED, &[vault_bump]];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.sol_vault.to_account_info(),
                to: ctx.accounts.user.to_account_info(),
            },
            &[signer_seeds],
        ),
        amount,
    )?;

    msg!("Withdrew {} lamports", amount);
    Ok(())
}
