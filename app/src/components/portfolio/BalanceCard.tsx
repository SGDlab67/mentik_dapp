"use client";

import { formatUsd, lamportsToSol } from "@/lib/solana";

interface BalanceCardProps {
  label: string;
  value: string;
  subValue?: string;
  change?: number;
}

export function BalanceCard({ label, value, subValue, change }: BalanceCardProps) {
  return (
    <div className="rounded-xl border border-mentik-border bg-mentik-card p-5">
      <p className="text-sm text-mentik-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {subValue && (
          <span className="text-sm text-mentik-muted">{subValue}</span>
        )}
        {change !== undefined && (
          <span
            className={`text-sm font-medium ${
              change >= 0 ? "text-mentik-green" : "text-mentik-red"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
