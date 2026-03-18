# Changelog: Axios 401 Interceptor Logout Fix

## 📝 任務背景 (Background)
當 SSO 核心系統核發的 Token 過期後，React 端 localStorage 可能仍殘留舊有 token，導致 `AppContent` 全域路由守衛放行，但在呼叫受保護的後端 API 時就會遭遇 401 Unauthorized。系統需要透過 Axios 的全域攔截器自動捕捉 401 錯誤，清空無效的本地登入狀態並引導使用者回 SSO 登入中心重新驗證。

## 🔧 變更內容 (Changes)

### 1. 更新 Axios Response 攔截器中的 401 處理邏輯
- **檔案**: `frontend/src/lib/api.ts`
- **調整細節**:
  - 當收到後端回應 `error.response?.status === 401` 時：
    1. 加入 `useAuthStore.setState({ isInitializing: true })` 來暫時阻擋 `AppContent` 內部的 Route Guard 攔截，以確保頁面能乾淨跳轉。
    2. 執行 `useAuthStore.getState().logout()`，徹底清除前端 Store 與 `localStorage` 中過期的 Token。
    3. 設定 `window.location.href` 將頁面跳轉至 SSO 登入頁 (`process.env.NEXT_PUBLIC_SSO_LOGIN_URL` 或預設的 `http://localhost:5173/login`)，而且不再像先前一樣附帶 `?redirect=` 參數。
  - 最後確認攔截器依舊完整回傳 `Promise.reject(error)`，以便觸發各個呼叫端的 `catch` 邏輯，避免流程卡頓。

## 🎯 影響與預期結果 (Expected Results)
- 原先由於 401 錯誤導致的 API 失敗，現在將直接觸發乾淨的全站登出動作，不留殘餘狀態。
- 修復了 AppContent 捕捉到無 Token 以後主動補上 `?redirect=` 所引發的登出版面轉址錯誤。
