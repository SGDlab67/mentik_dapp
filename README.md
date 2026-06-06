# MENTIK Pool — User guide (Devnet)

Stake **SOL** on Solana **Devnet** and earn **MENTIK** from a fixed pool emission (1,000 MENTIK per day, shared by all stakers).

**Live app:** https://app-weld-gamma-42.vercel.app

This guide covers getting free Devnet SOL and making your first deposit. No real money is involved.

---

## Before you start

You need:

1. A Solana wallet browser extension (**Phantom** or **Solflare** recommended)
2. The wallet set to **Devnet** (not Mainnet)
3. A small amount of Devnet SOL (test tokens) to pay transaction fees and to deposit

---

## Step 1 — Install and switch to Devnet

### Phantom

1. Install [Phantom](https://phantom.app/) and create or import a wallet.
2. Open **Settings** (gear icon) → **Developer Settings** → turn on **Testnet Mode** (or use the network picker).
3. Set the active network to **Devnet**. The app should show a **Devnet** badge in the top bar when connected correctly.

### Solflare

1. Install [Solflare](https://solflare.com/).
2. Open settings and select **Devnet** as the cluster.

If your wallet is on **Mainnet**, transactions on the MENTIK site will fail or show wrong balances.

---

## Step 2 — Get Devnet SOL (test SOL)

You need Devnet SOL for:

- **Transaction fees** (each approve/sign costs a tiny amount, usually well under 0.01 SOL)
- **Your deposit** (whatever amount you enter in the Deposit field, e.g. 0.1 SOL)

Choose **one** of these methods.

### Option A — Phantom built-in faucet (easiest)

1. In Phantom on **Devnet**, open your SOL balance.
2. Use **Receive** / **Airdrop** / **Get devnet SOL** if shown (wording varies by Phantom version).
3. Request an airdrop (often 1–2 SOL per request). Repeat later if you need more.

### Option B — Solana web faucet

1. Copy your wallet address from Phantom (click the address to copy).
2. Open https://faucet.solana.com/
3. Select **Devnet**, paste your address, complete any captcha, and submit.
4. Wait a few seconds, then refresh your wallet balance.

### Option C — Command line (if you use the Solana CLI)

```bash
solana config set --url devnet
solana airdrop 2 YOUR_WALLET_ADDRESS
```

Replace `YOUR_WALLET_ADDRESS` with your Phantom/Solflare public key.

**Tip:** Keep at least **0.05 SOL** in the wallet after your deposit so you can pay for **Claim**, **Withdraw**, and future transactions.

---

## Step 3 — Open the site and connect

1. Go to https://app-weld-gamma-42.vercel.app
2. Confirm the page shows a **Devnet** badge.
3. Click **Select Wallet** (or similar) and connect **Phantom** or **Solflare**.
4. Approve the connection in the extension popup.

Your truncated wallet address should appear in the header.

---

## Step 4 — Deposit SOL

The pool must already be **initialized** on Devnet (usually done once by the team). If the **Global pool** card says **Live** / **Accepting deposits**, you can deposit. If it says **Awaiting init**, someone needs to click **Initialize pool** once first (any connected wallet can do this on Devnet).

### Make a deposit

1. Scroll to **Manage stake**.
2. Choose a **Lock period** (optional):
   - **Flexible** — withdraw anytime (default)
   - **7-day lock** — withdraw blocked for 7 days from deposit
   - **30-day lock** — withdraw blocked for 30 days from deposit
3. Enter an amount in **Deposit amount** (default is `0.1` SOL). Use an amount you still have after fees (e.g. if you have 2 SOL from the faucet, `0.5` or `1.0` is fine).
4. Click **Deposit**.
5. Review the transaction in your wallet popup and **Approve**.

**Lock note:** The lock applies to your **entire stake**, not just the new deposit. If you already have a timed lock, choosing Flexible on a later deposit does **not** unlock early.

After success, you should see:

- **Your stake** updated under the stat strip
- **Pool share** and estimated **MENTIK / day** on the **Your position** card
- **Lock status** on your position card (countdown if locked)
- A status message with a link to the transaction on [Solana Explorer](https://explorer.solana.com/?cluster=devnet) (Devnet)

### What you are doing on-chain

Depositing moves SOL from your wallet into the program’s vault. Your share of the daily 1,000 MENTIK emission is proportional to your stake vs total pool TVL.

---

## Step 5 — Earn and claim MENTIK (optional)

Rewards accrue over time. You do not need to deposit again to earn.

1. Watch **Pending rewards** on the dashboard (refreshes periodically).
2. When you have claimable MENTIK, click **Claim MENTIK** on the **Your position** card.
3. Approve the transaction. The first claim may also create your MENTIK token account.

**Claim works even while your stake is locked** — only withdraw is blocked during a lock period.

You can also use **↻ Sync reward index** on the global card to update the pool index (claiming also advances rewards).

---

## Withdraw SOL (optional)

Under **Manage stake**, enter an amount in **Withdraw amount** and click **Withdraw**. You can only withdraw up to your staked balance.

If your stake is **locked**, the Withdraw button is disabled until the countdown on **Your position** reaches zero. Claiming MENTIK is still allowed.

---

## Troubleshooting

| Problem | What to try |
|--------|-------------|
| Wallet won’t connect | Refresh the page, disconnect/reconnect, ensure the extension is unlocked |
| “Insufficient funds” | Get more Devnet SOL (Step 2); leave SOL for fees |
| Wrong network / failed txs | Switch wallet to **Devnet** and reconnect |
| **Program offline** banner | The on-chain program is not deployed; this is an ops issue, not your wallet |
| **Awaiting init** | Click **Initialize pool** once (Devnet demo), then deposit |
| Deposit button disabled | Connect wallet, ensure pool is **Live**, and wait if a previous tx is still pending |
| Simulation failed | Lower deposit amount; confirm Devnet SOL balance; read the red status message at the bottom |
| **Stake is locked** / withdraw disabled | Wait for the unlock countdown on **Your position**; claim still works |

---

## Quick checklist

- [ ] Wallet on **Devnet**
- [ ] At least ~0.1–2 **Devnet SOL** in wallet
- [ ] Connected on https://app-weld-gamma-42.vercel.app
- [ ] Pool status **Live**
- [ ] **Deposit** approved in wallet
- [ ] (Later) **Claim MENTIK** when rewards show

---

## Important notes

- **Devnet only** — tokens and SOL have **no real-world value**.
- Do not use Mainnet funds on this demo.
- Daily emission is **1,000 MENTIK total for the whole pool**, split among stakers by SOL weight.

---

## For developers

Anchor program, local UI, tests, and deployment: see [DEVELOPER.md](./DEVELOPER.md).

Program ID (Devnet): `56zRQzpWpV8VKDpnVQGjvtpyZb9NzS3ox8UJp97taRX1`

Repository: https://github.com/SGDlab67/mentik_dapp
