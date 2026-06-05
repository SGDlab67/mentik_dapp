use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GlobalState {
    pub bump: u8,
    pub authority: Pubkey,
    pub mentik_mint: Pubkey,
    pub reward_per_lamport: u128,
    pub last_update_timestamp: i64,
    pub total_staked: u64,
}

#[account]
#[derive(InitSpace)]
pub struct StakeAccount {
    pub bump: u8,
    pub owner: Pubkey,
    pub sol_amount: u64,
    pub reward_debt: u128,
    /// Accrued MENTIK (base units) not yet claimed; settled on deposit/withdraw.
    pub pending_rewards: u64,
}
