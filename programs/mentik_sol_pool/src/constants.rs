use anchor_lang::prelude::*;

/// MENTIK token decimals.
pub const MENTIK_DECIMALS: u8 = 6;

/// 1_000 MENTIK per day with 6 decimals (1_000 * 10^6 base units).
pub const DAILY_EMISSION: u128 = 1_000_000_000;

pub const SECONDS_PER_DAY: u128 = 86_400;

/// Fixed-point precision for reward-per-lamport index.
pub const ACC_PRECISION: u128 = 1_000_000_000_000;

pub const GLOBAL_SEED: &[u8] = b"global";
pub const SOL_VAULT_SEED: &[u8] = b"sol_vault";
pub const MINT_AUTHORITY_SEED: &[u8] = b"mint_authority";
pub const MENTIK_MINT_SEED: &[u8] = b"mentik_mint";
pub const STAKE_SEED: &[u8] = b"stake";
