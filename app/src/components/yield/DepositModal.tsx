"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAppStore } from "@/stores/appStore";
import { useStrategies } from "@/hooks/useStrategies";
import { usePortfolio } from "@/hooks/usePortfolio";
import { STRATEGIES, FEE_BPS } from "@/lib/constants";
import { Spinner } from "@/components/ui/Spinner";

export function DepositModal() {
  const { publicKey } = useWallet();
  const { depositModalOpen, selectedStrategy, closeDepositModal } = useAppStore();
  const { deposit, processing } = useStrategies();
  const { portfolio } = usePortfolio();
  const [amount, setAmount] = useState("");
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!depositModalOpen || selectedStrategy === null) return null;

  const strategy = STRATEGIES.find((s) => s.id === selectedStrategy);
  if (!strategy) return null;

  const solAmount = parseFloat(amount) || 0;
  const fee = solAmount * (FEE_BPS / 10_000);
  const netDeposit = solAmount - fee;
  const maxBalance = portfolio?.solBalance ?? 0;

  const handleDeposit = async () => {
    if (!publicKey || solAmount <= 0) return;
    setError(null);
    setTxSig(null);

    try {
      const sig = await deposit(strategy.id, solAmount);
      setTxSig(sig);
      setAmount("");
    } catch (err: any) {
      setError(err.message || "Transaction failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-mentik-border bg-mentik-bg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            Deposit into {strategy.name}
          </h2>
          <button
            onClick={closeDepositModal}
            className="text-mentik-muted hover:text-white text-xl"
          >
            &times;
          </button>
        </div>

        {/* Amount input */}
        <div className="rounded-xl border border-mentik-border bg-mentik-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-mentik-muted">Amount</span>
            <button
              onClick={() => setAmount(String(Math.max(0, maxBalance - 0.01)))}
              className="text-xs text-mentik-accent hover:underline"
            >
              Max: {maxBalance.toFixed(4)} SOL
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              min="0"
              step="0.01"
              className="w-full bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-mentik-muted/50"
            />
            <span className="text-sm font-medium text-mentik-muted">SOL</span>
          </div>
        </div>

        {/* Breakdown */}
        {solAmount > 0 && (
          <div className="mt-4 space-y-2 rounded-xl border border-mentik-border bg-mentik-card p-4">
            <div className="flex justify-between text-sm">
              <span className="text-mentik-muted">Strategy</span>
              <span className="text-white">{strategy.name} ({strategy.symbol})</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-mentik-muted">APY</span>
              <span className="text-mentik-green">{strategy.apy}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-mentik-muted">Fee ({FEE_BPS / 100}%)</span>
              <span className="text-white">{fee.toFixed(6)} SOL</span>
            </div>
            <div className="border-t border-mentik-border pt-2 flex justify-between text-sm font-medium">
              <span className="text-mentik-muted">Net deposit</span>
              <span className="text-white">{netDeposit.toFixed(6)} SOL</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-mentik-red/10 p-3 text-sm text-mentik-red">
            {error}
          </div>
        )}

        {/* Success */}
        {txSig && (
          <div className="mt-4 rounded-lg bg-mentik-green/10 p-3">
            <p className="text-sm text-mentik-green mb-1">Deposit confirmed!</p>
            <a
              href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-mentik-accent hover:underline font-mono break-all"
            >
              {txSig}
            </a>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleDeposit}
          disabled={!publicKey || solAmount <= 0 || processing}
          className="mt-6 w-full rounded-lg bg-mentik-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-mentik-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Spinner size="sm" /> Processing...
            </>
          ) : !publicKey ? (
            "Connect Wallet"
          ) : (
            `Deposit ${solAmount > 0 ? solAmount.toFixed(4) : ""} SOL`
          )}
        </button>
      </div>
    </div>
  );
}
