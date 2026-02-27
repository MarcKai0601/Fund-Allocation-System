"use client";

import { useEffect, useState, useCallback } from "react";
import { portfolioApi, fmt, Portfolio } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Wallet, BarChart3, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [data, setData] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await portfolioApi.get();
      setData(res.data);
      setLastUpdated(new Date());
    } catch {
      // silently fail on polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const account = data?.account;

  const stats = [
    {
      label: "投入資金",
      value: fmt.currency(account?.total_deposited),
      icon: DollarSign,
      color: "text-sky-400",
      bg: "bg-sky-400/10",
    },
    {
      label: "可用資金",
      value: fmt.currency(account?.available_funds),
      icon: Wallet,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "持倉成本",
      value: fmt.currency(account?.total_invested),
      icon: BarChart3,
      color: "text-violet-400",
      bg: "bg-violet-400/10",
    },
    {
      label: "未實現損益",
      value: fmt.currency(data?.total_unrealized_pnl),
      sub: data?.total_unrealized_pnl != null ? fmt.pct((data.total_unrealized_pnl / (account?.total_invested ?? 1)) * 100) : undefined,
      icon: Activity,
      color:
        (data?.total_unrealized_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
      bg:
        (data?.total_unrealized_pnl ?? 0) >= 0 ? "bg-emerald-400/10" : "bg-red-400/10",
    },
    {
      label: "已實現損益",
      value: fmt.currency(account?.realized_pnl),
      sub: account?.realized_pnl != null && account?.total_deposited
        ? fmt.pct((account.realized_pnl / account.total_deposited) * 100)
        : undefined,
      icon: account?.realized_pnl != null && account.realized_pnl >= 0 ? TrendingUp : TrendingDown,
      color:
        (account?.realized_pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400",
      bg:
        (account?.realized_pnl ?? 0) >= 0 ? "bg-emerald-400/10" : "bg-red-400/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-emerald-400 w-8 h-8" />
      </div>
    );
  }

  if (!account?.is_initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Wallet className="w-16 h-16" style={{ color: "var(--sidebar-text)" }} />
        <h2 className="text-xl font-semibold" style={{ color: "var(--body-text)" }}>尚未初始化資金</h2>
        <p style={{ color: "var(--sidebar-text)" }}>請前往「資金管理」設定初始代操金額</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: "var(--body-text)" }}>總覽 Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "var(--sidebar-text)" }}>
            即時損益追蹤｜每 60 秒自動更新
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs" style={{ color: "var(--sidebar-text)" }}>
          <RefreshCw className="w-3 h-3" />
          上次更新：{lastUpdated?.toLocaleTimeString("zh-TW") ?? "—"}
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
            持股庫存
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.positions.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--sidebar-text)" }}>目前無持倉</p>
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="md:hidden space-y-3">
                {data?.positions.map((p) => {
                  const pnlPositive = (p.unrealized_pnl ?? 0) >= 0;
                  const changePositive = (p.change_pct ?? 0) >= 0;
                  return (
                    <div
                      key={p.symbol}
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "var(--sidebar-hover-bg)", border: "1px solid var(--card-border)" }}
                    >
                      {/* Stock name row */}
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-sm" style={{ color: "var(--body-text)" }}>{p.symbol}</span>
                          <span className="text-xs ml-1.5" style={{ color: "var(--sidebar-text)" }}>{p.name ?? ""}</span>
                        </div>
                        <Badge
                          className={cn(
                            "text-xs",
                            pnlPositive
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/15 text-red-400 border-red-500/30"
                          )}
                          variant="outline"
                        >
                          {fmt.pct(p.unrealized_pnl_pct)}
                        </Badge>
                      </div>
                      {/* Data grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span style={{ color: "var(--sidebar-text)" }}>庫存</span>
                          <span style={{ color: "var(--body-text)" }}>{p.quantity.toLocaleString()} 股</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--sidebar-text)" }}>現價</span>
                          <span className="font-medium" style={{ color: "var(--body-text)" }}>
                            {p.current_price != null ? fmt.currency(p.current_price) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--sidebar-text)" }}>均價</span>
                          <span style={{ color: "var(--body-text)" }}>{fmt.currency(p.avg_cost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--sidebar-text)" }}>漲跌</span>
                          <span className={cn("font-medium", changePositive ? "text-emerald-400" : "text-red-400")}>
                            {fmt.pct(p.change_pct)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--sidebar-text)" }}>市值</span>
                          <span style={{ color: "var(--body-text)" }}>{fmt.currency(p.market_value)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--sidebar-text)" }}>損益</span>
                          <span className={cn("font-semibold", pnlPositive ? "text-emerald-400" : "text-red-400")}>
                            {fmt.currency(p.unrealized_pnl)}
                          </span>
                        </div>
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
                      <th className="text-left pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>股票</th>
                      <th className="text-right pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>庫存(股)</th>
                      <th className="text-right pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>平均成本</th>
                      <th className="text-right pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>現價</th>
                      <th className="text-right pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>今日漲跌</th>
                      <th className="text-right pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>市值</th>
                      <th className="text-right pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>未實現損益</th>
                      <th className="text-right pb-3 font-medium text-xs" style={{ color: "var(--sidebar-text)" }}>報酬率</th>
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
                          <td className="py-3">
                            <div>
                              <p className="font-medium" style={{ color: "var(--body-text)" }}>{p.symbol}</p>
                              <p className="text-xs" style={{ color: "var(--sidebar-text)" }}>{p.name ?? "—"}</p>
                            </div>
                          </td>
                          <td className="py-3 text-right" style={{ color: "var(--sidebar-text)" }}>{p.quantity.toLocaleString()}</td>
                          <td className="py-3 text-right" style={{ color: "var(--sidebar-text)" }}>{fmt.currency(p.avg_cost)}</td>
                          <td className="py-3 text-right font-medium" style={{ color: "var(--body-text)" }}>
                            {p.current_price != null ? fmt.currency(p.current_price) : <span style={{ color: "var(--sidebar-text)" }}>—</span>}
                          </td>
                          <td className={cn("py-3 text-right font-medium", changePositive ? "text-emerald-400" : "text-red-400")}>
                            {fmt.pct(p.change_pct)}
                          </td>
                          <td className="py-3 text-right" style={{ color: "var(--sidebar-text)" }}>{fmt.currency(p.market_value)}</td>
                          <td className={cn("py-3 text-right font-semibold", pnlPositive ? "text-emerald-400" : "text-red-400")}>
                            {fmt.currency(p.unrealized_pnl)}
                          </td>
                          <td className="py-3 text-right">
                            <Badge
                              className={cn(
                                "text-xs",
                                pnlPositive
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : "bg-red-500/15 text-red-400 border-red-500/30"
                              )}
                              variant="outline"
                            >
                              {fmt.pct(p.unrealized_pnl_pct)}
                            </Badge>
                          </td>
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
