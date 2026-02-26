"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, ArrowLeftRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
    { href: "/", label: "總覽 Dashboard", icon: LayoutDashboard },
    { href: "/funds", label: "資金管理", icon: BookOpen },
    { href: "/trades", label: "交易紀錄", icon: ArrowLeftRight },
];

export default function Sidebar() {
    const pathname = usePathname();
    return (
        <aside className="w-64 min-h-screen bg-gray-950 border-r border-gray-800 flex flex-col">
            <div className="px-6 py-6 flex items-center gap-3 border-b border-gray-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-white font-bold text-sm leading-tight">代操系統</p>
                    <p className="text-gray-400 text-xs">Fund Allocation</p>
                </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
                {nav.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                            pathname === href
                                ? "bg-emerald-500/10 text-emerald-400 font-medium"
                                : "text-gray-400 hover:text-white hover:bg-gray-800"
                        )}
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                    </Link>
                ))}
            </nav>
            <div className="px-6 py-4 border-t border-gray-800">
                <p className="text-xs text-gray-600">台股代操管理平台 v1.0</p>
            </div>
        </aside>
    );
}
