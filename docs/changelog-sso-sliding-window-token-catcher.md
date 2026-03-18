# Changelog — SSO 滑動視窗 + Token Catcher 實作

> **日期**: 2026-03-10
> **範圍**: Backend (FastAPI) + Frontend (Next.js)

---

## 🔧 後端 (Backend)

### 1. `backend/app/core/config.py`

新增 `SLIDING_WINDOW_TTL` 設定項（預設 1800 秒 = 30 分鐘），用於控制 Token 每次驗證後延長的存活時間。

```diff
 AUTH_TOKEN_TTL: int = 86400
+SLIDING_WINDOW_TTL: int = 1800    # 每次 API 呼叫自動延長 30 分鐘
```

### 2. `backend/app/core/security.py`

在 `get_current_user()` 中，成功驗證 Token 後呼叫 `r.expire()` 重置該 Redis Key 的 TTL，實現「滑動視窗」機制 — 只要前端持續呼叫受保護 API，使用者的 Session 就不會過期。

```diff
+from app.core.config import settings
 ...
+    # ── Sliding Window: 每次成功驗證都重置 Token TTL ──
+    redis_key = f"{TOKEN_PREFIX}{token}"
+    r.expire(redis_key, settings.SLIDING_WINDOW_TTL)
+    logger.debug(f"Sliding window: reset TTL for {redis_key} to {settings.SLIDING_WINDOW_TTL}s")
+
     return session
```

---

## 🖥️ 前端 (Frontend)

### 3. `frontend/src/lib/auth-store.ts`

在 Zustand store 新增 `login(token)` 方法，作為 SSO Token 寫入的語意化介面：

```diff
 interface AuthState {
     token: string | null;
     setToken: (token: string) => void;
+    login: (token: string) => void;
     logout: () => void;
 }
```

### 4. `frontend/src/components/TokenCatcher.tsx` [NEW]

全新 Client Component，負責：
1. 使用 `useSearchParams()` 偵測 URL 上的 `?token=xxx` 參數
2. 呼叫 `useAuthStore.login(token)` 將 Token 存入 Zustand
3. 使用 `router.replace(pathname)` 立即清除網址上的 token 參數，防止洩漏

### 5. `frontend/src/app/layout.tsx`

掛載 `<TokenCatcher />` 至根 Layout（以 `<Suspense>` 包裹），確保全站路由皆能攔截 SSO Token：

```diff
+import { Suspense } from "react";
+import TokenCatcher from "@/components/TokenCatcher";
 ...
 <ThemeProvider ...>
+  <Suspense fallback={null}>
+    <TokenCatcher />
+  </Suspense>
   <div className="flex min-h-screen">
```

### 6. `frontend/src/lib/api.ts`

401 Unauthorized 攔截器新增 SSO 重導向邏輯：

```diff
 if (status === 401) {
   useAuthStore.getState().logout();
+  if (typeof window !== "undefined") {
+    const ssoLoginUrl =
+      process.env.NEXT_PUBLIC_SSO_LOGIN_URL || "http://localhost:5174/login";
+    window.location.href = `${ssoLoginUrl}?redirect=${encodeURIComponent(window.location.href)}`;
+  }
 }
```

> SSO 登入 URL 可透過環境變數 `NEXT_PUBLIC_SSO_LOGIN_URL` 覆寫，預設為 `http://localhost:5174/login`。

---

## 📋 驗證步驟

| 項目 | 方法 |
|------|------|
| 滑動視窗 | 呼叫受保護 API 後，用 `redis-cli TTL token:<token>` 確認 TTL ≈ 1800 |
| Token Catcher | 訪問 `http://localhost:3000/?token=abc` → URL 自動清理、localStorage 有值 |
| 401 重導向 | 使用無效 Token 呼叫 API → 瀏覽器跳轉至 SSO Login 頁 |
