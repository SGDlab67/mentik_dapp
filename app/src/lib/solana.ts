import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { RPC_ENDPOINT, MENTIK_ROUTER_PROGRAM_ID } from "./constants";

export const connection = new Connection(RPC_ENDPOINT, "confirmed");

/**
 * Derive the protocol config PDA
 */
export function getConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("protocol-config")],
    MENTIK_ROUTER_PROGRAM_ID
  );
}

/**
 * Derive a user position PDA for a given strategy
 */
export function getPositionPda(
  userPubkey: PublicKey,
  strategy: number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("position"), userPubkey.toBuffer(), Buffer.from([strategy])],
    MENTIK_ROUTER_PROGRAM_ID
  );
}

/**
 * Derive the vault PDA for a given strategy
 */
export function getVaultPda(strategy: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), Buffer.from([strategy])],
    MENTIK_ROUTER_PROGRAM_ID
  );
}

/**
 * Format lamports to SOL with specified decimals
 */
export function lamportsToSol(lamports: number, decimals = 4): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(decimals);
}

/**
 * Format USD value
 */
export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Shorten a public key for display
 */
export function shortenPubkey(pubkey: string, chars = 4): string {
  return `${pubkey.slice(0, chars)}...${pubkey.slice(-chars)}`;
}
