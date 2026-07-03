export interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
  usdValue: number;
  logoUri?: string;
}

export interface Strategy {
  id: number;
  name: string;
  symbol: string;
  description: string;
  apy: number;
  tvl: number;
  risk: "low" | "medium" | "high";
  color: string;
}

export interface UserPosition {
  strategy: number;
  depositedAmount: number; // in lamports
  lstReceived: number;
  depositTimestamp: number;
  lastUpdated: number;
}

export interface PortfolioSummary {
  totalValueUsd: number;
  solBalance: number;
  solPrice: number;
  tokens: TokenBalance[];
  positions: UserPosition[];
  change24h: number;
}

export interface TransactionRecord {
  signature: string;
  type: "deposit" | "withdraw" | "transfer" | "swap" | "unknown";
  amount: number;
  symbol: string;
  timestamp: number;
  status: "confirmed" | "failed";
}
