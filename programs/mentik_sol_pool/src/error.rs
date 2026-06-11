use anchor_lang::prelude::*;

#[error_code]
pub enum PoolError {
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Withdraw amount exceeds staked balance")]
    InsufficientStake,
    #[msg("Deposit amount must be greater than zero")]
    ZeroDeposit,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Stake is locked until unlock time")]
    StakeLocked,
    #[msg("Invalid lock duration")]
    InvalidLockDuration,
    #[msg("Invalid stake account layout")]
    InvalidStakeAccountLayout,
}
