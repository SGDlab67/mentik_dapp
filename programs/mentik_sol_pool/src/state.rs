use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, program::invoke_signed, system_instruction};

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
    /// Unix timestamp when withdraw is allowed; 0 = no lock.
    pub locked_until: i64,
}

pub const STAKE_ACCOUNT_SPACE: usize = 8 + StakeAccount::INIT_SPACE;

const LEGACY_STAKE_ACCOUNT_SPACE: usize = 8 + 1 + 32 + 8 + 16 + 8;

#[derive(AnchorDeserialize)]
struct LegacyStakeAccount {
    bump: u8,
    owner: Pubkey,
    sol_amount: u64,
    reward_debt: u128,
    pending_rewards: u64,
}

impl From<LegacyStakeAccount> for StakeAccount {
    fn from(legacy: LegacyStakeAccount) -> Self {
        Self {
            bump: legacy.bump,
            owner: legacy.owner,
            sol_amount: legacy.sol_amount,
            reward_debt: legacy.reward_debt,
            pending_rewards: legacy.pending_rewards,
            locked_until: 0,
        }
    }
}

pub fn load_stake_account(stake_info: &AccountInfo) -> Result<Option<StakeAccount>> {
    if stake_info.data_is_empty() {
        return Ok(None);
    }

    require_keys_eq!(*stake_info.owner, crate::ID, PoolError::InvalidStakeAccount);

    let data = stake_info.try_borrow_data()?;
    require!(
        data.len() == LEGACY_STAKE_ACCOUNT_SPACE || data.len() >= STAKE_ACCOUNT_SPACE,
        PoolError::InvalidStakeAccount
    );
    require!(
        data.starts_with(StakeAccount::DISCRIMINATOR),
        PoolError::InvalidStakeAccount
    );

    if data.len() >= STAKE_ACCOUNT_SPACE {
        let mut slice: &[u8] = &data;
        return StakeAccount::try_deserialize(&mut slice).map(Some);
    }

    let mut body: &[u8] = &data[8..];
    LegacyStakeAccount::deserialize(&mut body)
        .map(StakeAccount::from)
        .map(Some)
        .map_err(|_| error!(PoolError::InvalidStakeAccount))
}

pub fn ensure_stake_account_space<'info>(
    stake_info: &AccountInfo<'info>,
    payer: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    program_id: &Pubkey,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    if stake_info.data_is_empty() {
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(STAKE_ACCOUNT_SPACE);
        let ix = system_instruction::create_account(
            payer.key,
            stake_info.key,
            lamports,
            STAKE_ACCOUNT_SPACE as u64,
            program_id,
        );
        invoke_signed(
            &ix,
            &[payer.clone(), stake_info.clone(), system_program.clone()],
            &[signer_seeds],
        )?;
        return Ok(());
    }

    require_keys_eq!(
        *stake_info.owner,
        *program_id,
        PoolError::InvalidStakeAccount
    );

    if stake_info.data_len() < STAKE_ACCOUNT_SPACE {
        let rent = Rent::get()?;
        let required_lamports = rent.minimum_balance(STAKE_ACCOUNT_SPACE);
        let current_lamports = stake_info.get_lamports();
        if required_lamports > current_lamports {
            let ix = system_instruction::transfer(
                payer.key,
                stake_info.key,
                required_lamports - current_lamports,
            );
            invoke(
                &ix,
                &[payer.clone(), stake_info.clone(), system_program.clone()],
            )?;
        }
        stake_info.resize(STAKE_ACCOUNT_SPACE)?;
    }

    Ok(())
}

pub fn save_stake_account(stake_info: &AccountInfo, stake: &StakeAccount) -> Result<()> {
    require_keys_eq!(*stake_info.owner, crate::ID, PoolError::InvalidStakeAccount);
    require!(
        stake_info.data_len() >= STAKE_ACCOUNT_SPACE,
        PoolError::InvalidStakeAccount
    );

    let mut data = stake_info.try_borrow_mut_data()?;
    let mut writer: &mut [u8] = &mut data;
    stake.try_serialize(&mut writer)?;
    Ok(())
}
