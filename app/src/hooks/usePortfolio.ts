"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { PortfolioSummary, UserPosition } from "@/lib/types";
import { getPositionPda } from "@/lib/solana";
import { STRATEGIES } from "@/lib/constants";

export function usePortfolio() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      setPortfolio(null);
      return;
    }

    const fetchPortfolio = async () => {
      setLoading(true);
      try {
        // Get SOL balance
        const balance = await connection.getBalance(publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;

        // Fetch SOL price from Jupiter (devnet: use mock price)
        let solPrice = 150; // Mock for devnet
        try {
          const priceRes = await fetch(
            "https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112"
          );
          const priceData = await priceRes.json();
          if (priceData?.data?.So11111111111111111111111111111111111111112?.price) {
            solPrice = Number(
              priceData.data.So11111111111111111111111111111111111111112.price
            );
          }
        } catch {
          // Use mock price on devnet
        }

        // Fetch token accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: new (await import("@solana/web3.js")).PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
        );

        const tokens = tokenAccounts.value.map((ta) => {
          const info = ta.account.data.parsed.info;
          return {
            mint: info.mint,
            symbol: "SPL",
            name: "SPL Token",
            amount: Number(info.tokenAmount.uiAmount || 0),
            decimals: info.tokenAmount.decimals,
            usdValue: 0, // Resolved via price API in production
          };
        });

        // Fetch user positions from on-chain
        const positions: UserPosition[] = [];
        for (const strategy of STRATEGIES) {
          try {
            const [positionPda] = getPositionPda(publicKey, strategy.id);
            const accountInfo = await connection.getAccountInfo(positionPda);
            if (accountInfo) {
              // Parse position data (simplified — use Anchor IDL deserializer in production)
              positions.push({
                strategy: strategy.id,
                depositedAmount: 0, // Would parse from account data
                lstReceived: 0,
                depositTimestamp: 0,
                lastUpdated: 0,
              });
            }
          } catch {
            // Position doesn't exist for this strategy
          }
        }

        const totalValueUsd = solBalance * solPrice;

        setPortfolio({
          totalValueUsd,
          solBalance,
          solPrice,
          tokens,
          positions,
          change24h: 0,
        });
      } catch (err) {
        console.error("Portfolio fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPortfolio, 30_000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

  return { portfolio, loading };
}
