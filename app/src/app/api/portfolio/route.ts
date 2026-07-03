import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const RPC = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";

export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get("pubkey");

  if (!pubkey) {
    return NextResponse.json({ error: "pubkey required" }, { status: 400 });
  }

  try {
    const connection = new Connection(RPC, "confirmed");
    const publicKey = new PublicKey(pubkey);

    // SOL balance
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    // Token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      }
    );

    const tokens = tokenAccounts.value.map((ta) => {
      const info = ta.account.data.parsed.info;
      return {
        mint: info.mint,
        amount: Number(info.tokenAmount.uiAmount || 0),
        decimals: info.tokenAmount.decimals,
        rawAmount: info.tokenAmount.amount,
      };
    });

    // Get SOL price
    let solPrice = 150; // fallback
    try {
      const priceRes = await fetch(
        "https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112",
        { next: { revalidate: 10 } }
      );
      const priceData = await priceRes.json();
      solPrice = Number(
        priceData?.data?.So11111111111111111111111111111111111111112?.price ?? 150
      );
    } catch {}

    return NextResponse.json({
      pubkey,
      solBalance,
      solPrice,
      totalValueUsd: solBalance * solPrice,
      tokens,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}
