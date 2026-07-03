import { NextResponse } from "next/server";

// Strategy metadata — in production, pull APY/TVL from on-chain + APIs
const strategies = [
  {
    id: 0,
    name: "Marinade",
    symbol: "mSOL",
    protocol: "marinade.finance",
    description: "Liquid staking via Marinade Finance. Delegates across 100+ validators.",
    apy: 7.2,
    tvl: 1_200_000_000,
    risk: "low",
    mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    features: ["instant_unstake", "defi_composable", "validator_diversified"],
  },
  {
    id: 1,
    name: "Jito",
    symbol: "jitoSOL",
    protocol: "jito.network",
    description: "MEV-boosted liquid staking. Higher yield from MEV tips.",
    apy: 8.1,
    tvl: 2_800_000_000,
    risk: "low",
    mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    features: ["mev_rewards", "instant_unstake", "defi_composable"],
  },
  {
    id: 2,
    name: "Sanctum Infinity",
    symbol: "INF",
    protocol: "sanctum.so",
    description: "Multi-LST liquidity pool. Earns staking + trading fees.",
    apy: 9.4,
    tvl: 800_000_000,
    risk: "medium",
    mint: "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm",
    features: ["multi_lst", "trading_fees", "defi_composable"],
  },
  {
    id: 3,
    name: "BlazeStake",
    symbol: "bSOL",
    protocol: "stake.solblaze.org",
    description: "Decentralized liquid staking with validator diversity focus.",
    apy: 6.8,
    tvl: 450_000_000,
    risk: "low",
    mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    features: ["decentralized", "instant_unstake", "defi_composable"],
  },
  {
    id: 4,
    name: "Native Stake",
    symbol: "SOL",
    protocol: "solana",
    description: "Direct SOL staking to validators. 2-3 day unstake period.",
    apy: 6.5,
    tvl: 0,
    risk: "low",
    mint: "So11111111111111111111111111111111111111112",
    features: ["native", "validator_choice"],
  },
];

export async function GET() {
  return NextResponse.json({
    strategies,
    count: strategies.length,
    timestamp: Date.now(),
  });
}
