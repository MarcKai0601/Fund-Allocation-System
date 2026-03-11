"use client";

import { useEffect, useState, useCallback } from "react";
import { portfolioApi, fmt, PortfolioOverview } from "@/lib/api";
import { usePortfolioStore } from "@/lib/portfolio-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Wallet, BarChart3, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function DashboardPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PortfolioOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const activePortfolioId = usePortfolioStore((s) => s.activePortfolioId);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    if (!activePortfolioId) { setLoading(false); return; }
    try {
      const res = await portfolioApi.get(activePortfolioId);
      setData(res.data);
      setLastUpdated(new Date());
    } catch {
      // silently fail on polling
    } finally {
      setLoading(false);
    }
  }, [activePortfolioId]);

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const pf = data?.portfolio;

  const stats = [
    {
      label: t('dashboard.investedAmount'),
      value: fmt.currency(pf?.total_deposited),
      icon: DollarSign,
      color: "text-sky-400",
      bg: "bg-sky-400/10",
    },
    {
      label: t('dashboard.availableAmount'),
      value: fmt.currency(pf?.available_funds),
      icon: Wallet,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: t('dashboard.investedCost'),
      value: fmt.currency(pf?.total_invested),
      icon: BarChart3,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
    },
    {
      label: t('dashboard.unrealizedPnl'),
      value: fmt.currency(data?.total_unrealized_pnl),
      sub: data?.total_unrealized_pnl != null ? fmt.pct((data.total_unrealized_pnl / (pf?.total_invested ?? 1)) * 100) : undefined,
      icon: Activity,
      color:
        (data?.total_unrealized_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
      bg:
        (data?.total_unrealized_pnl ?? 0) >= 0 ? "bg-emerald-400/10" : "bg-red-400/10",
    },
    {
      label: t('dashboard.realizedPnl'),
      value: fmt.currency(pf?.realized_pnl),
      sub: pf?.realized_pnl != null && pf?.total_deposited
        ? fmt.pct((pf.realized_pnl / pf.total_deposited) * 100)
        : undefined,
      icon: pf?.realized_pnl != null && pf.realized_pnl >= 0 ? TrendingUp : TrendingDown,
      color:
        (pf?.realized_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
      bg:
        (pf?.realized_pnl ?? 0) >= 0 ? "bg-emerald-400/10" : "bg-red-400/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-emerald-400 w-8 h-8" />
      </div>
    );
  }

  if (!activePortfolioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Wallet className="w-16 h-16" style={{ color: "var(--sidebar-text)" }} />
        <h2 className="text-xl font-semibold" style={{ color: "var(--body-text)" }}>{t('dashboard.selectAccount')}</h2>
        <p style={{ color: "var(--sidebar-text)" }}>{t('dashboard.selectAccountDesc')}</p>
      </div>
    );
  }

  if (!pf?.is_initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Wallet className="w-16 h-16" style={{ color: "var(--sidebar-text)" }} />
        <h2 className="text-xl font-semibold" style={{ color: "var(--body-text)" }}>{t('dashboard.emptyState.title')}</h2>
        <p style={{ color: "var(--sidebar-text)" }}>{t('dashboard.emptyState.description')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: "var(--body-text)" }}>{t('dashboard.title')}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--sidebar-text)" }}>
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: "var(--sidebar-text)" }}>
          <RefreshCw className="w-3 h-3" />
          {t('dashboard.lastUpdated')}{mounted && lastUpdated ? lastUpdated.toTimeString().slice(0, 8) : "—"}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4">
        {stats.map((s) => (
          <Card key={s.label} style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <CardContent className="p-3 md:p-5">
              <div className="flex items-start justify-between mb-2 md:mb-3">
                <p className="text-xs font-medium" style={{ color: "var(--sidebar-text)" }}>{s.label}</p>
                <div className={cn("p-1 md:p-1.5 rounded-lg", s.bg)}>
                  <s.icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4", s.color)} />
                </div>
              </div>
              <p className={cn("text-base md:text-lg font-bold", s.color)}>{s.value}</p>
              {s.sub && <p className="text-xs mt-1" style={{ color: "var(--sidebar-text)" }}>{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Holdings */}
      <Card style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base font-semibold" style={{ color: "var(--body-text)" }}>
            {t('dashboard.holdings')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.positions.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--sidebar-text)" }}>{t('dashboard.emptyHoldings')}</p>
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="md:hidden space-y-3">
                {data?.positions.map((p) => {
                  const pnlPositive = (p.unrealized_pnl ?? 0) >= 0;
                  const changePositive = (p.change_pct ?? 0) >= 0;
                  return (
                    <div key={p.symbol} className="rounded-lg p-3" style={{ backgroundColor: "var(--sidebar-hover-bg)", border: "1px solid var(--card-border)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-sm" style={{ color: "var(--body-text)" }}>{p.symbol}</span>
                          <span className="text-xs ml-1.5" style={{ color: "var(--sidebar-text)" }}>{p.name ?? ""}</span>
                        </div>
                        <Badge className={cn("text-xs", pnlPositive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30")} variant="outline">
                          {fmt.pct(p.unrealized_pnl_pct)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div className="flex justify-between"><span style={{ color: "var(--sidebar-text)" }}>{t('dashboard.table.inventory')}</span><span style={{ color: "var(--body-text)" }}>{p.quantity.toLocaleString()} {t('trades.shares', { defaultValue: '股' })}</span></div>
                        <div className="flex justify-between"><span style={{ color: "var(--sidebar-text)" }}>{t('dashboard.table.currentPrice')}</span><span className="font-medium" style={{ color: "var(--body-text)" }}>{p.current_price != null ? fmt.currency(p.current_price) : "—"}</span></div>
                        <div className="flex justify-between"><span style={{ color: "var(--sidebar-text)" }}>{t('dashboard.table.avgCost')}</span><span style={{ color: "var(--body-text)" }}>{fmt.currency(p.avg_cost)}</span></div>
                        <div className="flex justify-between"><span style={{ color: "var(--sidebar-text)" }}>{t('dashboard.table.change')}</span><span className={cn("font-medium", changePositive ? "text-emerald-400" : "text-red-400")}>{fmt.pct(p.change_pct)}</span></div>
                        <div className="flex justify-between"><span style={{ color: "var(--sidebar-text)" }}>{t('dashboard.table.marketValue')}</span><span style={{ color: "var(--body-text)" }}>{fmt.currency(p.market_value)}</span></div>
                        <div className="flex justify-between"><span style={{ color: "var(--sidebar-text)" }}>{t('dashboard.table.pnl')}</span><span className={cn("font-semibold", pnlPositive ? "text-emerald-400" : "text-red-400")}>{fmt.currency(p.unrealized_pnl)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                      {[t('dashboard.table.stock'), t('dashboard.table.shares'), t('dashboard.table.cost'), t('dashboard.table.currentPrice'), t('dashboard.table.todayChange'), t('dashboard.table.marketValue'), t('dashboard.table.unrealizedPnl'), t('dashboard.table.roi')].map((h, i) => (
                        <th key={h} className={cn("pb-3 font-medium text-xs", i === 0 ? "text-left" : "text-right")} style={{ color: "var(--sidebar-text)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.positions.map((p) => {
                      const pnlPositive = (p.unrealized_pnl ?? 0) >= 0;
                      const changePositive = (p.change_pct ?? 0) >= 0;
                      return (
                        <tr key={p.symbol} className="transition-colors" style={{ borderBottom: "1px solid var(--table-row-border)" }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--table-row-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <td className="py-3"><p className="font-medium" style={{ color: "var(--body-text)" }}>{p.symbol}</p><p className="text-xs" style={{ color: "var(--sidebar-text)" }}>{p.name ?? "—"}</p></td>
                          <td className="py-3 text-right" style={{ color: "var(--sidebar-text)" }}>{p.quantity.toLocaleString()}</td>
                          <td className="py-3 text-right" style={{ color: "var(--sidebar-text)" }}>{fmt.currency(p.avg_cost)}</td>
                          <td className="py-3 text-right font-medium" style={{ color: "var(--body-text)" }}>{p.current_price != null ? fmt.currency(p.current_price) : "—"}</td>
                          <td className={cn("py-3 text-right font-medium", changePositive ? "text-emerald-400" : "text-red-400")}>{fmt.pct(p.change_pct)}</td>
                          <td className="py-3 text-right" style={{ color: "var(--sidebar-text)" }}>{fmt.currency(p.market_value)}</td>
                          <td className={cn("py-3 text-right font-semibold", pnlPositive ? "text-emerald-400" : "text-red-400")}>{fmt.currency(p.unrealized_pnl)}</td>
                          <td className="py-3 text-right"><Badge className={cn("text-xs", pnlPositive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30")} variant="outline">{fmt.pct(p.unrealized_pnl_pct)}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
