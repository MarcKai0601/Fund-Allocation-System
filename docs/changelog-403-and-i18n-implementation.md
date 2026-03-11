# 修改紀錄 — 403 修正與 i18n 導入

> **日期**: 2026-03-11
> **範圍**: Backend (FastAPI API) + Frontend (Next.js i18n)

---

## 🔧 1. 後端 (Backend) - 權限放寬

- **修改檔案**: `backend/app/api/portfolios.py`
- **變更說明**: 
  將原本限定管理員存取的 `list_all_portfolios` 路由（`@router.get("/all")`），其權限由 `RequireRole("ADMIN")` 放寬至 `RequireRole("ADMIN", "USER")`。
  這允許具備 `USER` 角色的帳號也能順利拉取總覽投資組合資料，避免產生 403 拒絕存取錯誤。

---

## 🛡️ 2. 前端 (Frontend) - API Interceptor 403 死迴圈修復

- **修改檔案**: `frontend/src/lib/api.ts`
- **變更說明**:
  重新改寫 `api.interceptors.response.use` 的錯誤處理邏輯。
  - **HTTP 401**: 清除 Zustand 中的 `token` 並重新導向至 SSO 登入頁（指定於 Port `5174`），並附帶了 `redirect` 參數。
  - **HTTP 403**: 取消了原本可能會被統一拋轉而造成的 403 登出死迴圈問題。現在當遇到 403 錯誤時，系統 **不會進行頁面跳轉**，而是直接彈出 Toast 顯示 `i18n.t("errors.forbidden")`（權限不足），並拒絕（Reject）該 API Promise，保持畫面停留與穩定。

---

## 🌐 3. 前端 (Frontend) - 導入多國語系 (i18n)

### 依賴安裝
- 透過 `npm` 安裝了 `i18next`、`react-i18next` 以及 `i18next-browser-languagedetector`。

### 核心設定
- **新增檔案**: `frontend/src/i18n/config.ts`
  - 使用 `LanguageDetector` 自動讀取使用者瀏覽器語系。
  - 註冊並設定了四種支援語系（`zh-TW` 繁體中文、`en` 英文、`ja` 日文、`ko` 韓文）。
  - 設定 Fallback 語言為 `zh-TW`。
- **修改檔案**: `frontend/src/app/layout.tsx`
  - 於頂層引入 `import "@/i18n/config"` 確保應用程式啟動時立刻完成語系系統之初始化。

### 翻譯字典檔建立
於 `frontend/src/locales/` 目錄下新增下述語系 JSON 檔，涵蓋側邊欄介面及錯誤訊息：
- `zh-TW.json` (預設/繁體中文)
- `en.json` (English)
- `ja.json` (日本語)
- `ko.json` (한국어)

### Sidebar 語系掛載與切換器 UI
- **修改檔案**: `frontend/src/components/Sidebar.tsx`
  - 導入了 `useTranslation()` Hook。
  - 將導覽列（`nav`）、代操帳戶選單（`portfolioSwitcher`）、字體與主題控制按鈕、建立代操帳戶 Dialog 中的靜態顯示文字，全面變更為 `t("...")` 翻譯鍵值渲染。
  - 在側邊欄下方的控制面板區域，實作了一組**語系切換下拉選單 (Language Switcher)** `<select>`，讓使用者能手動變更介面語言（支援 `zh-TW`, `en`, `ja`, `ko` 即時熱切換），切換後會即時反映至全站。

