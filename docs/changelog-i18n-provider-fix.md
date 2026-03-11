# 修改紀錄 — 修復 createContext Server Component 錯誤 (2026-03-11)

> **範圍**: Frontend (Next.js App Router, i18next)
> **目的**: 解決 `i18n/config.ts` 在 Server Component (`layout.tsx`) 中被載入而導致的 `TypeError: createContext only works in Client Components` 錯誤。

---

## 🔧 變更內容

### 1. 新增 Client Provider
- **新增檔案**: `frontend/src/components/I18nProvider.tsx`
- **變更說明**:
  - 建立了一個頂端帶有 `"use client";` 宣告的 `I18nProvider` 元件。
  - 將 `import "@/i18n/config";` 移入了這個客戶端元件內，確保 i18next 是在瀏覽器環境的 Context 中被初始化，而不會在 Server Side 發生崩潰。

### 2. 更新 i18n Config
- **修改檔案**: `frontend/src/i18n/config.ts`
- **變更說明**: 
  - 於檔案最頂端補上 `"use client";` 宣告，以防 Next.js 編譯器誤判。

### 3. 清理根佈局 (Root Layout)
- **修改檔案**: `frontend/src/app/layout.tsx`
- **變更說明**:
  - 移除了原先直接將設定載入的 `import "@/i18n/config";` (Server 端引入)。
  - 新增 `import I18nProvider from "@/components/I18nProvider";`。
  - 在 `<ThemeProvider>` 內部，使用 `<I18nProvider>` 包裹住了所有畫面的 `{children}` 邏輯。

---

> 修改完成後，系統會在客戶端成功載入 i18next 實例，消除了 Server Component 引發的 Context 例外錯誤。
