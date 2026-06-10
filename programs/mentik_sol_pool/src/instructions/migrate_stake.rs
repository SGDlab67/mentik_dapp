use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_lang::{AccountDeserialize, AccountSerialize, AnchorDeserialize, Discriminator};

use crate::constants::*;
use crate::error::PoolError;
use crate::state::StakeAccount;

const LEGACY_STAKE_ACCOUNT_SPACE: usize = 1 + 32 + 8 + 16 + 8;

#[derive(AnchorDeserialize)]
struct LegacyStakeAccount {
    bump: u8,
    owner: Pubkey,
    sol_amount: u64,
    reward_debt: u128,
    pending_rewards: u64,
}

#[derive(Accounts)]
pub struct MigrateStake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Legacy stake accounts are smaller than the current StakeAccount
    /// layout, so this instruction validates and deserializes the bytes manually.
    #[account(
        mut,
        seeds = [STAKE_SEED, user.key().as_ref()],
        bump
    )]
    pub stake_account: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MigrateStake>) -> Result<()> {
    let stake_info = ctx.accounts.stake_account.to_account_info();
    require_keys_eq!(
        *stake_info.owner,
        crate::ID,
        PoolError::InvalidStakeAccountLayout
    );

    let current_len = stake_info.data_len();
    let new_len = 8 + StakeAccount::INIT_SPACE;

    if current_len == new_len {
        let data = stake_info.try_borrow_data()?;
        let mut data_ref: &[u8] = data.as_ref();
        let stake = StakeAccount::try_deserialize(&mut data_ref)?;
        require_keys_eq!(
            stake.owner,
            ctx.accounts.user.key(),
            PoolError::InsufficientStake
        );
        msg!("Stake account already migrated");
        return Ok(());
    }

    require!(
        current_len == 8 + LEGACY_STAKE_ACCOUNT_SPACE,
        PoolError::InvalidStakeAccountLayout
    );

    let legacy = {
        let data = stake_info.try_borrow_data()?;
        require!(
            data.len() >= 8 && data[..8] == StakeAccount::DISCRIMINATOR[..],
            PoolError::InvalidStakeAccountLayout
        );
        let mut payload: &[u8] = &data[8..];
        LegacyStakeAccount::deserialize(&mut payload)?
    };
    require_keys_eq!(
        legacy.owner,
        ctx.accounts.user.key(),
        PoolError::InsufficientStake
    );

    let required_lamports = Rent::get()?.minimum_balance(new_len);
    let current_lamports = stake_info.lamports();
    if current_lamports < required_lamports {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: stake_info.clone(),
                },
            ),
            required_lamports
                .checked_sub(current_lamports)
                .ok_or(PoolError::MathOverflow)?,
        )?;
    }

    stake_info.resize(new_len)?;

    let migrated = StakeAccount {
        bump: legacy.bump,
        owner: legacy.owner,
        sol_amount: legacy.sol_amount,
        reward_debt: legacy.reward_debt,
        pending_rewards: legacy.pending_rewards,
        locked_until: 0,
    };

    let mut data = stake_info.try_borrow_mut_data()?;
    let mut writer: &mut [u8] = &mut data;
    migrated.try_serialize(&mut writer)?;

    msg!("Migrated legacy stake account");
    Ok(())
}
