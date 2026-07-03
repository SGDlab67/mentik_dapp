"use client";

import { useEffect, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { shortenPubkey } from "@/lib/solana";
import { Spinner } from "@/components/ui/Spinner";

interface ParsedTx {
  signature: string;
  blockTime: number | null;
  fee: number;
  status: "success" | "failed";
}

export default function HistoryPage() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [transactions, setTransactions] = useState<ParsedTx[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const sigs = await connection.getSignaturesForAddress(publicKey, {
          limit: 20,
        });

        const txs: ParsedTx[] = sigs.map((s) => ({
          signature: s.signature,
          blockTime: s.blockTime,
          fee: 0,
          status: s.err ? "failed" : "success",
        }));

        setTransactions(txs);
      } catch (err) {
        console.error("History fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [publicKey, connection]);

  if (!publicKey) {
    return (
      <div className="py-32 text-center text-mentik-muted">
        Connect your wallet to view transaction history.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">
        Transaction History
      </h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl border border-mentik-border bg-mentik-card p-8 text-center text-sm text-mentik-muted">
          No transactions found. Make a deposit or send SOL to see history here.
        </div>
      ) : (
        <div className="rounded-xl border border-mentik-border bg-mentik-card divide-y divide-mentik-border">
          {transactions.map((tx) => (
            <div
              key={tx.signature}
              className="flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${
                    tx.status === "success"
                      ? "bg-mentik-green"
                      : "bg-mentik-red"
                  }`}
                />
                <div>
                  <a
                    href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-mentik-accent hover:underline"
                  >
                    {shortenPubkey(tx.signature, 8)}
                  </a>
                  <p className="text-xs text-mentik-muted">
                    {tx.blockTime
                      ? new Date(tx.blockTime * 1000).toLocaleString()
                      : "Pending"}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-medium ${
                  tx.status === "success"
                    ? "text-mentik-green"
                    : "text-mentik-red"
                }`}
              >
                {tx.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
