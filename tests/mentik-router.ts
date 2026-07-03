import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("mentik-router", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.MentikRouter as Program;
  const authority = provider.wallet;

  // PDAs
  let configPda: PublicKey;
  let configBump: number;
  let treasuryKeypair = anchor.web3.Keypair.generate();

  before(async () => {
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("protocol-config")],
      program.programId
    );
  });

  it("Initializes the protocol", async () => {
    const feeBps = 10; // 0.1%

    await program.methods
      .initialize(feeBps)
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        treasury: treasuryKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.protocolConfig.fetch(configPda);
    expect(config.feeBps).to.equal(feeBps);
    expect(config.treasury.toBase58()).to.equal(
      treasuryKeypair.publicKey.toBase58()
    );
    expect(config.paused).to.equal(false);
    expect(config.totalDeposits.toNumber()).to.equal(0);
  });

  it("Deposits SOL into strategy 0 (Marinade)", async () => {
    const strategy = 0; // Marinade
    const depositAmount = 0.5 * LAMPORTS_PER_SOL;

    const [positionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        authority.publicKey.toBuffer(),
        Buffer.from([strategy]),
      ],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from([strategy])],
      program.programId
    );

    const balanceBefore = await provider.connection.getBalance(
      authority.publicKey
    );

    await program.methods
      .deposit(new anchor.BN(depositAmount), strategy)
      .accounts({
        position: positionPda,
        config: configPda,
        vault: vaultPda,
        treasury: treasuryKeypair.publicKey,
        user: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const position = await program.account.userPosition.fetch(positionPda);
    expect(position.owner.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
    expect(position.strategy).to.equal(strategy);
    // deposited_amount should be depositAmount minus fee (0.1%)
    const expectedFee = Math.floor(depositAmount * 10 / 10000);
    const expectedDeposit = depositAmount - expectedFee;
    expect(position.depositedAmount.toNumber()).to.equal(expectedDeposit);

    // Check treasury received the fee
    const treasuryBalance = await provider.connection.getBalance(
      treasuryKeypair.publicKey
    );
    expect(treasuryBalance).to.be.greaterThanOrEqual(expectedFee);
  });

  it("Withdraws SOL from strategy 0", async () => {
    const strategy = 0;
    const withdrawAmount = 0.2 * LAMPORTS_PER_SOL;

    const [positionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        authority.publicKey.toBuffer(),
        Buffer.from([strategy]),
      ],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from([strategy])],
      program.programId
    );

    const positionBefore = await program.account.userPosition.fetch(
      positionPda
    );

    await program.methods
      .withdraw(new anchor.BN(withdrawAmount))
      .accounts({
        position: positionPda,
        config: configPda,
        vault: vaultPda,
        user: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const positionAfter = await program.account.userPosition.fetch(
      positionPda
    );
    expect(positionAfter.depositedAmount.toNumber()).to.equal(
      positionBefore.depositedAmount.toNumber() - withdrawAmount
    );
  });

  it("Rejects deposit of zero amount", async () => {
    const strategy = 0;
    const [positionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        authority.publicKey.toBuffer(),
        Buffer.from([strategy]),
      ],
      program.programId
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from([strategy])],
      program.programId
    );

    try {
      await program.methods
        .deposit(new anchor.BN(0), strategy)
        .accounts({
          position: positionPda,
          config: configPda,
          vault: vaultPda,
          treasury: treasuryKeypair.publicKey,
          user: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err.error.errorCode.code).to.equal("ZeroAmount");
    }
  });
});
