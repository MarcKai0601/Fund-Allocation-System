"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { tradesApi, stocksApi, fmt, Transaction, StockMaster } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const defaultForm = () => ({
    symbol: "",
    symbolDisplay: "",
    action: "BUY" as "BUY" | "SELL",
    price: "",
    quantity: "",
    fee: "",
    trade_date: new Date().toISOString().slice(0, 10),
    note: "",
});

export default function TradesPage() {
    const [trades, setTrades] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(defaultForm());
    const [submitting, setSubmitting] = useState(false);
    const [filterSymbol, setFilterSymbol] = useState("");

    // Autocomplete
    const [suggestions, setSuggestions] = useState<StockMaster[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const autocompleteRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async (sym?: string) => {
        try {
            const res = await tradesApi.list(sym);
            setTrades(res.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

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

    const selectStock = (s: StockMaster) => {
        setForm(f => ({ ...f, symbol: s.symbol, symbolDisplay: `${s.symbol} ${s.name}` }));
        setShowSuggestions(false);
    };

    const handleSubmit = async () => {
        if (!form.symbol || !form.price || !form.quantity) {
            toast.error("請填寫必要欄位");
            return;
        }
        setSubmitting(true);
        try {
            await tradesApi.create({
                symbol: form.symbol.split(" ")[0],
                action: form.action,
                price: Number(form.price),
                quantity: Number(form.quantity),
                fee: Number(form.fee) || 0,
                trade_date: form.trade_date,
                note: form.note,
            });
            toast.success(`${form.action === "BUY" ? "買入" : "賣出"}交易新增成功！`);
            setOpen(false);
            setForm(defaultForm());
            load();
        } catch (e: any) {
            toast.error(e?.response?.data?.detail ?? "交易失敗");
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = filterSymbol
        ? trades.filter(t => t.symbol.toLowerCase().includes(filterSymbol.toLowerCase()))
        : trades;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">交易紀錄</h1>
                    <p className="text-gray-400 text-sm mt-1">記錄每一筆買賣操作與計算損益</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            新增交易
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-white">新增交易</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                            {/* Stock Search */}
                            <div className="space-y-2" ref={autocompleteRef}>
                                <Label className="text-gray-300">股票代號 / 名稱</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="搜尋股票，例：台積電 or 2330"
                                        value={form.symbolDisplay}
                                        onChange={(e) => handleSymbolInput(e.target.value)}
                                        className="bg-gray-800 border-gray-700 text-white pl-9"
                                        onFocus={() => form.symbolDisplay && setSuggestions(suggestions)}
                                    />
                                    {showSuggestions && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                                            {suggestions.map((s) => (
                                                <button
                                                    key={s.symbol}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-colors"
                                                    onClick={() => selectStock(s)}
                                                >
                                                    <span className="text-emerald-400 font-medium text-sm">{s.symbol}</span>
                                                    <span className="text-white text-sm ml-2">{s.name}</span>
                                                    <span className="text-gray-500 text-xs ml-2">{s.sector}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action */}
                            <div className="space-y-2">
                                <Label className="text-gray-300">買賣方向</Label>
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
                                                    : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
                                            )}
                                        >
                                            {a === "BUY" ? "買入 BUY" : "賣出 SELL"}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-gray-300">成交價格</Label>
                                    <Input type="number" placeholder="800" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">股數</Label>
                                    <Input type="number" placeholder="1000" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">手續費</Label>
                                    <Input type="number" placeholder="0" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-300">交易日期</Label>
                                    <Input type="date" value={form.trade_date} onChange={e => setForm(f => ({ ...f, trade_date: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-300">備註</Label>
                                <Input placeholder="可選填" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="bg-gray-800 border-gray-700 text-white" />
                            </div>

                            {form.price && form.quantity && (
                                <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
                                    <span className="text-gray-400">預計{form.action === "BUY" ? "花費" : "收回"}：</span>
                                    <span className="text-white font-semibold ml-2">
                                        {fmt.currency(Number(form.price) * Number(form.quantity) + (form.action === "BUY" ? 1 : -1) * Number(form.fee || 0))}
                                    </span>
                                </div>
                            )}

                            <Button onClick={handleSubmit} disabled={submitting} className={cn("w-full", form.action === "BUY" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}>
                                {submitting ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : null}
                                確認{form.action === "BUY" ? "買入" : "賣出"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filter */}
            <div className="flex gap-3 items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="過濾股票代號..."
                        value={filterSymbol}
                        onChange={e => { setFilterSymbol(e.target.value); load(e.target.value || undefined); }}
                        className="bg-gray-900 border-gray-700 text-white pl-9 w-56"
                    />
                </div>
                <span className="text-gray-500 text-xs">{filtered.length} 筆紀錄</span>
            </div>

            {/* Trades Table */}
            <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-emerald-400 w-6 h-6" /></div>
                    ) : filtered.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-12">尚無交易紀錄</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-800 text-gray-400 text-xs">
                                        <th className="text-left p-4 font-medium">股票</th>
                                        <th className="text-center p-4 font-medium">方向</th>
                                        <th className="text-right p-4 font-medium">成交價</th>
                                        <th className="text-right p-4 font-medium">股數</th>
                                        <th className="text-right p-4 font-medium">手續費</th>
                                        <th className="text-right p-4 font-medium">總金額</th>
                                        <th className="text-right p-4 font-medium">已實現損益</th>
                                        <th className="text-right p-4 font-medium">報酬率</th>
                                        <th className="text-right p-4 font-medium">日期</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((t) => {
                                        const isBuy = t.action === "BUY";
                                        const pnlPos = (t.pnl ?? 0) >= 0;
                                        return (
                                            <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                                <td className="p-4">
                                                    <span className="font-semibold text-white">{t.symbol}</span>
                                                    {t.note && <p className="text-gray-500 text-xs mt-0.5">{t.note}</p>}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn("text-xs", isBuy
                                                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                                            : "bg-red-500/15 text-red-400 border-red-500/30")}
                                                    >
                                                        {isBuy ? "買入" : "賣出"}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-right text-gray-300">{fmt.currency(t.price)}</td>
                                                <td className="p-4 text-right text-gray-300">{t.quantity.toLocaleString()}</td>
                                                <td className="p-4 text-right text-gray-400">{fmt.currency(t.fee)}</td>
                                                <td className="p-4 text-right font-medium text-white">{fmt.currency(t.total_amount)}</td>
                                                <td className={cn("p-4 text-right font-semibold", t.pnl == null ? "text-gray-600" : pnlPos ? "text-emerald-400" : "text-red-400")}>
                                                    {t.pnl == null ? "—" : fmt.currency(t.pnl)}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {t.pnl_pct != null ? (
                                                        <Badge variant="outline" className={cn("text-xs", pnlPos
                                                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                                            : "bg-red-500/15 text-red-400 border-red-500/30")}>
                                                            {fmt.pct(t.pnl_pct)}
                                                        </Badge>
                                                    ) : "—"}
                                                </td>
                                                <td className="p-4 text-right text-gray-400 text-xs">{fmt.date(t.trade_date)}</td>
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
