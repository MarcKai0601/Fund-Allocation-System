"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { authApi } from "@/lib/api";
import { useTranslation } from "react-i18next";

/**
 * TokenCatcher — 全域 Token 攔截元件
 *
 * 從 URL query string 攔截 SSO 回傳的 `?token=xxx`，
 * 存入 Zustand auth store，並即時請求 /api/auth/me 來同步語系偏好，
 * 最後清除網址上的 token 參數。
 *
 * 需用 <Suspense> 包裹（因為 useSearchParams 需要 Suspense boundary）。
 */
export default function TokenCatcher() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { i18n } = useTranslation();

    useEffect(() => {
        const token = searchParams.get("token");
        const { setInitializing } = useAuthStore.getState();

        if (!token) {
            setInitializing(false);
            return;
        }

        const syncSession = async () => {
            try {
                // 將 Token 存入 Zustand store，這會讓 interceptor 自動夾帶
                useAuthStore.getState().setToken(token);

                // 呼叫 API 取得使用者完整資料（包含 SSO 的預設語系）
                const res = await authApi.getMe();
                useAuthStore.getState().setUser(res.data);

                // 自動切換 i18n 語系
                if (res.data.language) {
                    i18n.changeLanguage(res.data.language);
                }

                // 清除 URL 上的 token 參數，避免外洩
                router.replace(pathname);
            } catch (err) {
                console.error("Failed to sync SSO session:", err);
            } finally {
                setInitializing(false);
            }
        };

        syncSession();
    }, [searchParams, router, pathname, i18n]);

    return null;
}
