"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, BookOpen, ArrowLeftRight, TrendingUp,
    Sun, Moon, ALargeSmall, Menu, X, Plus, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";
import { usePortfolioStore, PortfolioInfo } from "@/lib/portfolio-store";
import { useAuthStore } from "@/lib/auth-store";
import { portfoliosApi, devApi, getErrorMsg } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const nav = [
    { href: "/", label: "總覽 Dashboard", icon: LayoutDashboard },
    { href: "/funds", label: "資金管理", icon: BookOpen },
    { href: "/trades", label: "交易紀錄", icon: ArrowLeftRight },
];

type FontSize = "md" | "lg" | "xl";
const fontLabels: Record<FontSize, string> = { md: "A", lg: "A+", xl: "A++" };

export default function Sidebar() {
    const pathname = usePathname();
    const { setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [fontSize, setFontSize] = useState<FontSize>("md");
    const [mobileOpen, setMobileOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);

    const token = useAuthStore((s) => s.token);
    const setToken = useAuthStore((s) => s.setToken);
    const { portfolios, activePortfolioId, setPortfolios, setActive } = usePortfolioStore();

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        const saved = localStorage.getItem("font-size") as FontSize | null;
        if (saved && ["md", "lg", "xl"].includes(saved)) {
            setFontSize(saved);
            document.documentElement.setAttribute("data-font", saved);
        }
    }, []);

    useEffect(() => { setMobileOpen(false); }, [pathname]);

    useEffect(() => {
        if (mobileOpen) { document.body.style.overflow = "hidden"; }
        else { document.body.style.overflow = ""; }
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    // DEV auto-login: 尚無 Token 時自動呼叫 dev/login 取得測試 Token
    useEffect(() => {
        if (token) return;
        devApi.login().then((res) => {
            setToken(res.data.token);
            console.log("[DEV] Auto-login OK:", res.data.user_id);
        }).catch(() => {
            console.warn("[DEV] Auto-login failed — backend may not be running");
        });
    }, [token, setToken]);

    // Fetch portfolios when token is available
    const fetchPortfolios = useCallback(async () => {
        if (!token) return;
        try {
            const res = await portfoliosApi.list();
            setPortfolios(res.data);
        } catch { /* ignore */ }
    }, [token, setPortfolios]);

    useEffect(() => { fetchPortfolios(); }, [fetchPortfolios]);

    const cycleFontSize = () => {
        const order: FontSize[] = ["md", "lg", "xl"];
        const next = order[(order.indexOf(fontSize) + 1) % order.length];
        setFontSize(next);
        document.documentElement.setAttribute("data-font", next);
        localStorage.setItem("font-size", next);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            await portfoliosApi.create({ name: newName.trim() });
            toast.success("代操帳戶建立成功！");
            setCreateOpen(false);
            setNewName("");
            fetchPortfolios();
        } catch (e: any) {
            toast.error(getErrorMsg(e, "建立失敗"));
        } finally {
            setCreating(false);
        }
    };

    const isDark = resolvedTheme === "dark";
    const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);

    const portfolioSwitcher = (
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
            <p className="text-xs mb-1.5 font-medium" style={{ color: "var(--sidebar-text)" }}>代操帳戶</p>
            <div className="relative">
                <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors border"
                    style={{
                        backgroundColor: "var(--sidebar-hover-bg)",
                        color: "var(--sidebar-hover-text)",
                        borderColor: "var(--sidebar-border)",
                    }}
                >
                    <span className="truncate">{activePortfolio?.name ?? "選擇帳戶"}</span>
                    <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", dropdownOpen && "rotate-180")} />
                </button>
                {dropdownOpen && (
                    <div
                        className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto"
                        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
                    >
                        {portfolios.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => { setActive(p.id); setDropdownOpen(false); }}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm transition-colors",
                                    p.id === activePortfolioId && "font-semibold"
                                )}
                                style={{
                                    color: p.id === activePortfolioId ? "var(--sidebar-active-text)" : "var(--body-text)",
                                    backgroundColor: p.id === activePortfolioId ? "var(--sidebar-active-bg)" : "transparent",
                                }}
                                onMouseEnter={(e) => { if (p.id !== activePortfolioId) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sidebar-hover-bg)"; }}
                                onMouseLeave={(e) => { if (p.id !== activePortfolioId) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                            >
                                {p.name}
                            </button>
                        ))}
                        <button
                            onClick={() => { setDropdownOpen(false); setCreateOpen(true); }}
                            className="w-full text-left px-3 py-2 text-sm flex items-center gap-1.5 text-emerald-400 transition-colors"
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sidebar-hover-bg)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            新增代操帳戶
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="px-6 py-6 flex items-center gap-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="font-bold text-sm leading-tight" style={{ color: "var(--sidebar-hover-text)" }}>代操系統</p>
                    <p className="text-xs" style={{ color: "var(--sidebar-text)" }}>Fund Allocation</p>
                </div>
                <button
                    className="ml-auto md:hidden p-1 rounded-lg transition-colors"
                    style={{ color: "var(--sidebar-text)" }}
                    onClick={() => setMobileOpen(false)}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Portfolio Switcher */}
            {portfolioSwitcher}

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {nav.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                            style={{
                                backgroundColor: isActive ? "var(--sidebar-active-bg)" : "transparent",
                                color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                                fontWeight: isActive ? 500 : 400,
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sidebar-hover-bg)";
                                    (e.currentTarget as HTMLElement).style.color = "var(--sidebar-hover-text)";
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                                    (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)";
                                }
                            }}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Controls */}
            <div className="px-4 py-4 space-y-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
                <div className="flex items-center gap-2">
                    <button
                        onClick={cycleFontSize}
                        title="調整字體大小"
                        className={cn("flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", "border")}
                        style={{ backgroundColor: "var(--sidebar-hover-bg)", color: "var(--sidebar-text)", borderColor: "var(--sidebar-border)" }}
                    >
                        <ALargeSmall className="w-3.5 h-3.5 shrink-0" />
                        字體：{mounted ? fontLabels[fontSize] : "A"}
                    </button>
                    <button
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        title={mounted ? (isDark ? "切換淺色模式" : "切換深色模式") : "切換主題"}
                        className="p-2 rounded-lg transition-colors border"
                        style={{ backgroundColor: "var(--sidebar-hover-bg)", color: "var(--sidebar-text)", borderColor: "var(--sidebar-border)" }}
                    >
                        {mounted ? (isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <Sun className="w-4 h-4" />}
                    </button>
                </div>
                <p className="text-xs" style={{ color: "var(--sidebar-text)", opacity: 0.6 }}>
                    台股代操管理平台 v4.0.0
                </p>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile top bar */}
            <div
                className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center px-4 py-3 gap-3"
                style={{ backgroundColor: "var(--sidebar-bg)", borderBottom: "1px solid var(--sidebar-border)" }}
            >
                <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--sidebar-text)" }}>
                    <Menu className="w-6 h-6" />
                </button>
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <p className="font-bold text-sm truncate" style={{ color: "var(--sidebar-hover-text)" }}>
                    {activePortfolio?.name ?? "代操系統"}
                </p>
            </div>

            {/* Mobile overlay */}
            {mobileOpen && <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileOpen(false)} />}

            {/* Mobile drawer */}
            <aside
                className={cn("md:hidden fixed top-0 left-0 h-full w-72 z-50 flex flex-col transition-transform duration-300 ease-in-out", mobileOpen ? "translate-x-0" : "-translate-x-full")}
                style={{ backgroundColor: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
            >
                {sidebarContent}
            </aside>

            {/* Desktop sidebar */}
            <aside
                className="hidden md:flex w-64 min-h-screen flex-col transition-colors duration-200"
                style={{ backgroundColor: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
            >
                {sidebarContent}
            </aside>

            {/* Create portfolio modal */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                    <DialogHeader>
                        <DialogTitle style={{ color: "var(--body-text)" }}>新增代操帳戶</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Label style={{ color: "var(--sidebar-text)" }}>帳戶名稱</Label>
                            <Input
                                placeholder="例：媽媽退休金、朋友A代操"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--body-text)" }}
                            />
                        </div>
                        <Button onClick={handleCreate} disabled={creating} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                            {creating ? "建立中..." : "確認建立"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
