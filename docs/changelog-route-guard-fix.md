# 修改紀錄 — 實作安全 Route Guard 與渲染阻擋 (2026-03-11)

> **範圍**: Frontend (AppContent)
> **目的**: 解決當使用者登出退回登入大廳後，若不慎點擊瀏覽器「上一頁」，仍會渲染出系統帶有導覽列的空殼畫面。

---

## 🔧 變更內容

### 1. 強化認證閘門 (AppContent.tsx)
- **修改檔案**: `frontend/src/components/AppContent.tsx`
- **變更說明**:
  - 除了原本攔截啟動中 (`isInitializing`) 的狀態以外，進一步從 `useAuthStore` 讀取了 `token` 的值。

### 2. 新增防禦性重定向 (Force Redirect)
- **變更說明**: 
  - 加入了新的 `useEffect` 監聽器。
  - 當系統已非初始化中 (`!isInitializing`) 且 **完全沒有 Token (`!token`)** 的狀態下，系統會立即發動跳轉返回 SSO（預設 `:5174/login`），並附帶當前網址為 `redirect` 參數。
  - **細節防護**：呼叫的是 `window.location.replace()`。這表示當前的網址歷史紀錄將直接被新的 SSO 網址覆寫。此設計能有效防止返回上一頁無限在無權限系統登入處「鬼打牆」回不去的情況。

### 3. 完全封鎖未授權渲染
- **變更說明**:
  - 將早先阻擋畫面載入條件從 `if (!mounted || isInitializing)` 嚴格升格為 `if (!mounted || isInitializing || !token)`。
  - 這確保只要沒有有效的憑證會話，終端使用者就永遠只會看到 `<Loader2>` 的等待畫面，**絕對不准渲染出系統外層殼或任何 `{children}` 內部資料**。
