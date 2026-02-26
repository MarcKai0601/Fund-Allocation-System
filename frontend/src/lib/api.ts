import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Account {
  id: number;
  available_funds: number;
  total_invested: number;
  total_deposited: number;
  realized_pnl: number;
  is_initialized: boolean;
}

export interface FundLedgerEntry {
  id: number;
  type: "INIT" | "DEPOSIT" | "WITHDRAW";
  amount: number;
  note: string | null;
  trade_date: string;
  created_at: string;
}

export interface StockMaster {
  symbol: string;
  name: string;
  sector: string | null;
  market: string;
}

export interface TradeRequest {
  symbol: string;
  action: "BUY" | "SELL";
  price: number;
  quantity: number;
  fee: number;
  trade_date: string;
  note?: string;
}

export interface Transaction {
  id: number;
  symbol: string;
  action: "BUY" | "SELL";
  price: number;
  quantity: number;
  fee: number;
  total_amount: number;
  trade_date: string;
  cost_basis: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  note: string | null;
  created_at: string;
}

export interface Position {
  symbol: string;
  name: string | null;
  quantity: number;
  avg_cost: number;
  total_cost: number;
  current_price: number | null;
  market_value: number | null;
  unrealized_pnl: number | null;
  unrealized_pnl_pct: number | null;
  change_pct: number | null;
}

export interface Portfolio {
  account: Account;
  positions: Position[];
  total_market_value: number;
  total_unrealized_pnl: number;
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const fundsApi = {
  init: (data: { amount: number; note?: string; trade_date: string }) =>
    api.post<Account>("/api/funds/init", data),
  deposit: (data: { amount: number; note?: string; trade_date: string }) =>
    api.post<Account>("/api/funds/deposit", data),
  getLedger: () => api.get<FundLedgerEntry[]>("/api/funds/ledger"),
  getAccount: () => api.get<Account>("/api/funds/account"),
};

export const tradesApi = {
  create: (data: TradeRequest) => api.post<Transaction>("/api/trades", data),
  list: (symbol?: string) =>
    api.get<Transaction[]>("/api/trades", { params: symbol ? { symbol } : {} }),
};

export const portfolioApi = {
  get: () => api.get<Portfolio>("/api/portfolio"),
};

export const stocksApi = {
  search: (q: string) =>
    api.get<StockMaster[]>("/api/stocks/search", { params: { q } }),
  getQuote: (symbol: string) =>
    api.get<{ symbol: string; price: number; change_pct: number | null; name: string | null }>(`/api/stocks/quote/${symbol}`),
};

// ─── Formatters ──────────────────────────────────────────────────────────────

export const fmt = {
  currency: (v: number | null | undefined) =>
    v == null ? "—" : `$${Number(v).toLocaleString("zh-TW", { minimumFractionDigits: 0 })}`,
  pct: (v: number | null | undefined) =>
    v == null ? "—" : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`,
  date: (s: string) => s?.slice(0, 10) ?? "—",
};
