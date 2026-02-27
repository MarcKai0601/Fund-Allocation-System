"use client";

import { useEffect, useState, useCallback } from "react";
import { fundsApi, fmt, Account, FundLedgerEntry } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Wallet, Lock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FundsPage() {
    const [account, setAccount] = useState<Account | null>(null);
    const [ledger, setLedger] = useState<FundLedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [depositOpen, setDepositOpen] = useState(false);
    const [initOpen, setInitOpen] = useState(false);

    const [depositForm, setDepositForm] = useState({ amount: "", note: "", trade_date: "" });
    const [initForm, setInitForm] = useState({ amount: "", note: "", trade_date: "" });
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            const [accRes, ledRes] = await Promise.all([fundsApi.getAccount(), fundsApi.getLedger()]);
            setAccount(accRes.data);
            setLedger(ledRes.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Hydration-safe: 在 client mount 後才設定今天日期，避免 SSR/CSR 不一致
    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        setDepositForm(f => ({ ...f, trade_date: f.trade_date || today }));
        setInitForm(f => ({ ...f, trade_date: f.trade_date || today }));
    }, []);

    const handleInit = async () => {
        if (!initForm.amount) return;
        setSubmitting(true);
        try {
            await fundsApi.init({ amount: Number(initForm.amount), note: initForm.note, trade_date: initForm.trade_date });
            toast.success("初始資金設定成功！");
            setInitOpen(false);
            load();
        } catch (e: any) {
            toast.error(e?.response?.data?.detail ?? "設定失敗");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeposit = async () => {
        if (!depositForm.amount) return;
        setSubmitting(true);
        try {
            await fundsApi.deposit({ amount: Number(depositForm.amount), note: depositForm.note, trade_date: depositForm.trade_date });
            toast.success("增資成功！");
            setDepositOpen(false);
            setDepositForm({ amount: "", note: "", trade_date: new Date().toISOString().slice(0, 10) }); // client-only: 此處已在 useEffect callback 中，安全
            load();
        } catch (e: any) {
            toast.error(e?.response?.data?.detail ?? "增資失敗");
        } finally {
            setSubmitting(false);
        }
    };

    const typeLabel: Record<string, string> = { INIT: "初始資金", DEPOSIT: "增資", WITHDRAW: "提款" };
    const typeColor: Record<string, string> = {
        INIT: "bg-violet-500/15 text-violet-400 border-violet-500/30",
        DEPOSIT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        WITHDRAW: "bg-red-500/15 text-red-400 border-red-500/30",
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">資金管理</h1>
                    <p className="text-gray-400 text-sm mt-1">管理代操資金入金與異動紀錄</p>
                </div>
                <div className="flex gap-3">
                    {!account?.is_initialized && (
                        <Dialog open={initOpen} onOpenChange={setInitOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                                    <Wallet className="w-4 h-4 mr-2" />
                                    設定初始資金
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-900 border-gray-700">
                                <DialogHeader>
                                    <DialogTitle className="text-white">設定初始代操資金</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">金額 (TWD)</Label>
                                        <Input
                                            type="number"
                                            placeholder="300000"
                                            value={initForm.amount}
                                            onChange={(e) => setInitForm(f => ({ ...f, amount: e.target.value }))}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">日期</Label>
                                        <Input
                                            type="date"
                                            value={initForm.trade_date}
                                            onChange={(e) => setInitForm(f => ({ ...f, trade_date: e.target.value }))}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">備註</Label>
                                        <Input
                                            placeholder="可選填"
                                            value={initForm.note}
                                            onChange={(e) => setInitForm(f => ({ ...f, note: e.target.value }))}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <p className="text-xs text-amber-400 flex gap-2">
                                        <Lock className="w-3 h-3 mt-0.5 shrink-0" />
                                        初始資金設定後不可修改，後續增資請使用「新增資金」
                                    </p>
                                    <Button onClick={handleInit} disabled={submitting} className="w-full bg-violet-600 hover:bg-violet-700">
                                        {submitting ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : null}
                                        確認設定
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    {account?.is_initialized && (
                        <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Plus className="w-4 h-4 mr-2" />
                                    新增資金
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-900 border-gray-700">
                                <DialogHeader>
                                    <DialogTitle className="text-white">新增資金（增資）</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">金額 (TWD)</Label>
                                        <Input
                                            type="number"
                                            placeholder="50000"
                                            value={depositForm.amount}
                                            onChange={(e) => setDepositForm(f => ({ ...f, amount: e.target.value }))}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">日期</Label>
                                        <Input
                                            type="date"
                                            value={depositForm.trade_date}
                                            onChange={(e) => setDepositForm(f => ({ ...f, trade_date: e.target.value }))}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">備註</Label>
                                        <Input
                                            placeholder="可選填"
                                            value={depositForm.note}
                                            onChange={(e) => setDepositForm(f => ({ ...f, note: e.target.value }))}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <Button onClick={handleDeposit} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                        {submitting ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : null}
                                        確認入金
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* Account summary */}
            {account && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "總入金", value: fmt.currency(account.total_deposited), color: "text-sky-400" },
                        { label: "可用資金", value: fmt.currency(account.available_funds), color: "text-emerald-400" },
                        { label: "持倉成本", value: fmt.currency(account.total_invested), color: "text-violet-400" },
                        { label: "已實現損益", value: fmt.currency(account.realized_pnl), color: account.realized_pnl >= 0 ? "text-emerald-400" : "text-red-400" },
                    ].map(({ label, value, color }) => (
                        <Card key={label} className="bg-gray-900 border-gray-800">
                            <CardContent className="p-5">
                                <p className="text-gray-400 text-xs mb-2">{label}</p>
                                <p className={cn("text-xl font-bold", color)}>{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Ledger table */}
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-white">資金異動明細</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-emerald-400 w-6 h-6" /></div>
                    ) : ledger.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">尚無資金紀錄</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-400 text-xs">
                                    <th className="text-left pb-3 font-medium">類型</th>
                                    <th className="text-right pb-3 font-medium">金額</th>
                                    <th className="text-left pb-3 font-medium pl-6">日期</th>
                                    <th className="text-left pb-3 font-medium">備註</th>
                                    <th className="text-right pb-3 font-medium">建立時間</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map((row) => (
                                    <tr key={row.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                        <td className="py-3">
                                            <Badge variant="outline" className={cn("text-xs", typeColor[row.type])}>
                                                {typeLabel[row.type]}
                                            </Badge>
                                        </td>
                                        <td className="py-3 text-right font-semibold text-white">{fmt.currency(row.amount)}</td>
                                        <td className="py-3 pl-6 text-gray-300">{fmt.date(row.trade_date)}</td>
                                        <td className="py-3 text-gray-400">{row.note ?? "—"}</td>
                                        <td className="py-3 text-right text-gray-500 text-xs">{fmt.date(row.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
