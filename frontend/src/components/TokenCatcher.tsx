"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

/**
 * TokenCatcher — 全域 Token 攔截元件
 *
 * 從 URL query string 攔截 SSO 回傳的 `?token=xxx`，
 * 存入 Zustand auth store，並立即清除網址上的 token 參數。
 *
 * 需用 <Suspense> 包裹（因為 useSearchParams 需要 Suspense boundary）。
 */
export default function TokenCatcher() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const token = searchParams.get("token");
        if (token) {
            // 將 Token 存入 Zustand store
            useAuthStore.getState().login(token);

            // 清除 URL 上的 token 參數，避免外洩
            router.replace(pathname);
        }
    }, [searchParams, router, pathname]);

    return null;
}
