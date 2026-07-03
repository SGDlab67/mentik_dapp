"use client";

import type { Strategy } from "@/lib/types";
import { useAppStore } from "@/stores/appStore";

export function StrategyCard({ strategy }: { strategy: Strategy }) {
  const openDepositModal = useAppStore((s) => s.openDepositModal);

  const riskColors = {
    low: "text-mentik-green bg-mentik-green/10",
    medium: "text-yellow-400 bg-yellow-400/10",
    high: "text-mentik-red bg-mentik-red/10",
  };

  return (
    <div className="rounded-xl border border-mentik-border bg-mentik-card p-5 transition-colors hover:border-mentik-accent/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: strategy.color + "33" }}
          >
            {strategy.symbol.slice(0, 2)}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {strategy.name}
            </h3>
            <p className="text-xs text-mentik-muted">{strategy.symbol}</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${riskColors[strategy.risk]}`}
        >
          {strategy.risk}
        </span>
      </div>

      <p className="mt-3 text-xs text-mentik-muted">{strategy.description}</p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-mentik-muted">APY</p>
          <p className="text-lg font-semibold text-mentik-green">
            {strategy.apy}%
          </p>
        </div>
        <div>
          <p className="text-xs text-mentik-muted">TVL</p>
          <p className="text-sm font-medium text-white">
            {strategy.tvl > 0
              ? `$${(strategy.tvl / 1_000_000).toFixed(1)}M`
              : "—"}
          </p>
        </div>
      </div>

      <button
        onClick={() => openDepositModal(strategy.id)}
        className="mt-4 w-full rounded-lg bg-mentik-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-mentik-accent-hover"
      >
        Deposit SOL
      </button>
    </div>
  );
}
