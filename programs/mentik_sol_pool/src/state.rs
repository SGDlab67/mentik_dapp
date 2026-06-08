use anchor_lang::prelude::*;

use crate::error::PoolError;

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

impl StakeAccount {
    pub const DISCRIMINATOR_SPACE: usize = 8;
    pub const LOCKED_UNTIL_SPACE: usize = 8;
    pub const LOCKED_UNTIL_OFFSET: usize = Self::DISCRIMINATOR_SPACE + Self::INIT_SPACE;
    pub const SPACE_WITH_LOCK: usize = Self::LOCKED_UNTIL_OFFSET + Self::LOCKED_UNTIL_SPACE;

    /// Backward-compatible lock timestamp. Legacy stake PDAs do not have the
    /// trailing lock field, so they are treated as flexible/unlocked.
    pub fn locked_until_from_data(data: &[u8]) -> Result<i64> {
        if data.len() < Self::SPACE_WITH_LOCK {
            return Ok(0);
        }

        let bytes: [u8; Self::LOCKED_UNTIL_SPACE] = data
            [Self::LOCKED_UNTIL_OFFSET..Self::SPACE_WITH_LOCK]
            .try_into()
            .map_err(|_| PoolError::StakeAccountTooSmall)?;
        Ok(i64::from_le_bytes(bytes))
    }

    pub fn set_locked_until_in_data(data: &mut [u8], locked_until: i64) -> Result<()> {
        require!(
            data.len() >= Self::SPACE_WITH_LOCK,
            PoolError::StakeAccountTooSmall
        );
        data[Self::LOCKED_UNTIL_OFFSET..Self::SPACE_WITH_LOCK]
            .copy_from_slice(&locked_until.to_le_bytes());
        Ok(())
    }
}
