/**
 * Full devnet smoke test using ~/.config/solana/id.json
 * Usage: node scripts/devnet_flow.mjs
 */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import anchor from "@coral-xyz/anchor";
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
  fs.readFileSync(path.join(__dirname, "../target/idl/mentik_sol_pool.json"), "utf8")
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
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);

  const globalState = pda([Buffer.from("global")]);
  const solVault = pda([Buffer.from("sol_vault")]);
  const mintAuthority = pda([Buffer.from("mint_authority")]);
  const mentikMint = pda([Buffer.from("mentik_mint")]);
  const stakeAccount = pda([Buffer.from("stake"), wallet.publicKey.toBuffer()]);

  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Balance:", (await connection.getBalance(wallet.publicKey)) / LAMPORTS_PER_SOL, "SOL");

  const globalInfo = await connection.getAccountInfo(globalState);
  if (!globalInfo) {
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

  const stakeInfo = await connection.getAccountInfo(stakeAccount);
  const depositLamports = Math.floor(0.1 * LAMPORTS_PER_SOL);

  console.log("\n→ deposit_sol", depositLamports, "lamports");
  const depSig = await program.methods
    .depositSol(new anchor.BN(depositLamports))
    .accountsPartial({
      user: wallet.publicKey,
      globalState,
      solVault,
      stakeAccount,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("  tx:", depSig);

  const global = await program.account.globalState.fetch(globalState);
  const stake = await program.account.stakeAccount.fetch(stakeAccount);
  console.log("\nPool TVL:", global.totalStaked.toString(), "lamports");
  console.log("Your stake:", stake.solAmount.toString(), "lamports");

  console.log("\n→ sync_pool");
  await program.methods.syncPool().accountsPartial({ globalState }).rpc();

  const ata = getAssociatedTokenAddressSync(mentikMint, wallet.publicKey);
  const ataInfo = await connection.getAccountInfo(ata);
  const tx = new Transaction();
  if (!ataInfo) {
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        ata,
        wallet.publicKey,
        mentikMint
      )
    );
  }

  console.log("\n→ claim_mentik (may be 0 if no time elapsed)");
  try {
    const claimIx = await program.methods
      .claimMentik()
      .accountsPartial({
        user: wallet.publicKey,
        globalState,
        stakeAccount,
        mentikMint,
        userMentikAta: ata,
        mintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    tx.add(claimIx);
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(wallet);
    const sim = await connection.simulateTransaction(tx);
    if (sim.value.err) {
      console.log("  claim simulation (expected if no rewards yet):", JSON.stringify(sim.value.err));
      console.log("  logs:", sim.value.logs?.slice(-4).join("\n    "));
    } else {
      const sig = await connection.sendRawTransaction(tx.serialize());
      await connection.confirmTransaction(sig);
      console.log("  tx:", sig);
      const bal = await connection.getTokenAccountBalance(ata);
      console.log("  MENTIK balance:", bal.value.uiAmountString);
    }
  } catch (e) {
    console.log("  claim skipped:", e.message);
  }

  console.log("\n✓ Devnet flow complete");
  console.log("Global PDA:", globalState.toBase58());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
