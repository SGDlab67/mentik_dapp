"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { usePrices } from "@/hooks/usePrices";
import { BalanceCard } from "./BalanceCard";
import { formatUsd } from "@/lib/solana";
import { Spinner } from "@/components/ui/Spinner";

export function Dashboard() {
  const { publicKey } = useWallet();
  const { portfolio, loading } = usePortfolio();
  const { prices } = usePrices();

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="h-16 w-16 rounded-2xl bg-mentik-accent/10 flex items-center justify-center mb-6">
          <span className="text-3xl">M</span>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Welcome to Mentik
        </h2>
        <p className="text-mentik-muted max-w-md">
          Connect your wallet to view your portfolio, track DeFi positions, and
          deploy capital into yield strategies on Solana.
        </p>
      </div>
    );
  }

  if (loading && !portfolio) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard
          label="Total Value"
          value={formatUsd(portfolio?.totalValueUsd ?? 0)}
          change={portfolio?.change24h}
        />
        <BalanceCard
          label="SOL Balance"
          value={`${portfolio?.solBalance.toFixed(4) ?? "0"} SOL`}
          subValue={formatUsd((portfolio?.solBalance ?? 0) * prices.sol)}
        />
        <BalanceCard
          label="Active Positions"
          value={String(portfolio?.positions.length ?? 0)}
          subValue="across strategies"
        />
        <BalanceCard
          label="SOL Price"
          value={formatUsd(prices.sol)}
          change={0}
        />
      </div>

      {/* Token list */}
      <div className="rounded-xl border border-mentik-border bg-mentik-card">
        <div className="border-b border-mentik-border px-5 py-4">
          <h3 className="text-sm font-medium text-white">Token Balances</h3>
        </div>
        <div className="divide-y divide-mentik-border">
          {/* SOL row */}
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center text-xs font-bold text-white">
                S
              </div>
              <div>
                <p className="text-sm font-medium text-white">Solana</p>
                <p className="text-xs text-mentik-muted">SOL</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">
                {portfolio?.solBalance.toFixed(4)}
              </p>
              <p className="text-xs text-mentik-muted">
                {formatUsd((portfolio?.solBalance ?? 0) * prices.sol)}
              </p>
            </div>
          </div>

          {/* SPL tokens */}
          {portfolio?.tokens
            .filter((t) => t.amount > 0)
            .map((token) => (
              <div
                key={token.mint}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-mentik-border flex items-center justify-center text-xs font-medium text-mentik-muted">
                    ?
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {token.name}
                    </p>
                    <p className="text-xs text-mentik-muted font-mono">
                      {token.mint.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {token.amount.toFixed(token.decimals > 4 ? 4 : token.decimals)}
                  </p>
                </div>
              </div>
            ))}

          {portfolio?.tokens.filter((t) => t.amount > 0).length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-mentik-muted">
              No SPL tokens found. Airdrop some on devnet to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
