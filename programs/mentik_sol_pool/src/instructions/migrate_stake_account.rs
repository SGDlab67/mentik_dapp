use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::PoolError;
use crate::state::StakeAccount;

#[derive(Accounts)]
pub struct MigrateStakeAccount<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Reallocated before manual deserialization so pre-lock stake accounts can load.
    #[account(
        mut,
        seeds = [STAKE_SEED, user.key().as_ref()],
        bump,
        realloc = 8 + StakeAccount::INIT_SPACE,
        realloc::payer = user,
        realloc::zero = true,
    )]
    pub stake_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MigrateStakeAccount>) -> Result<()> {
    let account_info = ctx.accounts.stake_account.to_account_info();
    let mut data: &[u8] = &account_info.try_borrow_data()?;
    let stake = StakeAccount::try_deserialize(&mut data)?;

    require_keys_eq!(
        stake.owner,
        ctx.accounts.user.key(),
        PoolError::InsufficientStake
    );

    msg!("Migrated stake account for {}", ctx.accounts.user.key());
    Ok(())
}
