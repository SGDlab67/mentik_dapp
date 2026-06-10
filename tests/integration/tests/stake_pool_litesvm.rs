use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::pubkey::Pubkey;
use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use mentik_sol_pool::state::{GlobalState, StakeAccount};
use mentik_sol_pool::{
    accounts,
    constants::{
        DAILY_EMISSION, GLOBAL_SEED, LOCK_30_DAYS, LOCK_7_DAYS, MENTIK_MINT_SEED,
        MINT_AUTHORITY_SEED, SOL_VAULT_SEED, STAKE_SEED,
    },
    instruction, ID,
};
use solana_address::Address;
use solana_clock::Clock;
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;
use spl_token::solana_program::program_pack::Pack;
use std::path::PathBuf;

const TOKEN_PROGRAM: Address =
    Address::from_str_const("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SYSTEM_PROGRAM: Address = Address::from_str_const("11111111111111111111111111111111");
const ATA_PROGRAM: Address =
    Address::from_str_const("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

fn program_pubkey() -> Pubkey {
    ID
}

fn program_address() -> Address {
    Address::from(program_pubkey().to_bytes())
}

fn pk_addr(pk: Pubkey) -> Address {
    Address::from(pk.to_bytes())
}

fn signer_pk(kp: &Keypair) -> Pubkey {
    Pubkey::from(kp.pubkey().to_bytes())
}

fn read_program_bytes() -> Vec<u8> {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("../../target/deploy/mentik_sol_pool.so");
    std::fs::read(&path).unwrap_or_else(|_| panic!("missing {:?}; run `anchor build` first", path))
}

fn pda(seeds: &[&[u8]]) -> (Address, u8) {
    let (pk, bump) = Pubkey::find_program_address(seeds, &program_pubkey());
    (pk_addr(pk), bump)
}

fn send(
    svm: &mut LiteSVM,
    payer: &Keypair,
    signers: &[&Keypair],
    ix: Instruction,
) -> Result<(), String> {
    svm.expire_blockhash();
    let blockhash = svm.latest_blockhash();
    let ix = solana_instruction::Instruction {
        program_id: pk_addr(ix.program_id),
        accounts: ix
            .accounts
            .into_iter()
            .map(|m| solana_instruction::AccountMeta {
                pubkey: pk_addr(m.pubkey),
                is_signer: m.is_signer,
                is_writable: m.is_writable,
            })
            .collect(),
        data: ix.data,
    };
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), signers)
        .map_err(|e| e.to_string())?;
    svm.send_transaction(tx).map_err(|e| format!("{e:?}"))?;
    Ok(())
}

fn warp_seconds(svm: &mut LiteSVM, seconds: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp += seconds;
    svm.set_sysvar(&clock);
    svm.expire_blockhash();
}

fn init_pool(svm: &mut LiteSVM, authority: &Keypair) {
    let (global_state, _) = pda(&[GLOBAL_SEED]);
    let (sol_vault, _) = pda(&[SOL_VAULT_SEED]);
    let (mint_authority, _) = pda(&[MINT_AUTHORITY_SEED]);
    let (mentik_mint, _) = pda(&[MENTIK_MINT_SEED]);

    let ix = Instruction {
        program_id: program_pubkey(),
        accounts: accounts::Initialize {
            authority: pk_addr(signer_pk(authority)),
            global_state,
            sol_vault,
            mint_authority,
            mentik_mint,
            token_program: TOKEN_PROGRAM,
            system_program: SYSTEM_PROGRAM,
        }
        .to_account_metas(None),
        data: instruction::Initialize {}.data(),
    };

    send(svm, authority, &[authority], ix).expect("initialize");
}

fn deposit(svm: &mut LiteSVM, user: &Keypair, lamports: u64, lock_seconds: u64) {
    try_deposit(svm, user, lamports, lock_seconds).expect("deposit");
}

fn try_deposit(
    svm: &mut LiteSVM,
    user: &Keypair,
    lamports: u64,
    lock_seconds: u64,
) -> Result<(), String> {
    let (global_state, _) = pda(&[GLOBAL_SEED]);
    let (sol_vault, _) = pda(&[SOL_VAULT_SEED]);
    let (stake_account, _) = pda(&[STAKE_SEED, signer_pk(user).as_ref()]);

    let ix = Instruction {
        program_id: program_pubkey(),
        accounts: accounts::DepositSol {
            user: pk_addr(signer_pk(user)),
            global_state,
            sol_vault,
            stake_account,
            system_program: SYSTEM_PROGRAM,
        }
        .to_account_metas(None),
        data: instruction::DepositSol {
            amount: lamports,
            lock_seconds,
        }
        .data(),
    };

    send(svm, user, &[user], ix)
}

