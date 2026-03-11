# 修改紀錄 — 側邊欄 SSO 導航及登出功能擴建 (2026-03-11)

> **範圍**: Frontend (Sidebar.tsx, i18n locales)
> **目的**: 提供 React 系統返回跨應用程式 SSO Hub (應用程式大廳) 與登出功能的入口。

---

## 🔧 變更內容

### 1. 多國語系擴展 
- **修改檔案**: `frontend/src/locales/en.json`, `ja.json`, `ko.json`, `zh-TW.json`
- **變更說明**:
  - 在所有語系設定中加入了 `sidebar.appLauncher` 與 `sidebar.logout` 翻譯鍵值，保證系統語系切換的覆蓋率。
  
### 2. Sidebar App Launcher 返回大廳
- **修改檔案**: `frontend/src/components/Sidebar.tsx`
- **變更說明**:
  - 引入了 `Grid3x3` lucide 圖標。
  - 於左上側 Logo 區塊下方加入「所有應用程式」之新區段。
  - 當點擊時，利用原生 URL Redirect `window.location.href` 將使用者動態引導至 `@NEXT_PUBLIC_SSO_WELCOME_URL`。

### 3. Sidebar 底部註銷登出按鈕
- **修改檔案**: `frontend/src/components/Sidebar.tsx`
- **變更說明**:
  - 引入了 `LogOut` lucide 圖標。
  - 在最底端控制台（版本號文字下方）新增了滿版登出按鈕。
  - 實作防護邊界：透過 `useAuthStore.getState().logout()` 徹底清除用戶 Zustand Store 身分狀態，並轉導向回 SSOLogin 端點 (`@NEXT_PUBLIC_SSO_LOGIN_URL`) 供憑證作廢回收。
  - 添加了支援紅色警示感知的 tailwind `hover:bg-red-500/10 hover:text-red-400` 樣式。
