"use client";

import { useEffect, useState, useCallback } from "react";
import { fundsApi, portfolioApi, fmt, getErrorMsg, PortfolioInfo, FundLedgerEntry } from "@/lib/api";
import { usePortfolioStore } from "@/lib/portfolio-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Wallet, Lock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function FundsPage() {
    const { t } = useTranslation();
    const [portfolio, setPortfolio] = useState<PortfolioInfo | null>(null);
    const [ledger, setLedger] = useState<FundLedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [depositOpen, setDepositOpen] = useState(false);
    const [initOpen, setInitOpen] = useState(false);

    const [depositForm, setDepositForm] = useState({ amount: "", note: "", trade_date: "" });
    const [initForm, setInitForm] = useState({ amount: "", note: "", trade_date: "" });
    const [submitting, setSubmitting] = useState(false);

    const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId);

    const load = useCallback(async () => {
        if (!activePortfolioId) { setLoading(false); return; }
        try {
            const [ledRes, overviewRes] = await Promise.all([
                fundsApi.getLedger(activePortfolioId),
                portfolioApi.get(activePortfolioId),
            ]);
            setLedger(ledRes.data);
            setPortfolio(overviewRes.data.portfolio);
        } finally {
            setLoading(false);
        }
    }, [activePortfolioId]);

    useEffect(() => { setLoading(true); load(); }, [load]);

    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        setDepositForm(f => ({ ...f, trade_date: f.trade_date || today }));
        setInitForm(f => ({ ...f, trade_date: f.trade_date || today }));
    }, []);

    const reloadLedger = async () => {
        if (!activePortfolioId) return;
        try {
            const res = await fundsApi.getLedger(activePortfolioId);
            setLedger(res.data);
        } catch { /* ignore */ }
    };

    const handleInit = async () => {
        if (!initForm.amount || !activePortfolioId) return;
        setSubmitting(true);
        try {
            const res = await fundsApi.init(activePortfolioId, { amount: Number(initForm.amount), note: initForm.note, trade_date: initForm.trade_date });
            toast.success(t("funds.toast.initSuccess", { defaultValue: "初始資金設定成功！" }));
            setInitOpen(false);
            setPortfolio(res.data);
            reloadLedger();
        } catch (e: any) {
            toast.error(getErrorMsg(e, t("funds.toast.initFailed", { defaultValue: "設定失敗" })));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeposit = async () => {
        if (!depositForm.amount || !activePortfolioId) return;
        setSubmitting(true);
        try {
            const res = await fundsApi.deposit(activePortfolioId, { amount: Number(depositForm.amount), note: depositForm.note, trade_date: depositForm.trade_date });
            toast.success(t("funds.toast.depositSuccess", { defaultValue: "增資成功！" }));
            setDepositOpen(false);
            setDepositForm({ amount: "", note: "", trade_date: new Date().toISOString().slice(0, 10) });
            setPortfolio(res.data);
            reloadLedger();
        } catch (e: any) {
            toast.error(getErrorMsg(e, t("funds.toast.depositFailed", { defaultValue: "增資失敗" })));
        } finally {
            setSubmitting(false);
        }
    };

    const typeLabel: Record<string, string> = { INIT: t("funds.type.init"), DEPOSIT: t("funds.type.deposit"), WITHDRAW: t("funds.type.withdraw") };
    const typeColor: Record<string, string> = {
        INIT: "bg-violet-500/15 text-violet-400 border-violet-500/30",
        DEPOSIT: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        WITHDRAW: "bg-red-500/15 text-red-400 border-red-500/30",
    };

    if (!activePortfolioId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Wallet className="w-16 h-16" style={{ color: "var(--sidebar-text)" }} />
                <h2 className="text-xl font-semibold" style={{ color: "var(--body-text)" }}>{t("funds.selectAccount", "請選擇代操帳戶")}</h2>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold" style={{ color: "var(--body-text)" }}>{t("funds.title")}</h1>
                    <p className="text-sm mt-1" style={{ color: "var(--sidebar-text)" }}>{t("funds.subtitle")}</p>
                </div>
                <div className="flex gap-3">
                    {!portfolio?.is_initialized && (
                        <Dialog open={initOpen} onOpenChange={setInitOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                                    <Wallet className="w-4 h-4 mr-2" />{t("funds.setInitialFund")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                                <DialogHeader><DialogTitle style={{ color: "var(--body-text)" }}>{t("funds.initFundTitle")}</DialogTitle></DialogHeader>
                                <div className="space-y-4 mt-4">
                                    <div className="space-y-2"><Label style={{ color: "var(--sidebar-text)" }}>{t("funds.amount")}</Label><Input type="number" placeholder="300000" value={initForm.amount} onChange={(e) => setInitForm(f => ({ ...f, amount: e.target.value }))} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)" }} /></div>
                                    <div className="space-y-2"><Label style={{ color: "var(--sidebar-text)" }}>{t("funds.date")}</Label><Input type="date" value={initForm.trade_date} onChange={(e) => setInitForm(f => ({ ...f, trade_date: e.target.value }))} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)" }} /></div>
                                    <div className="space-y-2"><Label style={{ color: "var(--sidebar-text)" }}>{t("funds.note")}</Label><Input placeholder={t("funds.notePlaceholder")} value={initForm.note} onChange={(e) => setInitForm(f => ({ ...f, note: e.target.value }))} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)" }} /></div>
                                    <p className="text-xs text-amber-400 flex gap-2"><Lock className="w-3 h-3 mt-0.5 shrink-0" />{t("funds.initWarning")}</p>
                                    <Button onClick={handleInit} disabled={submitting} className="w-full bg-violet-600 hover:bg-violet-700 text-white">{submitting ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : null}{t("funds.confirmInit")}</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    {portfolio?.is_initialized && (
                        <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="w-4 h-4 mr-2" />{t("funds.addFund")}</Button>
                            </DialogTrigger>
                            <DialogContent style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                                <DialogHeader><DialogTitle style={{ color: "var(--body-text)" }}>{t("funds.depositFundTitle")}</DialogTitle></DialogHeader>
                                <div className="space-y-4 mt-4">
                                    <div className="space-y-2"><Label style={{ color: "var(--sidebar-text)" }}>{t("funds.amount")}</Label><Input type="number" placeholder="50000" value={depositForm.amount} onChange={(e) => setDepositForm(f => ({ ...f, amount: e.target.value }))} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)" }} /></div>
                                    <div className="space-y-2"><Label style={{ color: "var(--sidebar-text)" }}>{t("funds.date")}</Label><Input type="date" value={depositForm.trade_date} onChange={(e) => setDepositForm(f => ({ ...f, trade_date: e.target.value }))} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)" }} /></div>
                                    <div className="space-y-2"><Label style={{ color: "var(--sidebar-text)" }}>{t("funds.note")}</Label><Input placeholder={t("funds.notePlaceholder")} value={depositForm.note} onChange={(e) => setDepositForm(f => ({ ...f, note: e.target.value }))} style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)" }} /></div>
                                    <Button onClick={handleDeposit} disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">{submitting ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : null}{t("funds.confirmDeposit")}</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {portfolio && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {[
                        { label: t("funds.investedAmount"), value: fmt.currency(portfolio.total_deposited), color: "text-sky-400" },
                        { label: t("funds.availableAmount"), value: fmt.currency(portfolio.available_funds), color: "text-emerald-400" },
                    ].map(({ label, value, color }) => (
                        <Card key={label} style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                            <CardContent className="p-3 md:p-5">
                                <p className="text-xs mb-1 md:mb-2" style={{ color: "var(--sidebar-text)" }}>{label}</p>
                                <p className={cn("text-base md:text-xl font-bold", color)}>{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Card style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                <CardHeader><CardTitle className="text-base font-semibold" style={{ color: "var(--body-text)" }}>{t("funds.transactionHistory")}</CardTitle></CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-emerald-400 w-6 h-6" /></div>
                    ) : ledger.length === 0 ? (
                        <p className="text-sm text-center py-8" style={{ color: "var(--sidebar-text)" }}>{t("funds.emptyHistory")}</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                                    <th className="text-left pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("funds.table.type")}</th>
                                    <th className="text-right pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("funds.table.amount")}</th>
                                    <th className="text-left pb-3 font-medium text-xs pl-6" style={{ color: "var(--sidebar-text)" }}>{t("funds.table.date")}</th>
                                    <th className="text-left pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("funds.table.note")}</th>
                                    <th className="text-right pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>{t("funds.table.createdAt")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map((row) => (
                                    <tr key={row.id} className="transition-colors" style={{ borderBottom: "1px solid var(--table-row-border)" }}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--table-row-hover)")}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                                    >
                                        <td className="py-3"><Badge variant="outline" className={cn("text-xs", typeColor[row.type])}>{typeLabel[row.type]}</Badge></td>
                                        <td className="py-3 text-right font-semibold" style={{ color: "var(--body-text)" }}>{fmt.currency(row.amount)}</td>
                                        <td className="py-3 pl-6" style={{ color: "var(--sidebar-text)" }}>{fmt.date(row.trade_date)}</td>
                                        <td className="py-3" style={{ color: "var(--sidebar-text)" }}>{row.note ?? "—"}</td>
                                        <td className="py-3 text-right text-xs" style={{ color: "var(--sidebar-text)" }}>{fmt.date(row.created_at)}</td>
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
