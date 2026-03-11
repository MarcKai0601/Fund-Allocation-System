# 修改紀錄 — 修復 SSO 首頁載入 Race Condition (2026-03-11)

> **範圍**: Frontend (Zustand Auth Store, TokenCatcher, Root Layout)
> **目的**: 解決 SSO 帶 Token 跳轉回系統時，因 React 非同步渲染導致 TokenCatcher 尚未將 Token 寫入狀態，而 `Sidebar` 或 `Dashboard` 就提早觸發 API 請求進而引發 401 Unauthorized 的 Race Condition 問題。

---

## 🔧 變更內容

### 1. 擴展 Zustand Auth Store
- **修改檔案**: `frontend/src/lib/auth-store.ts`
- **變更說明**: 
  - 於 `AuthState` 中新增了 `isInitializing: boolean` 狀態，並設定預設值為 `true`。
  - 新增了 `setInitializing` 動作供外部切換。

### 2. TokenCatcher 控制閘門
- **修改檔案**: `frontend/src/components/TokenCatcher.tsx`
- **變更說明**:
  - 將 `TokenCatcher` 升級為應用程式啟動時的初始化控制器。
  - **情境 A (無 Token)**：若進入時 URL 上沒有 `?token=`，直接執行 `setInitializing(false)` 放行，讓系統直接讀取 localStorage 的舊會話或導向登入。
  - **情境 B (有 Token)**：將原本的 `syncSession` 加入 `finally` 區塊，確保無論 `getMe()` API 呼叫成功或失敗，最後一定會執行 `setInitializing(false)` 解除畫面鎖定。

### 3. AppContent 負責阻攔提早渲染
- **新增檔案**: `frontend/src/components/AppContent.tsx`
- **修改檔案**: `frontend/src/app/layout.tsx`
- **變更說明**:
  - 新建了一個帶有 `"use client";` 的包裝元件 `AppContent`。
  - 透過訂閱 `useAuthStore((s) => s.isInitializing)` 的狀態，在 `isInitializing` 為 `true` 時，攔截 `{children}` 的渲染，改為輸出一個置中的 `Loader2` 載入讀取動畫。
  - 於 `src/app/layout.tsx` 中匯入 `AppContent`，並將包含 `Sidebar` 與核心 `children` 的主要排版區塊包裹起來。
  - 這個機制澈底隔絕了子元件在 Token 準備好之前掛載發送 API 的可能性。
