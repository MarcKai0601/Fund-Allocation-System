# 修改紀錄 — SSO 語系自動同步整合 (2026-03-11)

> **範圍**: Backend (FastAPI) + Frontend (React, Zustand, i18next)
> **目的**: 當使用者透過 SSO 登入後，前端能夠接收並自動套用存放在 Token Session 內的語系設定。

---

## 🔧 1. 後端 (Backend) - 擴充 Session 解析與 Profile API

- **修改檔案**:
  - `backend/app/core/security.py`
  - `backend/app/core/redis_client.py`
- **變更說明**:
  - 在 `UserSession` Pydantic Model 中擴充 `language` 欄位（預設 `"zh-TW"`）。
  - 在 `get_current_user_session` 依賴中，從 Redis 的 JSON Session 資料提取 `language` 偏好並封裝。
  - 修改 `set_auth_token` 支援寫入 `language` 欄位。

- **新增檔案**: `backend/app/api/auth.py`
  - 新增了 `GET /api/auth/me` 路由。
  - 將解析完成的對象 `UserSession` 直接以此端點回傳（包含 `user_id`, `roles`, `language` 等資料）。

- **目錄/全域修改**: 
  - 修改 `backend/main.py` 註冊了新的 `auth.router`。
  - 更新 `backend/app/api/dev_auth.py` 以支援在本地開發時可注入自訂的 `language`，便於測試。

---

## 🌐 2. 前端 (Frontend) - API 整合與自動切換

- **變更檔案**: `frontend/src/lib/api.ts`
  - 新增 `UserProfile` 介面，明確標示 `language: string`。
  - 實作新的 `authApi` 與 `getMe()` 方法呼叫 API `/api/auth/me`。
  - `devApi.login` 方法也支援帶入目前 `i18n.language` 做為模擬 SSO 回傳測試。

- **變更檔案**: `frontend/src/lib/auth-store.ts`
  - 擴充 Zustand Store (`useAuthStore`) 以儲存完整的 `current user` 設定檔，不再只存單一 `token`。

- **變更檔案**: `frontend/src/components/TokenCatcher.tsx`
  - 改寫攔截邏輯，在成功取得 SSO Token 並存入 `login(token)` 後，**不會立即刪除 URL Token**。
  - 使用 `async/await` 非同步觸發 `authApi.getMe()` 以拉取使用者的設定檔。
  - 當 Profile 取回後，自動將資料存入 Store (`setUser`) 並呼叫 `i18n.changeLanguage(user.language)` 完成無縫切換語系。
  - 最終再執行 `router.replace(pathname)` 完成網址清理動作。

