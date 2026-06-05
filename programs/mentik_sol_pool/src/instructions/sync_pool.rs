use anchor_lang::prelude::*;

use crate::constants::*;
use crate::rewards::update_pool;
use crate::state::GlobalState;

#[derive(Accounts)]
pub struct SyncPool<'info> {
    #[account(
        mut,
        seeds = [GLOBAL_SEED],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
}

pub fn handler(ctx: Context<SyncPool>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    update_pool(&mut ctx.accounts.global_state, now)?;
    Ok(())
}