fn withdraw(svm: &mut LiteSVM, user: &Keypair, lamports: u64) -> Result<(), String> {
    let (global_state, _) = pda(&[GLOBAL_SEED]);
    let (sol_vault, _) = pda(&[SOL_VAULT_SEED]);
    let (stake_account, _) = pda(&[STAKE_SEED, signer_pk(user).as_ref()]);

    let ix = Instruction {
        program_id: program_pubkey(),
        accounts: accounts::WithdrawSol {
            user: pk_addr(signer_pk(user)),
            global_state,
            sol_vault,
            stake_account,
            system_program: SYSTEM_PROGRAM,
        }
        .to_account_metas(None),
        data: instruction::WithdrawSol { amount: lamports }.data(),
    };

    send(svm, user, &[user], ix)
}

fn migrate_stake(svm: &mut LiteSVM, user: &Keypair) -> Result<(), String> {
    let (stake_account, _) = pda(&[STAKE_SEED, signer_pk(user).as_ref()]);

    let ix = Instruction {
        program_id: program_pubkey(),
        accounts: accounts::MigrateStake {
            user: pk_addr(signer_pk(user)),
            stake_account,
            system_program: SYSTEM_PROGRAM,
        }
        .to_account_metas(None),
        data: instruction::MigrateStake {}.data(),
    };

    send(svm, user, &[user], ix)
}

fn sync_pool(svm: &mut LiteSVM, payer: &Keypair) {
    let (global_state, _) = pda(&[GLOBAL_SEED]);
    let ix = Instruction {
        program_id: program_pubkey(),
        accounts: accounts::SyncPool { global_state }.to_account_metas(None),
        data: instruction::SyncPool {}.data(),
    };
    send(svm, payer, &[payer], ix).expect("sync");
}

fn create_ata(svm: &mut LiteSVM, payer: &Keypair, owner: &Pubkey, mint: &Pubkey) -> Address {
    let ata_program = Pubkey::from(ATA_PROGRAM.to_bytes());
    let token_program = Pubkey::from(TOKEN_PROGRAM.to_bytes());
    let (ata_pk, _) = Pubkey::find_program_address(
        &[owner.as_ref(), token_program.as_ref(), mint.as_ref()],
        &ata_program,
    );
    let ata_addr = pk_addr(ata_pk);
    if svm.get_account(&ata_addr).is_some() {
        return ata_addr;
    }
    let ix = solana_instruction::Instruction {
        program_id: ATA_PROGRAM,
        accounts: vec![
            solana_instruction::AccountMeta::new(payer.pubkey(), true),
            solana_instruction::AccountMeta::new(ata_addr, false),
            solana_instruction::AccountMeta::new_readonly(pk_addr(*owner), false),
            solana_instruction::AccountMeta::new_readonly(pk_addr(*mint), false),
            solana_instruction::AccountMeta::new_readonly(SYSTEM_PROGRAM, false),
            solana_instruction::AccountMeta::new_readonly(TOKEN_PROGRAM, false),
        ],
        data: vec![],
    };
    svm.expire_blockhash();
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx =
        VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[payer]).expect("ata tx");
    svm.send_transaction(tx).expect("create ata");
    ata_addr
}

fn claim(svm: &mut LiteSVM, user: &Keypair, ata: Address) {
    let (global_state, _) = pda(&[GLOBAL_SEED]);
    let (stake_account, _) = pda(&[STAKE_SEED, signer_pk(user).as_ref()]);
    let (mentik_mint, _) = pda(&[MENTIK_MINT_SEED]);
    let (mint_authority, _) = pda(&[MINT_AUTHORITY_SEED]);

    let ix = Instruction {
        program_id: program_pubkey(),
        accounts: accounts::ClaimMentik {
            user: pk_addr(signer_pk(user)),
            global_state,
            stake_account,
            mentik_mint,
            user_mentik_ata: ata,
            mint_authority,
            token_program: TOKEN_PROGRAM,
        }
        .to_account_metas(None),
        data: instruction::ClaimMentik {}.data(),
    };
    send(svm, user, &[user], ix).expect("claim");
}

fn read_global(svm: &LiteSVM) -> GlobalState {
    let (global, _) = pda(&[GLOBAL_SEED]);
    let acc = svm.get_account(&global).expect("global");
    let mut data: &[u8] = &acc.data;
    GlobalState::try_deserialize(&mut data).expect("deserialize global")
}

