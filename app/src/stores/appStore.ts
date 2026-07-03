import { create } from "zustand";
import type { PortfolioSummary, TransactionRecord } from "@/lib/types";

interface AppState {
  // Portfolio
  portfolio: PortfolioSummary | null;
  setPortfolio: (p: PortfolioSummary) => void;

  // Transactions
  transactions: TransactionRecord[];
  setTransactions: (txs: TransactionRecord[]) => void;

  // UI state
  depositModalOpen: boolean;
  selectedStrategy: number | null;
  openDepositModal: (strategyId: number) => void;
  closeDepositModal: () => void;

  // Loading
  loading: boolean;
  setLoading: (l: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  portfolio: null,
  setPortfolio: (portfolio) => set({ portfolio }),

  transactions: [],
  setTransactions: (transactions) => set({ transactions }),

  depositModalOpen: false,
  selectedStrategy: null,
  openDepositModal: (strategyId) =>
    set({ depositModalOpen: true, selectedStrategy: strategyId }),
  closeDepositModal: () =>
    set({ depositModalOpen: false, selectedStrategy: null }),

  loading: false,
  setLoading: (loading) => set({ loading }),
}));
