# 修改紀錄 — i18n 多國語系補全 (2026-03-11)

> **範圍**: Frontend (Dashboard, Locales)
> **目的**: 替換前端主畫面上殘留的中文硬編碼字串，並補齊語系檔案中遺漏的翻譯鍵值。

---

## 🔧 變更內容

### 1. 資金管理空狀態 i18n 替換 (Dashboard)
- Modified `frontend/src/app/page.tsx`:
  - Replaced hardcoded "尚未初始化資金" with `{t('dashboard.emptyState.title')}`.
  - Replaced hardcoded "請前往「資金管理」設定初始代操金額" with `{t('dashboard.emptyState.description')}`.

### Deep Scan and Global UI Refactoring
- Initiated a large-scale project sweep extracting Chinese strings embedded across multiple Next.js routing files.
- Refactored `frontend/src/app/page.tsx` (Dashboard):
  - Injected translation bindings to substitute dynamic properties (`dashboard.investedAmount`, `dashboard.unrealizedPnl`, `dashboard.table.inventory`, etc.).
- Refactored `frontend/src/app/funds/page.tsx` (Fund Management):
  - Connected dialog menus, table layouts, and toast notifications to `t('funds.xxx')` mappings.
- Refactored `frontend/src/app/trades/page.tsx` (Trading Records):
  - Extracted UI logic, input place holders, button statuses to hook bindings corresponding to `trades` schema.
- Synchronised the data model containing over 40+ unique UI string patterns mapping to `zh-TW.json`, `en.json`, `ja.json`, and `ko.json` identically. The system has 100% i18n coverage regarding Dashboard analytics, user actions, notification toasts, and record filtering contexts.

### 2. 補齊全語系字典檔 (Locales)
- **修改檔案**: `frontend/src/locales/en.json`, `ja.json`, `ko.json`, `zh-TW.json`
- **變更說明**:
  - 在 `sidebar` 中成功註冊先前的 `appLauncher` (所有應用程式) 與 `logout` (登出) 鍵值。
  - 新增 `dashboard.emptyState` 結構，涵蓋了 4 種語系的精準翻譯宣告。
