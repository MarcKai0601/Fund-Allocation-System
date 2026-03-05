import axios from "axios";
import { useAuthStore } from "./auth-store";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: auto-attach JWT ────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 / 422 ──────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

// ─── Error helper ────────────────────────────────────────────────────────────

/** Safely extract error message string from Axios error (handles Pydantic 422 arrays) */
export function getErrorMsg(e: any, fallback = "操作失敗"): string {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg ?? JSON.stringify(d)).join("; ");
  return fallback;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PortfolioInfo {
  id: number;
  owner_user_id: string;
  name: string;
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

export interface PortfolioOverview {
  portfolio: PortfolioInfo;
  positions: Position[];
  total_market_value: number;
  total_unrealized_pnl: number;
}

// ─── API calls ───────────────────────────────────────────────────────────────

/** Helper: build portfolio-scoped path */
const p = (pid: number) => `/api/portfolios/${pid}`;

export const portfoliosApi = {
  create: (data: { name: string }) =>
    api.post<PortfolioInfo>("/api/portfolios", data),
  list: () => api.get<PortfolioInfo[]>("/api/portfolios"),
};

export const fundsApi = {
  init: (pid: number, data: { amount: number; note?: string; trade_date: string }) =>
    api.post<PortfolioInfo>(`${p(pid)}/funds/init`, data),
  deposit: (pid: number, data: { amount: number; note?: string; trade_date: string }) =>
    api.post<PortfolioInfo>(`${p(pid)}/funds/deposit`, data),
  getLedger: (pid: number) => api.get<FundLedgerEntry[]>(`${p(pid)}/funds/ledger`),
};

export const tradesApi = {
  create: (pid: number, data: TradeRequest) =>
    api.post<Transaction>(`${p(pid)}/trades`, data),
  list: (pid: number, symbol?: string) =>
    api.get<Transaction[]>(`${p(pid)}/trades`, { params: symbol ? { symbol } : {} }),
};

export const portfolioApi = {
  get: (pid: number) => api.get<PortfolioOverview>(`${p(pid)}/overview`),
};

export const stocksApi = {
  search: (q: string) =>
    api.get<StockMaster[]>("/api/stocks/search", { params: { q } }),
  getQuote: (symbol: string) =>
    api.get<{ symbol: string; price: number; change_pct: number | null; name: string | null }>(
      `/api/stocks/quote/${symbol}`
    ),
};

// ─── Dev Auth (模擬 Java MGR SSO 登入) ────────────────────────────────────────

export const devApi = {
  login: (userId = 1) =>
    api.post<{ token: string; user_id: number; roles: Record<string, string[]>; ttl: number }>(
      "/api/dev/login", { user_id: userId }
    ),
};

// ─── Formatters ──────────────────────────────────────────────────────────────

export const fmt = {
  currency: (v: number | null | undefined) =>
    v == null ? "—" : `$${Number(v).toLocaleString("zh-TW", { minimumFractionDigits: 0 })}`,
  pct: (v: number | null | undefined) =>
    v == null ? "—" : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`,
  date: (s: string) => s?.slice(0, 10) ?? "—",
};
