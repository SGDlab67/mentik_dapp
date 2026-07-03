"use client";

import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { usePortfolio } from "@/hooks/usePortfolio";
import { formatUsd, shortenPubkey } from "@/lib/solana";
import { usePrices } from "@/hooks/usePrices";
import { Spinner } from "@/components/ui/Spinner";
import { Navbar } from "@/components/ui/Navbar";

export default function WalletPage() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { portfolio, loading } = usePortfolio();
  const { prices } = usePrices();

  const [recipient, setRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [txResult, setTxResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!publicKey) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="py-32 text-center text-mentik-muted">
            Connect your wallet to access send/receive features.
          </div>
        </main>
      </>
    );
  }

  const handleSend = async () => {
    if (!publicKey || !sendTransaction) return;
    setError(null);
    setTxResult(null);
    setSending(true);

    try {
      const toPubkey = new PublicKey(recipient);
      const lamports = Math.floor(parseFloat(sendAmount) * LAMPORTS_PER_SOL);

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey,
          lamports,
        })
      );

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxResult(sig);
      setRecipient("");
      setSendAmount("");
    } catch (err: any) {
      setError(err.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Wallet</h1>

      {/* Receive */}
      <div className="rounded-xl border border-mentik-border bg-mentik-card p-5">
        <h3 className="text-sm font-medium text-white mb-3">Receive</h3>
        <div className="flex items-center gap-2 rounded-lg bg-mentik-bg px-4 py-3">
          <span className="text-sm font-mono text-mentik-text break-all flex-1">
            {publicKey.toBase58()}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(publicKey.toBase58())}
            className="shrink-0 text-xs text-mentik-accent hover:underline"
          >
            Copy
          </button>
        </div>
        <p className="mt-2 text-xs text-mentik-muted">
          On devnet — request an airdrop at{" "}
          <a
            href="https://faucet.solana.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-mentik-accent hover:underline"
          >
            faucet.solana.com
          </a>
        </p>
      </div>

      {/* Send */}
      <div className="rounded-xl border border-mentik-border bg-mentik-card p-5">
        <h3 className="text-sm font-medium text-white mb-3">Send SOL</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient address"
            className="w-full rounded-lg bg-mentik-bg border border-mentik-border px-4 py-3 text-sm text-white placeholder:text-mentik-muted/50 outline-none focus:border-mentik-accent"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              placeholder="0.0"
              min="0"
              step="0.01"
              className="flex-1 rounded-lg bg-mentik-bg border border-mentik-border px-4 py-3 text-sm text-white placeholder:text-mentik-muted/50 outline-none focus:border-mentik-accent"
            />
            <button
              onClick={handleSend}
              disabled={!recipient || !sendAmount || sending}
              className="rounded-lg bg-mentik-accent px-6 py-3 text-sm font-medium text-white hover:bg-mentik-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? <Spinner size="sm" /> : "Send"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-mentik-red/10 p-3 text-sm text-mentik-red">
            {error}
          </div>
        )}
        {txResult && (
          <div className="mt-3 rounded-lg bg-mentik-green/10 p-3">
            <p className="text-sm text-mentik-green mb-1">Sent!</p>
            <a
              href={`https://explorer.solana.com/tx/${txResult}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-mentik-accent hover:underline font-mono break-all"
            >
              {txResult}
            </a>
          </div>
        )}
      </div>
    </div>
      </main>
    </>
  );
}
