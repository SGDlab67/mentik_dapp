pub mod constants;
pub mod error;
pub mod instructions;
pub mod rewards;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("56zRQzpWpV8VKDpnVQGjvtpyZb9NzS3ox8UJp97taRX1");

#[program]
pub mod mentik_sol_pool {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }

    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64, lock_seconds: u64) -> Result<()> {
        deposit_sol::handler(ctx, amount, lock_seconds)
    }

    pub fn withdraw_sol(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
        withdraw_sol::handler(ctx, amount)
    }

    pub fn claim_mentik(ctx: Context<ClaimMentik>) -> Result<()> {
        claim_mentik::handler(ctx)
    }

    pub fn migrate_stake_account(ctx: Context<MigrateStakeAccount>) -> Result<()> {
        migrate_stake_account::handler(ctx)
    }

    pub fn sync_pool(ctx: Context<SyncPool>) -> Result<()> {
        sync_pool::handler(ctx)
    }
}
