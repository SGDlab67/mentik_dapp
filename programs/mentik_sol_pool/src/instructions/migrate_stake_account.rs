use anchor_lang::prelude::*;

use crate::constants::*;
use crate::error::PoolError;
use crate::state::StakeAccount;

const LEGACY_STAKE_ACCOUNT_SPACE: usize = 8 + 1 + 32 + 8 + 16 + 8;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LegacyStakeAccount {
    pub bump: u8,
    pub owner: Pubkey,
    pub sol_amount: u64,
    pub reward_debt: u128,
    pub pending_rewards: u64,
}

impl Owner for LegacyStakeAccount {
    fn owner() -> Pubkey {
        crate::ID
    }
}

impl AccountDeserialize for LegacyStakeAccount {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self> {
        if buf.len() != LEGACY_STAKE_ACCOUNT_SPACE || !buf.starts_with(StakeAccount::DISCRIMINATOR)
        {
            return Err(anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into());
        }

        *buf = &buf[StakeAccount::DISCRIMINATOR.len()..];
        Self::try_deserialize_unchecked(buf)
    }

    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        AnchorDeserialize::deserialize(buf)
            .map_err(|_| anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into())
    }
}

#[derive(Accounts)]
pub struct MigrateStakeAccount<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [STAKE_SEED, user.key().as_ref()],
        bump,
        realloc = 8 + StakeAccount::INIT_SPACE,
        realloc::payer = user,
        realloc::zero = true,
    )]
    pub stake_account: Migration<'info, LegacyStakeAccount, StakeAccount>,

    pub system_program: Program<'info, System>,
}

pub fn handler(mut ctx: Context<MigrateStakeAccount>) -> Result<()> {
    let legacy = ctx.accounts.stake_account.try_as_from()?;

    require_keys_eq!(
        legacy.owner,
        ctx.accounts.user.key(),
        PoolError::InsufficientStake
    );

    ctx.accounts.stake_account.migrate(StakeAccount {
        bump: legacy.bump,
        owner: legacy.owner,
        sol_amount: legacy.sol_amount,
        reward_debt: legacy.reward_debt,
        pending_rewards: legacy.pending_rewards,
        locked_until: 0,
    })?;

    msg!("Migrated stake account for {}", ctx.accounts.user.key());
    Ok(())
}
