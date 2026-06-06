# MENTIK SOL Pool — Developer guide

Solana devnet dApp: deposit **SOL**, earn **MENTIK** from a **fixed 1,000 MENTIK/day** emission shared by all stakers (pro-rata by SOL weight).

## Architecture

- **Anchor program** (`programs/mentik_sol_pool`): MasterChef-style `reward_per_lamport` index, SOL vault PDA, MENTIK mint authority PDA.
- **Instructions**: `initialize`, `deposit_sol(amount, lock_seconds)`, `withdraw_sol`, `claim_mentik`, `sync_pool`
- **Next.js UI** (`app/`): wallet connect, pool TVL, share %, pending rewards, deposit / withdraw / claim (simulate before send).

### Emission math

```
user_daily_mentik = 1000 * user_lamports / total_lamports
```

When `total_staked == 0`, the index does not advance (no mint).

### Stake lock periods

Deposits accept an optional `lock_seconds` argument:

| Tier | Seconds | Behavior |
|------|---------|----------|
| Flexible | `0` | No new lock; existing lock unchanged |
| 7-day | `604_800` | `locked_until = max(current, now + 7d)` |
| 30-day | `2_592_000` | `locked_until = max(current, now + 30d)` |

While `locked_until > now`, **withdraw is blocked** on-chain (`StakeLocked`). **Claim** and **sync** are unaffected. Additional deposits with a non-zero tier extend the lock (never shorten an active lock).

**Redeploy note:** `StakeAccount` gained an 8-byte `locked_until` field. After redeploying, existing stake PDAs (old layout) fail to deserialize — re-deposit alone is not enough. Options for devnet: deploy a new program ID, add a close/migration instruction, or manually close old stake accounts before re-staking.

## Program ID (devnet)

```
56zRQzpWpV8VKDpnVQGjvtpyZb9NzS3ox8UJp97taRX1
```

## Live app

**Production:** https://app-weld-gamma-42.vercel.app

Use a **devnet** wallet (Phantom/Solflare). The CLI key at `~/.config/solana/id.json` is a separate keypair — import it into Phantom if you want the same address on the website.

## Quick start

### 1. Build program

```bash
anchor build
```

### 2. Run tests (LiteSVM)

```bash
anchor build   # ensures target/deploy/mentik_sol_pool.so exists
cargo test -p mentik-integration-tests
cargo test -p mentik_sol_pool
```

Tests cover:

- Single staker ≈ 1,000 MENTIK after 24h
- Two equal stakers ≈ 500 MENTIK each after 24h
- 7-day lock blocks withdraw until unlock; flexible deposits withdraw immediately

### 3. Deploy to devnet (required once)

```bash
anchor deploy --provider.cluster devnet
```

Verify: `solana program show 56zRQzpWpV8VKDpnVQGjvtpyZb9NzS3ox8UJp97taRX1 --url devnet`

Fund your wallet: `solana airdrop 2 --url devnet`

### 3b. CLI smoke test (local wallet)

```bash
cd app && npm run devnet:flow
```

Runs initialize → deposit → sync → claim using `~/.config/solana/id.json`.

### 4. Run UI

```bash
cd app
npm install
npm run dev
```

Open http://localhost:3000

1. Connect wallet (devnet)
2. **Initialize pool** (once, any wallet)
3. **Deposit SOL**
4. Wait / call **Sync index** (optional; claim also advances index)
5. **Claim MENTIK**

## Risk notes

- Devnet demo only; fixed inflation with no economic backing.
- SOL is held in a program vault PDA; withdraw only your recorded stake balance.
- MENTIK is minted on `claim_mentik` via program-controlled mint authority.
- UI simulates every transaction before wallet approval.
- Do not use mainnet or real funds without audit and economics review.

## Project layout

```
├── programs/mentik_sol_pool/   # Anchor program + unit tests
├── tests/integration/          # LiteSVM integration tests
├── app/                        # Next.js frontend
├── target/idl/                 # Generated IDL (after anchor build)
└── Anchor.toml
```
