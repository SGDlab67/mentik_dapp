"use client";

import { STRATEGIES } from "@/lib/constants";
import { StrategyCard } from "@/components/yield/StrategyCard";
import { DepositModal } from "@/components/yield/DepositModal";
import { Navbar } from "@/components/ui/Navbar";

export default function YieldPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Yield Strategies</h1>
            <p className="mt-1 text-sm text-mentik-muted">
              Deploy SOL into liquid staking protocols. Earn yield while keeping
              liquidity.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STRATEGIES.map((strategy) => (
              <StrategyCard key={strategy.id} strategy={strategy} />
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-mentik-border bg-mentik-card p-5">
            <h3 className="text-sm font-medium text-white mb-2">
              How it works
            </h3>
            <div className="space-y-2 text-sm text-mentik-muted">
              <p>
                1. Select a strategy and enter the amount of SOL to deposit.
              </p>
              <p>
                2. A 0.1% fee is deducted. The remainder is routed to the
                protocol&apos;s stake pool.
              </p>
              <p>
                3. You receive liquid staking tokens (LSTs) representing your
                position.
              </p>
              <p>
                4. LSTs accrue staking rewards automatically. Withdraw anytime back
                to SOL.
              </p>
            </div>
          </div>
        </div>
        <DepositModal />
      </main>
    </>
  );
}
