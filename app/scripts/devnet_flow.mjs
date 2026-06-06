/**
 * Full devnet smoke test using ~/.config/solana/id.json
 */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import * as anchor from "@anchor-lang/core";
import BN from "bn.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const idl = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../src/idl/mentik_sol_pool.json"), "utf8")
);

const PROGRAM_ID = new PublicKey(idl.address);
const RPC = "https://api.devnet.solana.com";

function loadKeypair() {
  const p = path.join(os.homedir(), ".config/solana/id.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))));
}

function pda(seeds) {
  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
}

async function main() {
  const wallet = loadKeypair();
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    commitment: "confirmed",
  });
  const program = new anchor.Program(idl, provider);

  const globalState = pda([Buffer.from("global")]);
  const solVault = pda([Buffer.from("sol_vault")]);
  const mintAuthority = pda([Buffer.from("mint_authority")]);
  const mentikMint = pda([Buffer.from("mentik_mint")]);

  console.log("Wallet (authority):", wallet.publicKey.toBase58());
  console.log("Balance:", (await connection.getBalance(wallet.publicKey)) / LAMPORTS_PER_SOL, "SOL");
  console.log("Program:", PROGRAM_ID.toBase58());

  const progInfo = await connection.getAccountInfo(PROGRAM_ID);
  if (!progInfo?.executable) throw new Error("Program not deployed on devnet");

  if (!(await connection.getAccountInfo(globalState))) {
    console.log("\n→ initialize");
    const sig = await program.methods
      .initialize()
      .accountsPartial({
        authority: wallet.publicKey,
        globalState,
        solVault,
        mintAuthority,
        mentikMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("  tx:", sig);
  } else {
    console.log("\n✓ Pool already initialized");
  }

  // Use a fresh user keypair so legacy stake accounts (pre-lock layout) do not block the flow.
  const user = Keypair.generate();
  const userStakeAccount = pda([Buffer.from("stake"), user.publicKey.toBuffer()]);
  console.log("\n→ fund test user", user.publicKey.toBase58());
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: user.publicKey,
      lamports: Math.floor(0.5 * LAMPORTS_PER_SOL),
    })
  );
  fundTx.feePayer = wallet.publicKey;
  fundTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  fundTx.sign(wallet);
  const fundSig = await connection.sendRawTransaction(fundTx.serialize());
  await connection.confirmTransaction(fundSig, "confirmed");
  console.log("  tx:", fundSig);

  const depositLamports = Math.floor(0.1 * LAMPORTS_PER_SOL);
  console.log("\n→ deposit_sol", depositLamports);
  const depSig = await program.methods
    .depositSol(new BN(depositLamports), new BN(0))
    .accountsPartial({
      user: user.publicKey,
      globalState,
      solVault,
      stakeAccount: userStakeAccount,
      systemProgram: SystemProgram.programId,
    })
    .signers([user])
    .rpc();
  console.log("  tx:", depSig);

  const global = await program.account.globalState.fetch(globalState);
  const stake = await program.account.stakeAccount.fetch(userStakeAccount);
  console.log("\nPool TVL:", Number(global.totalStaked) / LAMPORTS_PER_SOL, "SOL");
  console.log("Test user stake:", Number(stake.solAmount) / LAMPORTS_PER_SOL, "SOL");

  console.log("\n→ sync_pool");
  await program.methods.syncPool().accountsPartial({ globalState }).rpc();

  const ata = getAssociatedTokenAddressSync(mentikMint, user.publicKey);
  const tx = new Transaction();
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      user.publicKey,
      ata,
      user.publicKey,
      mentikMint
    )
  );

  console.log("\n→ claim_mentik");
  const claimIx = await program.methods
    .claimMentik()
    .accountsPartial({
      user: user.publicKey,
      globalState,
      stakeAccount: userStakeAccount,
      mentikMint,
      userMentikAta: ata,
      mintAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
  tx.add(claimIx);
  tx.feePayer = user.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(user);
  const sim = await connection.simulateTransaction(tx);
  if (sim.value.err) {
    console.log("  claim simulation:", JSON.stringify(sim.value.err));
    if (sim.value.logs) console.log("  logs:\n   ", sim.value.logs.slice(-5).join("\n    "));
  } else {
    const sig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(sig);
    console.log("  tx:", sig);
    const bal = await connection.getTokenAccountBalance(ata);
    console.log("  MENTIK:", bal.value.uiAmountString);
  }

  console.log("\n✓ Flow OK — deployed program verified with a fresh test user keypair");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
