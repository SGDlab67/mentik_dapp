import { PublicKey } from "@solana/web3.js";
import type { Strategy } from "./types";

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
export const STAKE_SEED = "stake";
export const LOCK_NONE = 0;
export const LOCK_7_DAYS = 604_800;
export const LOCK_30_DAYS = 2_592_000;

export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.devnet.solana.com";

// The yield-router UI below is a devnet-only prototype: there is no separate
// "router" program deployed, so PDA derivation reuses the real deployed
// mentik_sol_pool program id as its address namespace.
export const MENTIK_ROUTER_PROGRAM_ID = PROGRAM_ID;

export const FEE_BPS = 10; // 0.1%

export const STRATEGIES: Strategy[] = [
  {
    id: 0,
    name: "Marinade",
    symbol: "mSOL",
    description: "Liquid staking via Marinade Finance. Delegates across 100+ validators.",
    apy: 7.2,
    tvl: 1_200_000_000,
    risk: "low",
    color: "#8752F3",
  },
  {
    id: 1,
    name: "Jito",
    symbol: "jitoSOL",
    description: "MEV-boosted liquid staking. Higher yield from MEV tips.",
    apy: 8.1,
    tvl: 2_800_000_000,
    risk: "low",
    color: "#00D18C",
  },
  {
    id: 2,
    name: "Sanctum Infinity",
    symbol: "INF",
    description: "Multi-LST liquidity pool. Earns staking + trading fees.",
    apy: 9.4,
    tvl: 800_000_000,
    risk: "medium",
    color: "#00C2FF",
  },
  {
    id: 3,
    name: "BlazeStake",
    symbol: "bSOL",
    description: "Decentralized liquid staking with validator diversity focus.",
    apy: 6.8,
    tvl: 450_000_000,
    risk: "low",
    color: "#FF6B35",
  },
  {
    id: 4,
    name: "Native Stake",
    symbol: "SOL",
    description: "Direct SOL staking to validators. 2-3 day unstake period.",
    apy: 6.5,
    tvl: 0,
    risk: "low",
    color: "#9945FF",
  },
];
