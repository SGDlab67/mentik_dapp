use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::constants::*;
use crate::error::PoolError;
use crate::rewards::{settle_stake, update_pool};
use crate::state::{
    ensure_stake_account_space, load_stake_account, save_stake_account, GlobalState, StakeAccount,
};

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

    /// CHECK: Loaded manually to support stake accounts created before lock fields existed.
    #[account(
        mut,
        seeds = [STAKE_SEED, user.key().as_ref()],
        bump
    )]
    pub stake_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DepositSol>, amount: u64, lock_seconds: u64) -> Result<()> {
    require!(amount > 0, PoolError::ZeroDeposit);
    require!(
        is_valid_lock_duration(lock_seconds),
        PoolError::InvalidLockDuration
    );

    let now = Clock::get()?.unix_timestamp;
    let global = &mut ctx.accounts.global_state;
    update_pool(global, now)?;

    let stake_info = ctx.accounts.stake_account.to_account_info();
    let mut stake = load_stake_account(&stake_info)?.unwrap_or(StakeAccount {
        bump: ctx.bumps.stake_account,
        owner: Pubkey::default(),
        sol_amount: 0,
        reward_debt: 0,
        pending_rewards: 0,
        locked_until: 0,
    });

    if stake.owner == Pubkey::default() {
        stake.bump = ctx.bumps.stake_account;
        stake.owner = ctx.accounts.user.key();
        stake.sol_amount = 0;
        stake.reward_debt = 0;
        stake.pending_rewards = 0;
        stake.locked_until = 0;
    } else {
        require_keys_eq!(
            stake.owner,
            ctx.accounts.user.key(),
            PoolError::InsufficientStake
        );
        settle_stake(&mut stake, global)?;
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

    if lock_seconds > 0 {
        let new_lock = now
            .checked_add(lock_seconds as i64)
            .ok_or(PoolError::MathOverflow)?;
        stake.locked_until = stake.locked_until.max(new_lock);
    }

    let user_key = ctx.accounts.user.key();
    let signer_seeds: &[&[u8]] = &[STAKE_SEED, user_key.as_ref(), &[ctx.bumps.stake_account]];
    ensure_stake_account_space(
        &stake_info,
        &ctx.accounts.user.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        ctx.program_id,
        signer_seeds,
    )?;
    save_stake_account(&stake_info, &stake)?;

    msg!(
        "Deposited {} lamports; pool TVL {}",
        amount,
        global.total_staked
    );
    Ok(())
}
