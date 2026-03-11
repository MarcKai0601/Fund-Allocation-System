# 修改紀錄 — 清理本地開發環境模擬登入 (2026-03-11)

> **範圍**: Frontend & Backend
> **目的**: 系統已全面整合 Java SSO 認證中心，移除所有為前端繞過登入設計的本地模擬 (dev_auth) 邏輯。

---

## 🔧 1. 前端 (Frontend) - 清理 API 定義與組件邏輯

### 清理 API (`frontend/src/lib/api.ts`)
- 移除了 `devApi` 物件（包含 `devApi.login`）。
- 確保只保留目前已實作的正規端點（如 `authApi.getMe()`、`portfoliosApi`、`fundsApi`、`tradesApi` 等）。

### 移除自動掛載流程 (`frontend/src/components/Sidebar.tsx`)
- 移除了偵測沒有 token 時自動呼叫 `devApi.login` 取得假 JWT 的 `useEffect` 迴圈與相關 Imports。現在若無登入，系統將必定依賴正常的 SSO 引導。

### 強化狀態管理與攔截器 (`frontend/src/lib/auth-store.ts` 與 `TokenCatcher.tsx`)
- 原先由於配合開發版，Auth Store 內擁抱了實質上與 `setToken` 相同的 `login` Action。為了徹底避免混淆，從 store 移除了 `login` 的宣告。
- 在 `frontend/src/components/TokenCatcher.tsx` 中，改為直接呼叫 `useAuthStore.getState().setToken(token)` 存入從網址解析下來的有效憑證，確保邏輯單純且不會混淆。

---

## 🛡️ 2. 後端 (Backend) - 刪除模擬 API 端點

### 移除了模擬 Router 掛載 (`backend/main.py`)
- 在主入口點中，刪除了 `dev_auth` 的 import。
- 刪除了 `app.include_router(dev_auth.router)`，正式拔除了模擬 SSO 後門端點存取。

### 刪除冗餘檔案
- 連根拔除了 `backend/app/api/dev_auth.py` 源碼。目前 python 的登入認證端點，僅精簡到處理 `GET /api/auth/me` 以返回當前 SSO Token 背後的 User Profile。
