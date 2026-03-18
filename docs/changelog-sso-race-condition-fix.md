# Changelog: SSO 登入競態條件修復 — isInitializing 持久化與 Route Guard (2026-03-18)

## 📝 問題描述 (Problem)
使用者透過 SSO 登入成功後，被重導向回 `http://localhost:3000/` 時，畫面卻出現 404 頁面。

**根本原因 (Root Cause)**：
1. **`isInitializing` 被持久化**：Zustand 的 `persist` 中介軟體將 `isInitializing` 存入了 `localStorage`。前一次成功登入後，`isInitializing` 被設為 `false` 並持久化。下次頁面載入時，store 從 localStorage 恢復，`isInitializing` 直接為 `false`，導致 `AppContent` 立即渲染子元件，但此時 `TokenCatcher` 尚未處理 URL 上的 `?token=` 參數。
2. **Route Guard 缺失**：`AppContent` 元件沒有在初始化完成後檢查 Token 是否存在，無法將未授權使用者導向 SSO 登入頁。
3. **Token 未重新驗證**：`TokenCatcher` 在沒有 URL `?token=` 時，直接呼叫 `setInitializing(false)` 放行，沒有對 localStorage 中殘留的舊 Token 進行有效性驗證。

## 🔧 變更內容 (Changes)

### 1. 排除 `isInitializing` 的持久化
- **檔案**: `frontend/src/lib/auth-store.ts`
- 在 `persist` 設定中增加 `partialize` 選項，僅持久化 `token` 與 `user`。
- `isInitializing` 每次頁面載入時一律從預設值 `true` 開始，確保 `AppContent` 會等待 `TokenCatcher` 完成初始化。

### 2. 增強 TokenCatcher 三段式邏輯
- **檔案**: `frontend/src/components/TokenCatcher.tsx`
- **Case 1**：URL 帶有 `?token=` → 存入 store → 呼叫 `/api/auth/me` → 清除 URL 參數。
- **Case 2**：URL 無 token 但 store 有舊 token → 呼叫 `/api/auth/me` 驗證是否仍有效。若失效，Axios 401 攔截器會自動處理跳轉。
- **Case 3**：完全無 Token → 直接放行，交由 `AppContent` Route Guard 處理跳轉。

### 3. 恢復 AppContent Route Guard
- **檔案**: `frontend/src/components/AppContent.tsx`
- 新增讀取 `token` 狀態。
- 新增 `useEffect`：當初始化完成且無 Token 時，使用 `window.location.replace()` 跳轉至 SSO 登入頁（覆蓋瀏覽器歷史紀錄，防止使用者按「上一頁」回到空殼畫面）。

## 🎯 預期結果 (Expected Results)
- SSO 登入成功後，重導向回 `http://localhost:3000/?token=xxx` 時，畫面會先顯示「驗證授權中...」，待 Token 處理完畢後才渲染主畫面。
- 瀏覽器中殘留的過期 Token 會在頁面載入時被主動驗證，失效時自動跳轉至 SSO 登入頁。
- 未登入狀態下訪問系統會被 Route Guard 攔截並跳轉至 SSO，不再出現 404。
