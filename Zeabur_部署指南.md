# Fund Allocation System — Zeabur 部署指南

**版本**: v4.0.0  
**架構**: FastAPI (Backend) + Next.js (Frontend) + MySQL + Redis

---

## 目錄

1. [專案架構概覽](#1-專案架構概覽)
2. [前置準備](#2-前置準備)
3. [Zeabur 部署步驟](#3-zeabur-部署步驟)
4. [環境變數設定](#4-環境變數設定)
5. [資料庫初始化](#5-資料庫初始化)
6. [驗證部署](#6-驗證部署)
7. [常見問題](#7-常見問題)

---

## 1. 專案架構概覽

```
┌────────────────────────────────────────────────────┐
│                    Zeabur Project                   │
├────────────┬────────────┬──────────┬────────────────┤
│  Frontend  │  Backend   │  MySQL   │     Redis      │
│  (Next.js) │  (FastAPI) │  (DB)    │   (Cache/Auth) │
│  Port 3000 │  Port 8000 │  3306    │     6379       │
└────────────┴────────────┴──────────┴────────────────┘
```

| 服務 | 類型 | 來源 |
|------|------|------|
| **Frontend** | Next.js Web | `frontend/` 目錄 |
| **Backend** | Python FastAPI | `backend/` 目錄 |
| **MySQL** | Marketplace | Zeabur 一鍵部署 |
| **Redis** | Marketplace | Zeabur 一鍵部署 |

---

## 2. 前置準備

### 2.1 Zeabur 帳號
- 前往 [zeabur.com](https://zeabur.com) 註冊帳號
- 連結你的 GitHub 帳號

### 2.2 GitHub Repository
- 確認專案已推送至 GitHub
- 確認 `.gitignore` 包含：`venv/`, `__pycache__/`, `.env`, `node_modules/`, `.next/`

### 2.3 專案結構確認
```
FundAllocationSystem_WorkSpace/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── requirements.txt     # Python 依賴
│   └── app/                 # 業務邏輯
├── frontend/
│   ├── package.json         # Node.js 依賴
│   └── src/                 # Next.js 原始碼
├── init.sql                 # 資料庫初始化 SQL
└── zbpack.json              # Zeabur 建置設定
```

---

## 3. Zeabur 部署步驟

### Step 1：建立 Project

1. 登入 Zeabur Dashboard
2. 點擊 **「Create Project」**
3. 選擇部署區域（推薦：`Asia Pacific (Tokyo)` 或 `Asia Pacific (Singapore)`）

### Step 2：部署 MySQL

1. 在 Project 中點擊 **「Add Service」** → **「Marketplace」**
2. 搜尋 **MySQL** → 點擊部署
3. 部署完成後，點擊 MySQL 服務 → **「Connect」** 頁籤
4. 記下連線資訊：
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USERNAME`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`

### Step 3：部署 Redis

1. 點擊 **「Add Service」** → **「Marketplace」**
2. 搜尋 **Redis** → 點擊部署
3. 記下 `REDIS_URL`（格式：`redis://:<password>@<host>:<port>`）

### Step 4：部署 Backend (FastAPI)

1. 點擊 **「Add Service」** → **「Git」**
2. 選擇你的 GitHub Repo
3. **Root Directory** 設為：`backend`
4. Zeabur 會自動偵測 Python 專案（透過 `requirements.txt`）
5. 設定環境變數（參見 [第4節](#4-環境變數設定)）
6. 設定 **Port**：`8000`
7. 設定 **Start Command**（如 Zeabur 未自動偵測）：
   ```
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

### Step 5：部署 Frontend (Next.js)

1. 點擊 **「Add Service」** → **「Git」**
2. 選擇同一個 GitHub Repo
3. **Root Directory** 設為：`frontend`
4. Zeabur 會自動偵測 Next.js 專案
5. 設定環境變數：
   ```
   NEXT_PUBLIC_API_URL=https://<your-backend-service>.zeabur.app
   ```

### Step 6：綁定 Domain

1. 分別為 Frontend 和 Backend 設定 **Domain**
2. Frontend：`your-app.zeabur.app`（使用者訪問的介面）
3. Backend：`your-api.zeabur.app`（API 端點）

---

## 4. 環境變數設定

### Backend 環境變數

| 變數名稱 | 說明 | 範例值 |
|----------|------|--------|
| `DATABASE_URL` | MySQL 連線字串 | `mysql+pymysql://<user>:<pass>@<host>:3306/fund_allocation` |
| `REDIS_URL` | Redis 連線字串 | `redis://:<password>@<host>:6379` |
| `FUGLE_API_KEY` | 富果 API Key | `YOUR_FUGLE_API_KEY` |
| `ALLOWED_ORIGINS` | CORS 允許來源 | `https://your-app.zeabur.app` |
| `AUTH_TOKEN_TTL` | Token 有效期（秒） | `86400` |

> **⚠️ 重要**：`ALLOWED_ORIGINS` 必須設為你的 Frontend Domain，否則瀏覽器會被 CORS 攔截。

#### Zeabur 變數綁定語法

Zeabur 支援跨服務變數引用。在 Backend 的環境變數中可使用：

```
DATABASE_URL=mysql+pymysql://${MYSQL_USERNAME}:${MYSQL_PASSWORD}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}
REDIS_URL=redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}
```

### Frontend 環境變數

| 變數名稱 | 說明 | 範例值 |
|----------|------|--------|
| `NEXT_PUBLIC_API_URL` | Backend API 位址 | `https://your-api.zeabur.app` |

---

## 5. 資料庫初始化

### 方法一：透過 Zeabur Console

1. 在 MySQL 服務 → **「Connect」** → 複製連線指令
2. 使用 MySQL Client 連線：
   ```bash
   mysql -h <host> -P <port> -u <user> -p
   ```
3. 貼上 `init.sql` 內容執行

### 方法二：透過本機連線

```bash
mysql -h <zeabur-mysql-host> -P <port> -u <user> -p < init.sql
```

### 方法三：Backend 自動建表

FastAPI 啟動時會透過 SQLAlchemy 的 `Base.metadata.create_all()` 自動建表。
但建議仍使用 `init.sql` 以確保 Index 和 Comment 正確建立。

---

## 6. 驗證部署

### 6.1 Backend 健康檢查

```bash
curl https://your-api.zeabur.app/
# 預期回應：{"status":"ok","service":"Fund Allocation System","version":"4.0.0"}
```

### 6.2 Dev 登入測試

```bash
curl -X POST https://your-api.zeabur.app/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test_user"}'
# 預期回應：{"token":"dev_xxx","user_id":"test_user","ttl":86400}
```

### 6.3 Frontend 頁面

1. 開啟 `https://your-app.zeabur.app`
2. 確認可以看到 Sidebar 和 Dashboard
3. 嘗試新增代操帳戶
4. 設定初始資金

---

## 7. 常見問題

### Q1：Backend 部署失敗 — Module Not Found

**原因**：`requirements.txt` 為空或缺少依賴。
**解決**：確認 `requirements.txt` 包含所有依賴：

```
fastapi==0.115.12
uvicorn[standard]==0.34.2
sqlalchemy==2.0.41
pymysql==1.1.1
pydantic==2.11.6
pydantic-settings==2.9.1
redis==6.2.0
httpx==0.28.1
fugle-marketdata==2.4.1
twstock==1.4.0
apscheduler==3.10.4
```

### Q2：CORS 錯誤

**原因**：Backend 的 `ALLOWED_ORIGINS` 未包含 Frontend Domain。
**解決**：
```
ALLOWED_ORIGINS=https://your-app.zeabur.app
```

### Q3：MySQL 連線失敗

**原因**：`DATABASE_URL` 格式錯誤或未同步 Zeabur 變數。
**解決**：使用 Zeabur 的變數引用語法（見第4節）。

### Q4：Redis 連線失敗

**原因**：Redis URL 格式需包含密碼。
**解決**：確認格式為 `redis://:<password>@<host>:<port>`。

### Q5：生產環境安全性

> **⚠️ 生產環境注意事項：**
> 1. 移除 `dev_auth.py` 路由（`/api/dev/login`）或加上 IP 白名單
> 2. 設定正式的 Auth Token 機制（由 Java MGR 系統寫入 Redis）
> 3. `ALLOWED_ORIGINS` 僅設定正式 Domain

---

## 部署檢查清單

- [ ] MySQL 服務已部署並記下連線資訊
- [ ] Redis 服務已部署並記下 `REDIS_URL`
- [ ] Backend 環境變數已設定（`DATABASE_URL`, `REDIS_URL`, `FUGLE_API_KEY`, `ALLOWED_ORIGINS`）
- [ ] Frontend 環境變數已設定（`NEXT_PUBLIC_API_URL`）
- [ ] `init.sql` 已在 MySQL 中執行
- [ ] Backend 健康檢查通過
- [ ] Frontend 頁面可正常訪問
- [ ] CORS 功能正常（前端可呼叫後端 API）
