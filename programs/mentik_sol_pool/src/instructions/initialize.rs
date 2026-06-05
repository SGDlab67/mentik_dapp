use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::constants::*;
use crate::state::GlobalState;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + GlobalState::INIT_SPACE,
        seeds = [GLOBAL_SEED],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    /// CHECK: SOL vault PDA; holds native lamports only.
    #[account(
        seeds = [SOL_VAULT_SEED],
        bump
    )]
    pub sol_vault: UncheckedAccount<'info>,

    #[account(
        seeds = [MINT_AUTHORITY_SEED],
        bump
    )]
    /// CHECK: PDA used as mint authority for MENTIK.
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        mint::decimals = MENTIK_DECIMALS,
        mint::authority = mint_authority,
        seeds = [MENTIK_MINT_SEED],
        bump
    )]
    pub mentik_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let global = &mut ctx.accounts.global_state;
    global.bump = ctx.bumps.global_state;
    global.authority = ctx.accounts.authority.key();
    global.mentik_mint = ctx.accounts.mentik_mint.key();
    global.reward_per_lamport = 0;
    global.last_update_timestamp = Clock::get()?.unix_timestamp;
    global.total_staked = 0;

    msg!("MENTIK SOL Pool initialized");
    Ok(())
}
