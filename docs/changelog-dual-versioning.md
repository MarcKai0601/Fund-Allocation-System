# Changelog: SSO System Version Tracking Display

## 📝 任務背景 (Background)
目前的系統雖然分為前端 (UI) 與後端 (API)，但在介面上無法一目了然得知當前執行中的元件確切版本號。為了方便使用者與開發者在問題回報時能明確知曉前後端版號，故實作**雙重版號（Dual Versioning）擷取與展示模組**。後續為了使版號的維護更為標準且集中管理，故進一步將版號與更新時間從進入點檔案中抽離，各自放進專用的配置檔進行控管。

## 🔧 變更內容 (Changes)

### 1. 後端 FastAPI 端點曝露與中心組態 (Backend Core Versioning)
- **新增檔案**: `backend/app/core/version.py`
  - 獨立成統一的常數集 (`VERSION`, `VERSION_PREFIX`, `RELEASE_DATE`, `DESCRIPTION`)，以及提供一個 `get_full_version()` Helper 使取用版本更方便。
- **檔案**: `backend/app/main.py`
  - 新增並擴充 `@app.get("/api/system/version")` API 路由點。
  - 將原本寫死在路由器內的物件替換為取用 `app.core.version` 來的動態數值，並使得原本的版本響應額外多出 `release_date`。

### 2. 前端 Axios 管理與中心組態 (Frontend Library Versioning)
- **新增檔案**: `frontend/src/lib/version.ts`
  - 獨立成統一的常數集 (`APP_VERSION`, `RELEASE_DATE`, `DESCRIPTION`) 等，供各 UI 視圖引用，不再依賴讀取上層目錄的 `package.json` 以提升結構完整性。
- **檔案**: `frontend/src/lib/api.ts`
  - 於 `export const systemApi` 的 `getVersion()` 回傳介面加入 `release_date?: string` 可選屬性。

### 3. 動態版號狀態與懸停提示渲染 (Sidebar Component Tooltip)
- **檔案**: `frontend/src/components/Sidebar.tsx`
  - 利用 TypeScript 匯入本機 `frontend/src/lib/version.ts` 中的版號資訊 (例：`APP_VERSION`)。
  - 設計 `useCallback` 針對 `systemApi.getVersion()` 實作非同步調用，取得後端 API 等資訊，並存入 `beVersion` (包含 `release_date`) 的物件狀態內。
  - 修改 `Sidebar` 最下層區塊，利用 `<span title="...">` 的屬性渲染出 tooltip。當游標懸停在 `WEB v1.1.0` 或 `CORE R2026xxxx` 之上時，將浮出各自負責的更新日誌時間 (Release Date)。

## 🎯 影響與預期結果 (Expected Results)
- 原先側邊攔右下角的語系 `[版本]` 將轉化為明確的 `WEB 1.1.0 • CORE R20260312v5.0.0`，當前系統各環境對應版本號可以直接從瀏覽器介面上觀看，並提供詳盡的滑鼠懸浮文字標記最後更新發布日期。
- API 的版號端點能提供予未來潛在的外部第三方與 CI/CD 機制做服務存活判別與版本確認。
- 往後要上機部署與變更發布紀錄時，開發者可以非常直覺明確地前往 `version.py` 與 `version.ts` 兩處去進行快速修補，減少去進入點（Entry point）硬寫參數的維護成本。
