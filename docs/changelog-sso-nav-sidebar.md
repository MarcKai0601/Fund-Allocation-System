# 修改紀錄 — 側邊欄 SSO 導航及登出功能擴建 (2026-03-11)

> **範圍**: Frontend (Sidebar.tsx, i18n locales, AppContent.tsx)
> **目的**: 提供 React 系統返回跨應用程式 SSO Hub (應用程式大廳) 與登出功能的入口。

---

## 🔧 變更內容

### 1. Sidebar App Launcher 返回大廳
- **修改檔案**: `frontend/src/components/Sidebar.tsx`
- **變更說明**:
  - 引入了 `Grid3x3` lucide 圖標。
  - 於左上側 Logo 區塊下方加入「所有應用程式」之新區段。
  - 當點擊時，利用原生 URL Redirect `window.location.href` 將使用者動態引導至 `@NEXT_PUBLIC_SSO_WELCOME_URL`。

### 2. Sidebar 底部註銷登出按鈕 (含 Redirect 修復邏輯)
- **修改檔案**: `frontend/src/components/Sidebar.tsx`
- **變更說明**:
  - 引入了 `LogOut` lucide 圖標。
  - 在最底端控制台（版本號文字下方）新增了滿版登出按鈕。
  - 實作防護邊界：透過 `useAuthStore.setState({ isInitializing: true })` 主動掛起畫面遮罩，宣告狀態變更中，避免觸發 Route Guard 的無窮迴圈 `redirect` 參數污染。隨後 `logout()` 徹底清除用戶狀態並使用 `window.location.href` 原生跳轉回 SSO 登入頁（`:5174/login`），確保網址乾淨。
  - 添加了支援紅色警示感知的 tailwind 樣式。
