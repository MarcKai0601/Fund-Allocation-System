"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { tradesApi, stocksApi, portfolioApi, fmt, getErrorMsg, Transaction, StockMaster, Position } from "@/lib/api";
import { usePortfolioStore } from "@/lib/portfolio-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, RefreshCw, Search, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const defaultForm = () => ({
    symbol: "",
    symbolDisplay: "",
    action: "BUY" as "BUY" | "SELL",
    price: "",
    quantity: "",
    trade_date: "",
    note: "",
});

/** 元大手續費 0.1425% × 6折，最低 20 元 */
const calcBrokerFee = (price: number, qty: number) =>
    Math.max(20, Math.floor(price * qty * 0.001425 * 0.6));

/** 台股證交稅 0.3% (僅賣出) */
const calcTax = (price: number, qty: number) =>
    Math.floor(price * qty * 0.003);

export default function TradesPage() {
    const { t } = useTranslation();
    const [trades, setTrades] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(defaultForm());
    const [submitting, setSubmitting] = useState(false);
    const [filterSymbol, setFilterSymbol] = useState("");
    const [positions, setPositions] = useState<Position[]>([]);
    const [quoteFetching, setQuoteFetching] = useState(false);
    const [quoteSource, setQuoteSource] = useState<"live" | "none">("none");
    const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId);

    // Autocomplete
    const [suggestions, setSuggestions] = useState<StockMaster[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const autocompleteRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async (sym?: string) => {
        if (!activePortfolioId) { setLoading(false); return; }
        try {
            const res = await tradesApi.list(activePortfolioId, sym);
            setTrades(res.data);
        } finally {
            setLoading(false);
        }
    }, [activePortfolioId]);

    const loadPositions = useCallback(async () => {
        if (!activePortfolioId) return;
        try {
            const res = await portfolioApi.get(activePortfolioId);
            setPositions(res.data.positions);
        } catch { /* ignore */ }
    }, [activePortfolioId]);

    useEffect(() => { setLoading(true); load(); }, [load]);

    // Hydration-safe: 在 client mount 後才設定今天日期，避免 SSR/CSR 不一致
    useEffect(() => {
        setForm(f => ({ ...f, trade_date: f.trade_date || new Date().toISOString().slice(0, 10) }));
    }, []);

    useEffect(() => { loadPositions(); }, [loadPositions]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── 自動計算手續費 ──
    const price = Number(form.price) || 0;
    const qty = Number(form.quantity) || 0;
    const brokerFee = calcBrokerFee(price, qty);
    const tax = form.action === "SELL" ? calcTax(price, qty) : 0;
    const totalFee = brokerFee + tax;

    // 目前選擇股票的持倉
    const currentSymbol = form.symbol.split(" ")[0];
    const currentPosition = positions.find(p => p.symbol === currentSymbol);

    const handleSymbolInput = (val: string) => {
        setForm(f => ({ ...f, symbolDisplay: val, symbol: val }));
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (val.length < 1) { setSuggestions([]); setShowSuggestions(false); return; }
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await stocksApi.search(val);
                setSuggestions(res.data);
                setShowSuggestions(res.data.length > 0);
            } catch { }
        }, 300);
    };

    const selectStock = async (s: StockMaster) => {
        setForm(f => ({ ...f, symbol: s.symbol, symbolDisplay: `${s.symbol} ${s.name}`, price: "" }));
        setShowSuggestions(false);
        setQuoteSource("none");
        // Auto-fill latest real-time price (bypass Redis cache, use FUGLE_API_KEY_QUOTE if configured)
        setQuoteFetching(true);
        try {
            const res = await stocksApi.getQuote(s.symbol);
            if (res.data?.price) {
                setForm(f => ({ ...f, price: String(res.data.price) }));
                setQuoteSource("live");
            }
        } catch {
            // Fugle API key may not be set — silently ignore, let user enter manually
            toast.warning(t("trades.toast.noQuote", "無法取得即時報價，請手動輸入成交價格"), { duration: 3000 });
        } finally {
            setQuoteFetching(false);
        }
    };

    // 全出按鈕
    const handleSellAll = () => {
        if (!currentPosition) return;
        setForm(f => ({
            ...f,
            action: "SELL",
            quantity: String(currentPosition.quantity),
        }));
    };

    const handleSubmit = async () => {
        if (!form.symbol || !form.price || !form.quantity) {
            toast.error(t("trades.toast.missingFields", "請填寫必要欄位"));
            return;
        }
        setSubmitting(true);
        if (!activePortfolioId) return;
        try {
            await tradesApi.create(activePortfolioId, {
                symbol: form.symbol.split(" ")[0],
                action: form.action,
                price: Number(form.price),
                quantity: Number(form.quantity),
                fee: totalFee,
                trade_date: form.trade_date,
                note: form.note,
            });
            toast.success(form.action === "BUY" ? t("trades.toast.buySuccess", "買入交易新增成功！") : t("trades.toast.sellSuccess", "賣出交易新增成功！"));
            setOpen(false);
            setForm({ ...defaultForm(), trade_date: new Date().toISOString().slice(0, 10) });
            load();
            loadPositions();
        } catch (e: any) {
            toast.error(getErrorMsg(e, t("trades.toast.tradeFailed", "交易失敗")));
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = filterSymbol
        ? trades.filter(t => t.symbol.toLowerCase().includes(filterSymbol.toLowerCase()))
        : trades;

    if (!activePortfolioId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <ArrowLeftRight className="w-16 h-16" style={{ color: "var(--sidebar-text)" }} />
                <h2 className="text-xl font-semibold" style={{ color: "var(--body-text)" }}>{t("trades.selectAccount", "請選擇代操帳戶")}</h2>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold" style={{ color: "var(--body-text)" }}>{t("trades.title", "交易紀錄")}</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--sidebar-text)" }}>{t("trades.subtitle", "記錄每一筆買賣操作與計算損益")}</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            {t("trades.addTrade", "新增交易")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                        <DialogHeader>
                            <DialogTitle style={{ color: "var(--body-text)" }}>{t("trades.addTradeTitle", "新增交易")}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                            {/* Stock Search */}
                            <div className="space-y-2" ref={autocompleteRef}>
                                <Label style={{ color: "var(--sidebar-text)" }}>{t("trades.searchStock", "股票代號 / 名稱")}</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: "var(--sidebar-text)" }} />
                                    <Input
                                        placeholder={t("trades.searchPlaceholder", "搜尋股票，例：台積電 or 2330")}
                                        value={form.symbolDisplay}
                                        onChange={(e) => handleSymbolInput(e.target.value)}
                                        style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)" }}
                                        className="pl-9"
                                        onFocus={() => form.symbolDisplay && setSuggestions(suggestions)}
                                    />
                                    {showSuggestions && (
                                        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", border: "1px solid var(--card-border)" }}>
                                            {suggestions.map((s) => (
                                                <button
                                                    key={s.symbol}
                                                    className="w-full text-left px-4 py-2.5 transition-colors"
                                                    style={{ color: "var(--body-text)" }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sidebar-hover-bg)"; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                                                    onClick={() => selectStock(s)}
                                                >
                                                    <span className="text-emerald-400 font-medium text-sm">{s.symbol}</span>
                                                    <span className="text-sm ml-2" style={{ color: "var(--body-text)" }}>{s.name}</span>
                                                    <span className="text-xs ml-2" style={{ color: "var(--sidebar-text)" }}>{s.sector}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* 目前持倉數顯示 */}
                                {currentPosition && (
                                    <div className="flex items-center justify-between px-1 py-1.5" style={{ fontSize: "1rem" }}>
                                        <span className="font-medium" style={{ color: "var(--sidebar-text)" }}>
                                            {t("trades.currentHoldings", "目前持倉：")}<span className="text-emerald-400 font-bold" style={{ fontSize: "1.125rem" }}>{currentPosition.quantity.toLocaleString()}{t("trades.shares", " 股")}</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleSellAll}
                                            className="px-4 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors font-semibold"
                                            style={{ fontSize: "1rem" }}
                                        >
                                            {t("trades.sellAll", "全出")}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Action */}
                            <div className="space-y-2">
                                <Label style={{ color: "var(--sidebar-text)" }}>{t("trades.action", "買賣方向")}</Label>
                                <div className="flex gap-2">
                                    {(["BUY", "SELL"] as const).map((a) => (
                                        <Button
                                            key={a}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, action: a }))}
                                            className={cn(
                                                "flex-1 transition-all",
                                                form.action === a
                                                    ? a === "BUY" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"
                                                    : "border"
                                            )}
                                            style={form.action !== a ? { backgroundColor: "var(--input-bg)", color: "var(--sidebar-text)", borderColor: "var(--input-border)" } : undefined}
                                        >
                                            {a === "BUY" ? t("trades.buy", "買入 BUY") : t("trades.sell", "賣出 SELL")}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label style={{ color: "var(--sidebar-text)" }} className="flex items-center gap-2">
                                        {t("trades.price", "成交價格")}
                                        {quoteFetching && (
                                            <span className="text-xs flex items-center gap-1" style={{ color: "var(--sidebar-text)" }}>
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                                {t("trades.fetchingQuote", "取得報價中…")}
                                            </span>
                                        )}
                                        {!quoteFetching && quoteSource === "live" && (
                                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                {t("trades.liveQuote", "✦ 即時報價")}
                                            </span>
                                        )}
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder={quoteFetching ? t("trades.fetchingQuote", "取得報價中…") : "800"}
                                        value={form.price}
                                        disabled={quoteFetching}
                                        onChange={e => { setQuoteSource("none"); setForm(f => ({ ...f, price: e.target.value })); }}
                                        style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)", MozAppearance: "textfield" } as React.CSSProperties}
                                        className="no-spinner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label style={{ color: "var(--sidebar-text)" }}>{t("trades.quantity", "股數")}</Label>
                                    <Input
                                        type="number"
                                        placeholder="1000"
                                        value={form.quantity}
                                        onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                        style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)", MozAppearance: "textfield" } as React.CSSProperties}
                                        className="no-spinner"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label style={{ color: "var(--sidebar-text)" }}>{t("trades.tradeDate", "交易日期")}</Label>
                                    <Input type="date" value={form.trade_date} onChange={e => setForm(f => ({ ...f, trade_date: e.target.value }))} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)" }} />
                                </div>
                            </div>

                            {/* 自動計算手續費顯示 */}
                            {price > 0 && qty > 0 && (
                                <div className="rounded-lg p-3 text-sm space-y-1" style={{ backgroundColor: "var(--sidebar-hover-bg)" }}>
                                    <div className="flex justify-between">
                                        <span style={{ color: "var(--sidebar-text)" }}>{t("trades.brokerFee", "券商手續費 (0.1425%×6折)")}</span>
                                        <span style={{ color: "var(--body-text)" }} className="font-medium">{fmt.currency(brokerFee)}</span>
                                    </div>
                                    {form.action === "SELL" && (
                                        <div className="flex justify-between">
                                            <span style={{ color: "var(--sidebar-text)" }}>{t("trades.tax", "證交稅 (0.3%)")}</span>
                                            <span style={{ color: "var(--body-text)" }} className="font-medium">{fmt.currency(tax)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t pt-1" style={{ borderColor: "var(--card-border)" }}>
                                        <span style={{ color: "var(--sidebar-text)" }} className="font-medium">{t("trades.totalFee", "總手續費")}</span>
                                        <span className="text-emerald-400 font-bold">{fmt.currency(totalFee)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label style={{ color: "var(--sidebar-text)" }}>{t("trades.note", "備註")}</Label>
                                <Input placeholder={t("trades.notePlaceholder", "可選填")} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)" }} />
                            </div>

                            {price > 0 && qty > 0 && (
                                <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: "var(--sidebar-hover-bg)" }}>
                                    <span style={{ color: "var(--sidebar-text)" }}>{form.action === "BUY" ? t("trades.expectedCost", "預計花費：") : t("trades.expectedReturn", "預計收回：")}</span>
                                    <span className="font-semibold ml-2" style={{ color: "var(--body-text)" }}>
                                        {fmt.currency(
                                            form.action === "BUY"
                                                ? price * qty + totalFee
                                                : price * qty - totalFee
                                        )}
                                    </span>
                                </div>
                            )}

                            <Button onClick={handleSubmit} disabled={submitting} className={cn("w-full text-white", form.action === "BUY" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}>
                                {submitting ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : null}
                                {form.action === "BUY" ? t("trades.confirmBuy", "確認買入") : t("trades.confirmSell", "確認賣出")}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filter */}
            <div className="flex gap-3 items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: "var(--sidebar-text)" }} />
                    <Input
                        placeholder={t("trades.filterPlaceholder", "過濾股票代號...")}
                        value={filterSymbol}
                        onChange={e => { setFilterSymbol(e.target.value); }}
                        style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--input-border)", color: "var(--body-text)" }}
                        className="pl-9 w-56"
                    />
                </div>
                <span className="text-xs" style={{ color: "var(--sidebar-text)" }}>
                    {t("trades.recordCount", { count: filtered.length, defaultValue: `${filtered.length} 筆紀錄` })}
                </span>
            </div>

            {/* Trades Table */}
            <Card style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-emerald-400 w-6 h-6" /></div>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-center py-12" style={{ color: "var(--sidebar-text)" }}>{t("trades.emptyRecords", "尚無交易紀錄")}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                                        <th className="text-left p-4 font-medium text-xs w-12" style={{ color: "var(--sidebar-text)" }}>{t("trades.table.id", "#ID")}</th>
                                        <th className="text-left p-4 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("trades.table.stock", "股票")}</th>
                                        <th className="text-center p-4 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("trades.table.action", "方向")}</th>
                                        <th className="text-right p-4 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("trades.table.price", "成交價")}</th>
                                        <th className="text-right p-4 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("trades.table.shares", "股數")}</th>
                                        <th className="text-right p-4 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("trades.table.fee", "手續費")}</th>
                                        <th className="text-right p-4 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("trades.table.totalAmount", "總金額")}</th>
                                        <th className="text-right p-4 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("trades.table.realizedPnl", "已實現損益")}</th>
                                        <th className="text-right p-4 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("trades.table.roi", "報酬率")}</th>
                                        <th className="text-right p-4 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("trades.table.date", "日期")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((trade) => {
                                        const isBuy = trade.action === "BUY";
                                        const pnlPos = (trade.pnl ?? 0) >= 0;
                                        return (
                                            <tr key={trade.id} className="transition-colors" style={{ borderBottom: "1px solid var(--table-row-border)" }}
                                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--table-row-hover)")}
                                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                                            >
                                                <td className="p-4 text-xs font-mono w-12" style={{ color: "var(--sidebar-text)" }}>#{trade.id}</td>
                                                <td className="p-4">
                                                    <span className="font-semibold" style={{ color: "var(--body-text)" }}>{trade.symbol}</span>
                                                    {trade.note && <p className="text-xs mt-0.5" style={{ color: "var(--sidebar-text)" }}>{trade.note}</p>}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn("text-xs", isBuy
                                                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                                            : "bg-red-500/15 text-red-400 border-red-500/30")}
                                                    >
                                                        {isBuy ? t("trades.table.buyAction", "買入") : t("trades.table.sellAction", "賣出")}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-right" style={{ color: "var(--sidebar-text)" }}>{fmt.currency(trade.price)}</td>
                                                <td className="p-4 text-right" style={{ color: "var(--sidebar-text)" }}>{trade.quantity.toLocaleString()}</td>
                                                <td className="p-4 text-right" style={{ color: "var(--sidebar-text)" }}>{fmt.currency(trade.fee)}</td>
                                                <td className="p-4 text-right font-medium" style={{ color: "var(--body-text)" }}>{fmt.currency(trade.total_amount)}</td>
                                                <td className={cn("p-4 text-right font-semibold", trade.pnl == null ? "" : pnlPos ? "text-emerald-400" : "text-red-400")} style={trade.pnl == null ? { color: "var(--sidebar-text)" } : undefined}>
                                                    {trade.pnl == null ? "—" : fmt.currency(trade.pnl)}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {trade.pnl_pct != null ? (
                                                        <Badge variant="outline" className={cn("text-xs", pnlPos
                                                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                                            : "bg-red-500/15 text-red-400 border-red-500/30")}>
                                                            {fmt.pct(trade.pnl_pct)}
                                                        </Badge>
                                                    ) : "—"}
                                                </td>
                                                <td className="p-4 text-right text-xs" style={{ color: "var(--sidebar-text)" }}>{fmt.date(trade.trade_date)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
