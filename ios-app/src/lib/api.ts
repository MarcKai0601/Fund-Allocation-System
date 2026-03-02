import axios from "axios";
import { useAuthStore } from "./auth-store";

// DEV: 改為你的 backend URL，局域網使用 IP (非 localhost)
const API_BASE = "http://localhost:8000";

const api = axios.create({
    baseURL: API_BASE,
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
});

// Request: auto-attach token
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response: handle 401
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(err);
    }
);

/** Safely extract error message */
export function getErrorMsg(e: any, fallback = "操作失敗"): string {
    const detail = e?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail))
        return detail.map((d: any) => d.msg ?? JSON.stringify(d)).join("; ");
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

export interface FundLedgerEntry {
    id: number;
    type: string;
    amount: number;
    note: string | null;
    trade_date: string;
    created_at: string;
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
}

// ─── API calls ───────────────────────────────────────────────────────────────

const p = (pid: number) => `/api/portfolios/${pid}`;

export const devApi = {
    login: (userId = "dev_user_001") =>
        api.post<{ token: string; user_id: string }>("/api/dev/login", {
            user_id: userId,
        }),
};

export const portfoliosApi = {
    list: () => api.get<PortfolioInfo[]>("/api/portfolios"),
    create: (name: string) =>
        api.post<PortfolioInfo>("/api/portfolios", { name }),
};

export const portfolioApi = {
    get: (pid: number) => api.get<PortfolioOverview>(`${p(pid)}/overview`),
};

export const fundsApi = {
    init: (pid: number, data: { amount: number; note?: string; trade_date: string }) =>
        api.post<PortfolioInfo>(`${p(pid)}/funds/init`, data),
    deposit: (pid: number, data: { amount: number; note?: string; trade_date: string }) =>
        api.post<PortfolioInfo>(`${p(pid)}/funds/deposit`, data),
    getLedger: (pid: number) =>
        api.get<FundLedgerEntry[]>(`${p(pid)}/funds/ledger`),
};

export const tradesApi = {
    create: (pid: number, data: any) =>
        api.post<Transaction>(`${p(pid)}/trades`, data),
    list: (pid: number, symbol?: string) =>
        api.get<Transaction[]>(`${p(pid)}/trades`, { params: symbol ? { symbol } : {} }),
};

// ─── Formatters ──────────────────────────────────────────────────────────────

export const fmt = {
    currency: (v: number | null | undefined) =>
        v == null ? "—" : `$${Number(v).toLocaleString("zh-TW", { minimumFractionDigits: 0 })}`,
    pct: (v: number | null | undefined) =>
        v == null ? "—" : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`,
    date: (s: string) => s?.slice(0, 10) ?? "—",
};

export default api;
