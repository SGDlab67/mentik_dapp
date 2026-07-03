import { NextResponse } from "next/server";

// Token mint addresses
const TOKENS = {
  SOL: "So11111111111111111111111111111111111111112",
  MSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  JITOSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  BSOL: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
};

export async function GET() {
  try {
    const ids = Object.values(TOKENS).join(",");
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${ids}`, {
      next: { revalidate: 10 }, // Cache for 10 seconds
    });

    if (!res.ok) {
      throw new Error(`Jupiter API error: ${res.status}`);
    }

    const data = await res.json();

    const prices: Record<string, number> = {};
    for (const [symbol, mint] of Object.entries(TOKENS)) {
      prices[symbol] = Number(data?.data?.[mint]?.price ?? 0);
    }

    return NextResponse.json({
      prices,
      source: "jupiter",
      timestamp: Date.now(),
    });
  } catch (error) {
    // Fallback prices for devnet
    return NextResponse.json({
      prices: {
        SOL: 150,
        MSOL: 165,
        JITOSOL: 170,
        BSOL: 160,
      },
      source: "fallback",
      timestamp: Date.now(),
    });
  }
}
