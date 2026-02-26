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
  const totalAssets =
    (account?.available_funds ?? 0) + (data?.total_market_value ?? 0);

  const stats = [
    {
      label: "總資產",
      value: fmt.currency(totalAssets),
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
        <Wallet className="w-16 h-16 text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-300">尚未初始化資金</h2>
        <p className="text-gray-500">請前往「資金管理」設定初始代操金額</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">總覽 Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            即時損益追蹤｜每 60 秒自動更新
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <RefreshCw className="w-3 h-3" />
          上次更新：{lastUpdated?.toLocaleTimeString("zh-TW") ?? "—"}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-gray-900 border-gray-800">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-gray-400 text-xs font-medium">{s.label}</p>
                <div className={cn("p-1.5 rounded-lg", s.bg)}>
                  <s.icon className={cn("w-4 h-4", s.color)} />
                </div>
              </div>
              <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
              {s.sub && <p className="text-xs text-gray-500 mt-1">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Holdings Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-white">
            持股庫存
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.positions.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">目前無持倉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs">
                    <th className="text-left pb-3 font-medium">股票</th>
                    <th className="text-right pb-3 font-medium">庫存(股)</th>
                    <th className="text-right pb-3 font-medium">平均成本</th>
                    <th className="text-right pb-3 font-medium">現價</th>
                    <th className="text-right pb-3 font-medium">今日漲跌</th>
                    <th className="text-right pb-3 font-medium">市值</th>
                    <th className="text-right pb-3 font-medium">未實現損益</th>
                    <th className="text-right pb-3 font-medium">報酬率</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.positions.map((p) => {
                    const pnlPositive = (p.unrealized_pnl ?? 0) >= 0;
                    const changePositive = (p.change_pct ?? 0) >= 0;
                    return (
                      <tr key={p.symbol} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="py-3">
                          <div>
                            <p className="font-medium text-white">{p.symbol}</p>
                            <p className="text-gray-500 text-xs">{p.name ?? "—"}</p>
                          </div>
                        </td>
                        <td className="py-3 text-right text-gray-300">{p.quantity.toLocaleString()}</td>
                        <td className="py-3 text-right text-gray-300">{fmt.currency(p.avg_cost)}</td>
                        <td className="py-3 text-right font-medium text-white">
                          {p.current_price != null ? fmt.currency(p.current_price) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className={cn("py-3 text-right font-medium", changePositive ? "text-emerald-400" : "text-red-400")}>
                          {fmt.pct(p.change_pct)}
                        </td>
                        <td className="py-3 text-right text-gray-300">{fmt.currency(p.market_value)}</td>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
