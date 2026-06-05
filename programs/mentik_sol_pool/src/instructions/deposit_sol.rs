use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::constants::*;
use crate::error::PoolError;
use crate::rewards::{settle_stake, update_pool};
use crate::state::{GlobalState, StakeAccount};

#[derive(Accounts)]
pub struct DepositSol<'info> {
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
        init_if_needed,
        payer = user,
        space = 8 + StakeAccount::INIT_SPACE,
        seeds = [STAKE_SEED, user.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
    require!(amount > 0, PoolError::ZeroDeposit);

    let now = Clock::get()?.unix_timestamp;
    let global = &mut ctx.accounts.global_state;
    update_pool(global, now)?;

    let stake = &mut ctx.accounts.stake_account;
    if stake.owner == Pubkey::default() {
        stake.bump = ctx.bumps.stake_account;
        stake.owner = ctx.accounts.user.key();
        stake.sol_amount = 0;
        stake.reward_debt = 0;
        stake.pending_rewards = 0;
    } else {
        require_keys_eq!(stake.owner, ctx.accounts.user.key());
        settle_stake(stake, global)?;
    }

    transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.sol_vault.to_account_info(),
            },
        ),
        amount,
    )?;

    stake.sol_amount = stake
        .sol_amount
        .checked_add(amount)
        .ok_or(PoolError::MathOverflow)?;
    global.total_staked = global
        .total_staked
        .checked_add(amount)
        .ok_or(PoolError::MathOverflow)?;

    stake.reward_debt = (stake.sol_amount as u128)
        .checked_mul(global.reward_per_lamport)
        .ok_or(PoolError::MathOverflow)?
        .checked_div(ACC_PRECISION)
        .ok_or(PoolError::MathOverflow)?;

    msg!("Deposited {} lamports; pool TVL {}", amount, global.total_staked);
    Ok(())
}
