import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "56zRQzpWpV8VKDpnVQGjvtpyZb9NzS3ox8UJp97taRX1"
);

export const DAILY_EMISSION_MENTIK = 1_000;
export const MENTIK_DECIMALS = 6;
export const ACC_PRECISION = 1_000_000_000_000n;
export const LAMPORTS_PER_SOL = 1_000_000_000;

export const GLOBAL_SEED = "global";
export const SOL_VAULT_SEED = "sol_vault";
export const MENTIK_MINT_SEED = "mentik_mint";
export const LOCK_NONE = 0;
export const LOCK_7_DAYS = 604_800;
export const LOCK_30_DAYS = 2_592_000;
