"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { MENTIK_ROUTER_PROGRAM_ID, STRATEGIES } from "@/lib/constants";
import { getConfigPda, getPositionPda, getVaultPda } from "@/lib/solana";
import * as anchor from "@coral-xyz/anchor";

export function useStrategies() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [processing, setProcessing] = useState(false);

  const deposit = useCallback(
    async (strategyId: number, solAmount: number) => {
      if (!publicKey || !sendTransaction) throw new Error("Wallet not connected");
      setProcessing(true);

      try {
        const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
        const [configPda] = getConfigPda();
        const [positionPda] = getPositionPda(publicKey, strategyId);
        const [vaultPda] = getVaultPda(strategyId);

        // For MVP/devnet: construct a simple SOL transfer to the vault PDA
        // In production, this would call the Anchor program's deposit instruction
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: vaultPda,
            lamports,
          })
        );

        const signature = await sendTransaction(tx, connection);
        await connection.confirmTransaction(signature, "confirmed");

        return signature;
      } finally {
        setProcessing(false);
      }
    },
    [publicKey, sendTransaction, connection]
  );

  const withdraw = useCallback(
    async (strategyId: number, solAmount: number) => {
      if (!publicKey || !sendTransaction) throw new Error("Wallet not connected");
      setProcessing(true);

      try {
        // In production, this calls the Anchor program's withdraw instruction
        // For devnet MVP, we simulate the withdrawal
        console.log(
          `Withdraw ${solAmount} SOL from strategy ${strategyId} — requires program interaction`
        );
        throw new Error(
          "Withdraw requires deployed program. Use `anchor test` for full flow."
        );
      } finally {
        setProcessing(false);
      }
    },
    [publicKey, sendTransaction, connection]
  );

  return {
    strategies: STRATEGIES,
    deposit,
    withdraw,
    processing,
  };
}
