"use client";

import { BN } from "@anchor-lang/core";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ACC_PRECISION,
  DAILY_EMISSION_MENTIK,
  LAMPORTS_PER_SOL as LPS,
  MENTIK_DECIMALS,
  PROGRAM_ID,
} from "@/lib/constants";
import {
  formatMentik,
  getProgram,
  getReadOnlyProgram,
  isProgramDeployed,
  parseAnchorError,
} from "@/lib/anchor";
import { globalStatePda, mentikMintPda, solVaultPda, stakeAccountPda } from "@/lib/pdas";
import { MeshBackground } from "./MeshBackground";

type GlobalState = {
  totalStaked: BN;
  rewardPerLamport: BN;
  lastUpdateTimestamp: BN;
};

type StakeState = {
  solAmount: BN;
  rewardDebt: BN;
  pendingRewards: BN;
};

function SolLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 16.5L7.5 18l10-5.5L14 11 4 16.5zM4 12l3.5 1.5L17.5 8 14 6.5 4 12zM4 7.5L7.5 9 17.5 3.5 14 2 4 7.5z"
        fill="white"
      />
    </svg>
  );
}

export function PoolDashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const [global, setGlobal] = useState<GlobalState | null>(null);
  const [stake, setStake] = useState<StakeState | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [programLive, setProgramLive] = useState<boolean | null>(null);
  const [depositSol, setDepositSol] = useState("0.1");
  const [withdrawSol, setWithdrawSol] = useState("0.05");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isProgramDeployed(connection).then(setProgramLive);
  }, [connection]);

  const refresh = useCallback(async () => {
    const globalPk = globalStatePda();
    const info = await connection.getAccountInfo(globalPk);
    if (!info) {
      setInitialized(false);
      setGlobal(null);
      setStake(null);
      return;
    }
    setInitialized(true);
    const readProgram = getReadOnlyProgram(connection);
    const g = (await (readProgram.account as any).globalState.fetch(globalPk)) as {
      totalStaked: BN;
      rewardPerLamport: BN;
      lastUpdateTimestamp: BN;
    };
    setGlobal({
      totalStaked: g.totalStaked,
      rewardPerLamport: g.rewardPerLamport,
      lastUpdateTimestamp: g.lastUpdateTimestamp,
    });

    if (!wallet.publicKey) {
      setStake(null);
      return;
    }

    try {
      const s = (await (readProgram.account as any).stakeAccount.fetch(
        stakeAccountPda(wallet.publicKey)
      )) as {
        solAmount: BN;
        rewardDebt: BN;
        pendingRewards: BN;
      };
      setStake({
        solAmount: s.solAmount,
        rewardDebt: s.rewardDebt,
        pendingRewards: s.pendingRewards,
      });
    } catch {
      setStake(null);
    }
  }, [connection, wallet.publicKey]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 12_000);
    return () => clearInterval(id);
  }, [refresh]);

  const pendingMentik = useMemo(() => {
    if (!global || !stake || stake.solAmount.isZero()) return 0n;
    const accumulated =
      (BigInt(stake.solAmount.toString()) * BigInt(global.rewardPerLamport.toString())) /
        ACC_PRECISION -
      BigInt(stake.rewardDebt.toString());
    return accumulated + BigInt(stake.pendingRewards.toString());
  }, [global, stake]);

  const userSharePct = useMemo(() => {
    if (!global || !stake || global.totalStaked.isZero()) return 0;
    return (Number(stake.solAmount.toString()) / Number(global.totalStaked.toString())) * 100;
  }, [global, stake]);

  const userDailyMentik = useMemo(() => {
    if (!global || !stake || global.totalStaked.isZero()) return 0;
    return (
      (DAILY_EMISSION_MENTIK * Number(stake.solAmount.toString())) /
      Number(global.totalStaked.toString())
    );
  }, [global, stake]);

  const runRpc = async (label: string, build: () => Promise<string>) => {
    if (!wallet.publicKey || !anchorWallet) {
      setStatus("Connect a wallet first (must be on devnet).");
      return;
    }
    if (programLive === false) {
      setStatus("Program not deployed on devnet. Run: anchor deploy --provider.cluster devnet");
      return;
    }
    setBusy(true);
    setStatus(`${label}…`);
    try {
      const sig = await build();
      setStatus(
        `✓ ${label} — ${sig.slice(0, 8)}… · explorer.solana.com/tx/${sig}?cluster=devnet`
      );
      await refresh();
    } catch (e) {
      setStatus(parseAnchorError(e));
    } finally {
      setBusy(false);
    }
  };

  const programForTx = () => {
    if (!anchorWallet) throw new Error("Wallet not connected");
    return getProgram(connection, anchorWallet);
  };

  const initializePool = () =>
    runRpc("Initialize pool", async () => {
      const program = programForTx();
      return program.methods
        .initialize()
        .accountsPartial({
          authority: wallet.publicKey!,
          globalState: globalStatePda(),
          solVault: solVaultPda(),
          mintAuthority: PublicKey.findProgramAddressSync(
            [Buffer.from("mint_authority")],
            program.programId
          )[0],
          mentikMint: mentikMintPda(),
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

  const deposit = () =>
    runRpc("Deposit SOL", async () => {
      const lamports = Math.floor(parseFloat(depositSol) * LPS);
      if (!Number.isFinite(lamports) || lamports <= 0) throw new Error("Invalid deposit amount");
      const program = programForTx();
      return program.methods
        .depositSol(new BN(lamports))
        .accountsPartial({
          user: wallet.publicKey!,
          globalState: globalStatePda(),
          solVault: solVaultPda(),
          stakeAccount: stakeAccountPda(wallet.publicKey!),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

  const withdraw = () =>
    runRpc("Withdraw SOL", async () => {
      const lamports = Math.floor(parseFloat(withdrawSol) * LPS);
      if (!Number.isFinite(lamports) || lamports <= 0) throw new Error("Invalid withdraw amount");
      const program = programForTx();
      return program.methods
        .withdrawSol(new BN(lamports))
        .accountsPartial({
          user: wallet.publicKey!,
          globalState: globalStatePda(),
          solVault: solVaultPda(),
          stakeAccount: stakeAccountPda(wallet.publicKey!),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    });

  const claim = () =>
    runRpc("Claim MENTIK", async () => {
      const mint = mentikMintPda();
      const ata = getAssociatedTokenAddressSync(mint, wallet.publicKey!);
      const program = programForTx();
      const createAta = createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey!,
        ata,
        wallet.publicKey!,
        mint
      );
      return program.methods
        .claimMentik()
        .accountsPartial({
          user: wallet.publicKey!,
          globalState: globalStatePda(),
          stakeAccount: stakeAccountPda(wallet.publicKey!),
          mentikMint: mint,
          userMentikAta: ata,
          mintAuthority: PublicKey.findProgramAddressSync(
            [Buffer.from("mint_authority")],
            program.programId
          )[0],
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions([createAta])
        .rpc();
    });

  const sync = () =>
    runRpc("Sync pool", async () => {
      const program = programForTx();
      return program.methods.syncPool().accountsPartial({ globalState: globalStatePda() }).rpc();
    });

  const tvlSol = global ? Number(global.totalStaked.toString()) / LAMPORTS_PER_SOL : 0;
  const stakedSol = stake ? Number(stake.solAmount.toString()) / LAMPORTS_PER_SOL : 0;
  const perSolDay =
    tvlSol > 0 ? (DAILY_EMISSION_MENTIK / tvlSol).toFixed(1) : DAILY_EMISSION_MENTIK.toFixed(0);

  return (
    <>
      <MeshBackground />
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <div className="brand-mark">
              <SolLogo />
            </div>
            <div>
              <h1>MENTIK Pool</h1>
              <p>{PROGRAM_ID.toBase58().slice(0, 4)}…{PROGRAM_ID.toBase58().slice(-4)}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span className="cluster-badge">Devnet</span>
            {programLive === false && (
              <span className="cluster-badge" style={{ borderColor: "#f87171", color: "#f87171" }}>
                Program offline
              </span>
            )}
            {wallet.publicKey && (
              <span className="wallet-chip">{wallet.publicKey.toBase58().slice(0, 4)}…</span>
            )}
            <WalletMultiButton />
          </div>
        </nav>

        {programLive === false && (
          <p className="status-toast" style={{ marginBottom: "1rem" }}>
            Program not found on devnet. Deploy with: anchor deploy --provider.cluster devnet
          </p>
        )}

        <section className="hero">
          <h2>Stake SOL. Earn MENTIK.</h2>
          <p>
            Fixed daily emission shared across all stakers. Your slice grows with your SOL
            deposit — dilution is transparent, on-chain, and fair.
          </p>
          <div className="hero-emission">
            <strong>{DAILY_EMISSION_MENTIK.toLocaleString()}</strong>
            <span>MENTIK / day · pool-wide</span>
          </div>
        </section>

        <section className="stat-strip">
          <div className="stat-pill">
            <span>Pool TVL</span>
            <strong>{tvlSol.toFixed(3)} SOL</strong>
          </div>
          <div className="stat-pill">
            <span>Your stake</span>
            <strong className="accent">{stakedSol.toFixed(3)} SOL</strong>
          </div>
          <div className="stat-pill">
            <span>Pending rewards</span>
            <strong className="accent">{formatMentik(pendingMentik)}</strong>
          </div>
          <div className="stat-pill">
            <span>Per 1 SOL / day</span>
            <strong>{perSolDay} MENTIK</strong>
          </div>
        </section>

        <section className="grid">
          <article className="card">
            <div className="card-header">
              <h3>
                <span className="card-icon">◎</span>
                Global pool
              </h3>
              {initialized ? (
                <span className="live-dot">Live</span>
              ) : (
                <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Offline</span>
              )}
            </div>
            <dl className="metric-list">
              <div className="metric">
                <dt>Status</dt>
                <dd>{initialized ? "Accepting deposits" : "Awaiting init"}</dd>
              </div>
              <div className="metric">
                <dt>Total staked</dt>
                <dd>{tvlSol.toFixed(4)} SOL</dd>
              </div>
              <div className="metric">
                <dt>Daily emission</dt>
                <dd>{DAILY_EMISSION_MENTIK.toLocaleString()} MENTIK</dd>
              </div>
              <div className="metric">
                <dt>Rate per SOL</dt>
                <dd>{perSolDay} MENTIK/day</dd>
              </div>
            </dl>
            {!initialized ? (
              <button
                className="btn-primary"
                style={{ width: "100%" }}
                disabled={busy || !anchorWallet}
                onClick={initializePool}
              >
                Initialize pool
              </button>
            ) : (
              <button className="btn-ghost" disabled={busy} onClick={sync}>
                ↻ Sync reward index
              </button>
            )}
          </article>

          <article className="card">
            <div className="card-header">
              <h3>
                <span className="card-icon card-icon--green">◈</span>
                Your position
              </h3>
            </div>

            <div className="share-visual">
              <div
                className="share-ring"
                style={{ "--pct": Math.min(userSharePct, 100) } as React.CSSProperties}
              >
                <div className="share-ring-inner">{userSharePct.toFixed(1)}%</div>
              </div>
              <div className="share-copy">
                <strong>{userDailyMentik.toFixed(2)} MENTIK / day</strong>
                <span>Based on {stakedSol.toFixed(4)} SOL staked</span>
              </div>
            </div>

            <dl className="metric-list">
              <div className="metric">
                <dt>Pool share</dt>
                <dd>{userSharePct.toFixed(2)}%</dd>
              </div>
              <div className="metric">
                <dt>Claimable</dt>
                <dd>
                  {formatMentik(pendingMentik)} MENTIK
                  <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                    {" "}
                    · {MENTIK_DECIMALS} dec
                  </span>
                </dd>
              </div>
            </dl>
            <button
              className="btn-primary"
              style={{ width: "100%" }}
              disabled={busy || !anchorWallet || !initialized}
              onClick={claim}
            >
              Claim MENTIK
            </button>
          </article>
        </section>

        <section className="card actions-card">
          <div className="card-header">
            <h3>
              <span className="card-icon">⇄</span>
              Manage stake
            </h3>
          </div>
          <div className="action-row">
            <label>
              Deposit amount
              <div className="input-wrap">
                <input
                  value={depositSol}
                  onChange={(e) => setDepositSol(e.target.value)}
                  inputMode="decimal"
                />
                <span className="suffix">SOL</span>
              </div>
            </label>
            <button
              className="btn-primary"
              disabled={busy || !anchorWallet || !initialized}
              onClick={deposit}
            >
              Deposit
            </button>
          </div>
          <div className="action-row">
            <label>
              Withdraw amount
              <div className="input-wrap">
                <input
                  value={withdrawSol}
                  onChange={(e) => setWithdrawSol(e.target.value)}
                  inputMode="decimal"
                />
                <span className="suffix">SOL</span>
              </div>
            </label>
            <button
              className="btn-secondary"
              disabled={busy || !anchorWallet || !initialized}
              onClick={withdraw}
            >
              Withdraw
            </button>
          </div>
        </section>

        {status && <p className="status-toast">{status}</p>}

        <footer className="footer">
          <p>
            Simulated before every signature · Solana devnet only · Fixed emission cap — no
            guaranteed USD value
          </p>
        </footer>
      </div>
    </>
  );
}
