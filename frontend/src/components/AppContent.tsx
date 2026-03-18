"use client";

import { useAuthStore } from "@/lib/auth-store";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";

/**
 * 等待 TokenCatcher 驗證網址 Token 完成後，才渲染畫面內容。
 * 以防止使用舊憑證發送 API，導致假性 401 錯誤無限重新跳轉。
 *
 * 同時擔任 Route Guard：初始化完成後若仍無 Token，強制跳轉 SSO 登入頁。
 */
export default function AppContent({ children }: { children: React.ReactNode }) {
    const isInitializing = useAuthStore((s) => s.isInitializing);
    const token = useAuthStore((s) => s.token);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Route Guard: 初始化完成且無 Token → 跳轉 SSO
    useEffect(() => {
        if (!isInitializing && !token && mounted) {
            const ssoLoginUrl =
                process.env.NEXT_PUBLIC_SSO_LOGIN_URL || "http://localhost:5174/login";
            window.location.replace(ssoLoginUrl);
        }
    }, [isInitializing, token, mounted]);

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

