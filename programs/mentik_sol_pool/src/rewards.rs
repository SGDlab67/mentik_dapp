use anchor_lang::prelude::*;

use crate::constants::{ACC_PRECISION, DAILY_EMISSION, SECONDS_PER_DAY};
use crate::error::PoolError;
use crate::state::{GlobalState, StakeAccount};

/// Advance the global reward index. When `total_staked == 0`, only bump timestamp.
pub fn update_pool(global: &mut GlobalState, now: i64) -> Result<()> {
    if now <= global.last_update_timestamp {
        return Ok(());
    }

    let elapsed = (now - global.last_update_timestamp) as u128;

    if global.total_staked > 0 {
        let emitted = DAILY_EMISSION
            .checked_mul(elapsed)
            .ok_or(PoolError::MathOverflow)?
            .checked_div(SECONDS_PER_DAY)
            .ok_or(PoolError::MathOverflow)?;

        let increment = emitted
            .checked_mul(ACC_PRECISION)
            .ok_or(PoolError::MathOverflow)?
            .checked_div(global.total_staked as u128)
            .ok_or(PoolError::MathOverflow)?;

        global.reward_per_lamport = global
            .reward_per_lamport
            .checked_add(increment)
            .ok_or(PoolError::MathOverflow)?;
    }

    global.last_update_timestamp = now;
    Ok(())
}

pub fn pending_since_debt(stake: &StakeAccount, global: &GlobalState) -> Result<u64> {
    if stake.sol_amount == 0 {
        return Ok(0);
    }

    let accumulated = (stake.sol_amount as u128)
        .checked_mul(global.reward_per_lamport)
        .ok_or(PoolError::MathOverflow)?
        .checked_div(ACC_PRECISION)
        .ok_or(PoolError::MathOverflow)?
        .checked_sub(stake.reward_debt)
        .ok_or(PoolError::MathOverflow)?;

    u64::try_from(accumulated).map_err(|_| PoolError::MathOverflow.into())
}

/// Move index accrual into `pending_rewards` and reset debt to the current stake.
pub fn settle_stake(stake: &mut StakeAccount, global: &GlobalState) -> Result<()> {
    let newly_accrued = pending_since_debt(stake, global)?;
    stake.pending_rewards = stake
        .pending_rewards
        .checked_add(newly_accrued)
        .ok_or(PoolError::MathOverflow)?;

    stake.reward_debt = (stake.sol_amount as u128)
        .checked_mul(global.reward_per_lamport)
        .ok_or(PoolError::MathOverflow)?
        .checked_div(ACC_PRECISION)
        .ok_or(PoolError::MathOverflow)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{GlobalState, StakeAccount};
    use anchor_lang::prelude::Pubkey;

    #[test]
    fn single_staker_daily_emission() {
        let mut global = GlobalState {
            bump: 0,
            authority: Pubkey::default(),
            mentik_mint: Pubkey::default(),
            reward_per_lamport: 0,
            last_update_timestamp: 0,
            total_staked: 1_000_000_000,
        };
        update_pool(&mut global, 86_400).unwrap();
        assert!(global.reward_per_lamport > 0);

        let stake = StakeAccount {
            bump: 0,
            owner: Pubkey::default(),
            sol_amount: 1_000_000_000,
            reward_debt: 0,
            pending_rewards: 0,
        };
        let pending = pending_since_debt(&stake, &global).unwrap();
        assert_eq!(pending, DAILY_EMISSION as u64);
    }
}