fn read_stake(svm: &LiteSVM, user: &Keypair) -> StakeAccount {
    let (stake, _) = pda(&[STAKE_SEED, signer_pk(user).as_ref()]);
    let acc = svm.get_account(&stake).expect("stake");
    let mut data: &[u8] = &acc.data;
    StakeAccount::try_deserialize(&mut data).expect("deserialize stake")
}

fn token_balance(svm: &LiteSVM, ata: Address) -> u64 {
    let acc = svm.get_account(&ata).expect("ata");
    let state = spl_token::state::Account::unpack(&acc.data).expect("unpack");
    state.amount
}

#[test]
fn single_staker_earns_1000_mentik_per_day() {
    let mut svm = LiteSVM::new();
    svm.add_program(program_address(), &read_program_bytes())
        .unwrap();

    let authority = Keypair::new();
    let user = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&user.pubkey(), 10_000_000_000).unwrap();

    init_pool(&mut svm, &authority);
    deposit(&mut svm, &user, 1_000_000_000, 0);

    let before = svm.get_sysvar::<Clock>().unix_timestamp;
    warp_seconds(&mut svm, 86_400);
    assert_eq!(
        svm.get_sysvar::<Clock>().unix_timestamp - before,
        86_400,
        "clock warp failed"
    );
    sync_pool(&mut svm, &authority);
    let global = read_global(&svm);
    assert!(global.total_staked > 0, "no TVL");
    assert!(
        global.reward_per_lamport > 0,
        "index not advanced, tvl={}, rps={}",
        global.total_staked,
        global.reward_per_lamport
    );

    let (mentik_mint, _) = pda(&[MENTIK_MINT_SEED]);
    let mint_pk = Pubkey::from(mentik_mint.to_bytes());
    let ata = create_ata(&mut svm, &user, &signer_pk(&user), &mint_pk);
    claim(&mut svm, &user, ata);

    let balance = token_balance(&svm, ata);
    let expected = DAILY_EMISSION as u64;
    assert!(
        balance >= expected.saturating_sub(10_000),
        "expected ~{expected}, got {balance}"
    );
}

#[test]
fn two_stakers_split_rewards_evenly() {
    let mut svm = LiteSVM::new();
    svm.add_program(program_address(), &read_program_bytes())
        .unwrap();

    let authority = Keypair::new();
    let user_a = Keypair::new();
    let user_b = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&user_a.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&user_b.pubkey(), 10_000_000_000).unwrap();

    init_pool(&mut svm, &authority);
    deposit(&mut svm, &user_a, 1_000_000_000, 0);
    deposit(&mut svm, &user_b, 1_000_000_000, 0);

    warp_seconds(&mut svm, 86_400);
    sync_pool(&mut svm, &authority);

    let (mentik_mint, _) = pda(&[MENTIK_MINT_SEED]);
    let mint_pk = Pubkey::from(mentik_mint.to_bytes());
    let ata_a = create_ata(&mut svm, &user_a, &signer_pk(&user_a), &mint_pk);
    let ata_b = create_ata(&mut svm, &user_b, &signer_pk(&user_b), &mint_pk);
    claim(&mut svm, &user_a, ata_a);
    claim(&mut svm, &user_b, ata_b);

    let half = (DAILY_EMISSION / 2) as u64;
    let bal_a = token_balance(&svm, ata_a);
    let bal_b = token_balance(&svm, ata_b);

    assert!(bal_a >= half.saturating_sub(10_000), "user_a: {bal_a}");
    assert!(bal_b >= half.saturating_sub(10_000), "user_b: {bal_b}");
    assert!(bal_a + bal_b <= (DAILY_EMISSION as u64) + 20_000);
}

#[test]
fn stake_lock_blocks_withdraw_until_unlock() {
    let mut svm = LiteSVM::new();
    svm.add_program(program_address(), &read_program_bytes())
        .unwrap();

    let authority = Keypair::new();
    let user = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&user.pubkey(), 10_000_000_000).unwrap();

    init_pool(&mut svm, &authority);
    let now = svm.get_sysvar::<Clock>().unix_timestamp;
    deposit(&mut svm, &user, 500_000_000, LOCK_7_DAYS);

    let stake = read_stake(&svm, &user);
    assert!(stake.locked_until > now, "expected active lock");

    let withdraw_err = withdraw(&mut svm, &user, 100_000_000).unwrap_err();
    assert!(
        withdraw_err.contains("6004") || withdraw_err.to_lowercase().contains("stakelocked"),
        "expected StakeLocked, got: {withdraw_err}"
    );

    warp_seconds(&mut svm, LOCK_7_DAYS as i64 + 1);
    withdraw(&mut svm, &user, 100_000_000).expect("withdraw after unlock");

    deposit(&mut svm, &user, 100_000_000, 0);
    withdraw(&mut svm, &user, 50_000_000).expect("flexible deposit withdraw");
}

