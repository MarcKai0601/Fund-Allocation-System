"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, ArrowLeftRight, TrendingUp, Sun, Moon, ALargeSmall } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const nav = [
    { href: "/", label: "總覽 Dashboard", icon: LayoutDashboard },
    { href: "/funds", label: "資金管理", icon: BookOpen },
    { href: "/trades", label: "交易紀錄", icon: ArrowLeftRight },
];

type FontSize = "md" | "lg" | "xl";
const fontLabels: Record<FontSize, string> = { md: "A", lg: "A+", xl: "A++" };

export default function Sidebar() {
    const pathname = usePathname();
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [fontSize, setFontSize] = useState<FontSize>("md");

    // Avoid hydration mismatch
    useEffect(() => { setMounted(true); }, []);

    // Restore font size preference
    useEffect(() => {
        const saved = localStorage.getItem("font-size") as FontSize | null;
        if (saved && ["md", "lg", "xl"].includes(saved)) {
            setFontSize(saved);
            document.documentElement.setAttribute("data-font", saved);
        }
    }, []);

    const cycleFontSize = () => {
        const order: FontSize[] = ["md", "lg", "xl"];
        const next = order[(order.indexOf(fontSize) + 1) % order.length];
        setFontSize(next);
        document.documentElement.setAttribute("data-font", next);
        localStorage.setItem("font-size", next);
    };

    const isDark = resolvedTheme === "dark";

    return (
        <aside
            className="w-64 min-h-screen flex flex-col transition-colors duration-200"
            style={{
                backgroundColor: "var(--sidebar-bg)",
                borderRight: "1px solid var(--sidebar-border)",
            }}
        >
            {/* Logo */}
            <div className="px-6 py-6 flex items-center gap-3" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="font-bold text-sm leading-tight" style={{ color: "var(--sidebar-hover-text)" }}>代操系統</p>
                    <p className="text-xs" style={{ color: "var(--sidebar-text)" }}>Fund Allocation</p>
                </div>
            </div>

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
                {/* Font size + Theme toggle row */}
                <div className="flex items-center gap-2">
                    {/* Font size cycle button */}
                    <button
                        onClick={cycleFontSize}
                        title="調整字體大小"
                        className={cn(
                            "flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            "border"
                        )}
                        style={{
                            backgroundColor: "var(--sidebar-hover-bg)",
                            color: "var(--sidebar-text)",
                            borderColor: "var(--sidebar-border)",
                        }}
                    >
                        <ALargeSmall className="w-3.5 h-3.5 shrink-0" />
                        字體：{mounted ? fontLabels[fontSize] : "A"}
                    </button>

                    {/* Theme toggle button */}
                    <button
                        onClick={() => setTheme(isDark ? "light" : "dark")}
                        title={isDark ? "切換淺色模式" : "切換深色模式"}
                        className="p-2 rounded-lg transition-colors border"
                        style={{
                            backgroundColor: "var(--sidebar-hover-bg)",
                            color: "var(--sidebar-text)",
                            borderColor: "var(--sidebar-border)",
                        }}
                    >
                        {mounted ? (
                            isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
                        ) : (
                            <Sun className="w-4 h-4" />
                        )}
                    </button>
                </div>

                <p className="text-xs" style={{ color: "var(--sidebar-text)", opacity: 0.6 }}>
                    台股代操管理平台 v1.1.0
                </p>
            </div>
        </aside>
    );
}
