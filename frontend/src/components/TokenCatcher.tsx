"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { authApi } from "@/lib/api";
import { useTranslation } from "react-i18next";

/**
 * TokenCatcher — 全域 Token 攔截元件
 *
 * 職責：
 * 1. 若 URL 帶有 `?token=xxx`：存入 store → 呼叫 /api/auth/me → 清除 URL 參數。
 * 2. 若 URL 無 token 但 store 已有 token：呼叫 /api/auth/me 驗證是否仍有效。
 * 3. 若 store 完全無 token 且 URL 也無 token：直接放行（交由 AppContent Route Guard 處理跳轉）。
 *
 * 最終呼叫 setInitializing(false) 開閘。
 */
export default function TokenCatcher() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { i18n } = useTranslation();

    useEffect(() => {
        const urlToken = searchParams.get("token");
        const { setInitializing, setToken, setUser } = useAuthStore.getState();
        const existingToken = useAuthStore.getState().token;

        // Case 1: URL 帶有新 Token（SSO 跳轉回來）
        if (urlToken) {
            const syncSession = async () => {
                try {
                    setToken(urlToken);
                    const res = await authApi.getMe();
                    setUser(res.data);
                    if (res.data.language) {
                        i18n.changeLanguage(res.data.language);
                    }
                    router.replace(pathname);
                } catch (err) {
                    console.error("Failed to sync SSO session:", err);
                    // Token 無效，清除並讓 Route Guard 處理跳轉
                    useAuthStore.getState().logout();
                } finally {
                    setInitializing(false);
                }
            };
            syncSession();
            return;
        }

        // Case 2: 沒有 URL Token，但 store 有舊 Token → 驗證是否仍有效
        if (existingToken) {
            const revalidate = async () => {
                try {
                    const res = await authApi.getMe();
                    setUser(res.data);
                    if (res.data.language) {
                        i18n.changeLanguage(res.data.language);
                    }
                } catch {
                    // Token 過期或失效，Axios 攔截器已處理 401 跳轉
                    // 此處不需額外處理
                } finally {
                    setInitializing(false);
                }
            };
            revalidate();
            return;
        }

        // Case 3: 完全無 Token → 直接放行，交給 AppContent Route Guard
        setInitializing(false);
    }, [searchParams, router, pathname, i18n]);

    return null;
}

