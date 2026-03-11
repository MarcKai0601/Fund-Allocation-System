"use client";

import { useAuthStore } from "@/lib/auth-store";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";

/**
 * 等待 TokenCatcher 驗證網址 Token 完成後，才渲染畫面內容。
 * 以防止使用舊憑證發送 API，導致假性 401 錯誤無限重新跳轉。
 */
export default function AppContent({ children }: { children: React.ReactNode }) {
    const isInitializing = useAuthStore((s) => s.isInitializing);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || isInitializing) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="flex items-center gap-2 text-emerald-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="font-semibold text-sm">驗證授權中...</span>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
