import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, GLOBAL_SEED, MENTIK_MINT_SEED, SOL_VAULT_SEED, STAKE_SEED } from "./constants";

export function globalStatePda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(GLOBAL_SEED)], PROGRAM_ID)[0];
}

export function solVaultPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(SOL_VAULT_SEED)], PROGRAM_ID)[0];
}

export function mentikMintPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(MENTIK_MINT_SEED)], PROGRAM_ID)[0];
}

export function stakeAccountPda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(STAKE_SEED), owner.toBuffer()],
    PROGRAM_ID
  )[0];
}