#[test]
fn invalid_lock_duration_rejected() {
    let mut svm = LiteSVM::new();
    svm.add_program(program_address(), &read_program_bytes())
        .unwrap();

    let authority = Keypair::new();
    let user = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&user.pubkey(), 10_000_000_000).unwrap();

    init_pool(&mut svm, &authority);
    let err = try_deposit(&mut svm, &user, 100_000_000, 999).unwrap_err();
    assert!(
        err.contains("6005") || err.to_lowercase().contains("invalidlockduration"),
        "expected InvalidLockDuration, got: {err}"
    );
}

#[test]
fn claim_while_locked_succeeds() {
    let mut svm = LiteSVM::new();
    svm.add_program(program_address(), &read_program_bytes())
        .unwrap();

    let authority = Keypair::new();
    let user = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&user.pubkey(), 10_000_000_000).unwrap();

    init_pool(&mut svm, &authority);
    deposit(&mut svm, &user, 1_000_000_000, LOCK_7_DAYS);

    let stake = read_stake(&svm, &user);
    assert!(
        stake.locked_until > svm.get_sysvar::<Clock>().unix_timestamp,
        "expected active lock"
    );

    warp_seconds(&mut svm, 86_400);
    sync_pool(&mut svm, &authority);

    let (mentik_mint, _) = pda(&[MENTIK_MINT_SEED]);
    let mint_pk = Pubkey::from(mentik_mint.to_bytes());
    let ata = create_ata(&mut svm, &user, &signer_pk(&user), &mint_pk);
    claim(&mut svm, &user, ata);

    assert!(
        token_balance(&svm, ata) > 0,
        "expected MENTIK minted while stake locked"
    );
}

#[test]
fn lock_extension_uses_max() {
    let mut svm = LiteSVM::new();
    svm.add_program(program_address(), &read_program_bytes())
        .unwrap();

    let authority = Keypair::new();
    let user = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&user.pubkey(), 10_000_000_000).unwrap();

    init_pool(&mut svm, &authority);
    let now = svm.get_sysvar::<Clock>().unix_timestamp;
    deposit(&mut svm, &user, 500_000_000, LOCK_7_DAYS);
    let after_seven = read_stake(&svm, &user).locked_until;
    assert_eq!(after_seven, now + LOCK_7_DAYS as i64);

    deposit(&mut svm, &user, 100_000_000, LOCK_30_DAYS);
    let after_thirty = read_stake(&svm, &user).locked_until;
    assert_eq!(after_thirty, now + LOCK_30_DAYS as i64);
    assert!(after_thirty > after_seven);
}

#[test]
fn legacy_stake_account_can_migrate_and_withdraw() {
    let mut svm = LiteSVM::new();
    svm.add_program(program_address(), &read_program_bytes())
        .unwrap();

    let authority = Keypair::new();
    let user = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&user.pubkey(), 10_000_000_000).unwrap();

    init_pool(&mut svm, &authority);
    deposit(&mut svm, &user, 1_000_000_000, 0);

    let (stake_account, _) = pda(&[STAKE_SEED, signer_pk(&user).as_ref()]);
    let mut account = svm.get_account(&stake_account).expect("stake account");
    let migrated_len = 8 + StakeAccount::INIT_SPACE;
    assert_eq!(account.data.len(), migrated_len);

    let legacy_len = migrated_len - 8;
    account.data.truncate(legacy_len);
    account.lamports = svm.minimum_balance_for_rent_exemption(legacy_len);
    svm.set_account(stake_account, account)
        .expect("install legacy stake account");

    let withdraw_err = withdraw(&mut svm, &user, 100_000_000).unwrap_err();
    assert!(
        withdraw_err.to_lowercase().contains("deserialize"),
        "expected legacy account to fail deserialization before migration, got: {withdraw_err}"
    );

    migrate_stake(&mut svm, &user).expect("migrate stake");

    let migrated = read_stake(&svm, &user);
    assert_eq!(migrated.sol_amount, 1_000_000_000);
    assert_eq!(migrated.locked_until, 0);
    assert_eq!(migrated.owner, signer_pk(&user));

    withdraw(&mut svm, &user, 100_000_000).expect("withdraw after migration");
}
