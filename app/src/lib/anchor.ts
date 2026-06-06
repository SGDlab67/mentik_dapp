import { AnchorProvider, BN, Idl, Program } from "@anchor-lang/core";
import { Connection, PublicKey } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import idl from "@/idl/mentik_sol_pool.json";
import { PROGRAM_ID } from "./constants";

export function getProgram(connection: Connection, wallet: AnchorWallet): Program {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
    skipPreflight: false,
  });
  return new Program(idl as Idl, provider);
}

/** Read-only program for fetching accounts without a connected wallet. */
export function getReadOnlyProgram(connection: Connection): Program {
  return new Program(idl as Idl, { connection });
}

export async function isProgramDeployed(connection: Connection): Promise<boolean> {
  const info = await connection.getAccountInfo(PROGRAM_ID);
  return info?.executable === true;
}

export function parseAnchorError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("Simulation failed")) return msg;
    if (msg.includes("User rejected")) return "Transaction cancelled in wallet.";
    if (msg.includes("0x1770") || msg.includes("6000"))
      return "Nothing to claim yet — wait for rewards to accrue.";
    if (msg.includes("0x1771") || msg.includes("6001"))
      return "Insufficient staked SOL for this withdrawal.";
    if (msg.includes("0x1774") || msg.includes("6004"))
      return "Stake is locked — withdraw is blocked until the unlock time.";
    if (msg.includes("0x1775") || msg.includes("6005"))
      return "Invalid lock duration — choose Flexible, 7-day, or 30-day.";
    return msg;
  }
  return String(err);
}

/** Send via Anchor provider (simulate + sign + confirm). */
export async function sendRpc(build: () => Promise<string>): Promise<string> {
  return build();
}

export function formatMentik(amount: bigint | number): string {
  const raw = typeof amount === "bigint" ? amount : BigInt(Math.trunc(amount));
  const whole = raw / BigInt(10 ** 6);
  const frac = (raw % BigInt(10 ** 6)).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function parseMentikUi(input: string): BN {
  const [whole, frac = ""] = input.split(".");
  const padded = (frac + "000000").slice(0, 6);
  return new BN(`${whole}${padded}`);
}
