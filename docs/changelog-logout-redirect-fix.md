# 修改紀錄 — 修復登出時錯誤攜帶 Redirect 參數 (2026-03-11)

> **範圍**: Frontend (`Sidebar.tsx`, `AppContent.tsx`)
> **目的**: 解決使用者主動點擊登出時，因 Token 清空瞬間觸發全域路由守衛 (Route Guard)，導致跳轉網址被錯誤附加密碼學 `?redirect=` 參數的非預期行為。

---

## 🔧 變更內容

### 登出按鈕邏輯強化 (`Sidebar.tsx`)
- **修改檔案**: `frontend/src/components/Sidebar.tsx`
- **變更說明**:
  修改了 `handleLogout`（登出按鈕 `onClick`）執行時序：
  1. 先執行 `useAuthStore.setState({ isInitializing: true });`。主動掛起一個畫面遮罩，宣告狀態變更中。
  2. 由於 `isInitializing` 被鎖定為 `true`，下方的 `AppContent.tsx` 中監聽不到 `!token && !isInitializing` 的防護條件，完美閃過了原先不小心的攔截跳轉。
  3. 接著安全地執行 `useAuthStore.getState().logout();` 清除實體憑證。
  4. 最後使用 `window.location.href` 原生跳轉回 SSO 登入頁（`:5174/login`），確保網址上不會攜帶多餘的 `?redirect=` 參數。
