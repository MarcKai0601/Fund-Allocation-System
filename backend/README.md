# 後端服務 — FastAPI Backend

代操投資資金管理系統的 API 後端，使用 **Python FastAPI + MySQL + Redis** 建構。

---

## 環境需求

| 工具 | 版本 |
|------|------|
| Python | 3.11+ |
| MySQL | 8.0+ |
| Redis | 7.0+ |

---

## 初次設定

### 1. 建立資料庫

> ⚠️ 請先確認 MySQL 已啟動。

在專案根目錄執行初始化腳本（`init.sql` 位於 `../init.sql`）：

```bash
mysql -u root -p < ../init.sql
```

這會建立 `fund_allocation` 資料庫與以下資料表：

| 資料表 | 用途 |
|--------|------|
| `account` | 帳戶狀態（可用資金、總成本、損益） |
| `fund_ledger` | 每一筆入金異動紀錄 |
| `stock_master` | 台股上市/上櫃基礎清單 |
| `transactions` | 買賣交易明細 |
| `positions` | 目前庫存（平均成本） |
| `fifo_lots` | 買入批次（供 FIFO 損益計算） |

---

### 2. 設定環境變數

```bash
cp .env.example .env
```

編輯 `.env`：

```
DATABASE_URL=mysql+pymysql://root:你的密碼@localhost:3306/fund_allocation
REDIS_URL=redis://localhost:6379/0
FUGLE_API_KEY=你的富果APIKey
```

> **如何取得富果 API Key？**
> 前往 [富果開發者平台](https://developer.fugle.tw/) 註冊帳號，在後台建立 API Token 後填入上方 `FUGLE_API_KEY`。
> 若未填入，系統仍可啟動，但 Dashboard 持倉的「現價 / 損益」欄位將顯示 `—`。

---

### 3. 建立虛擬環境並安裝套件

```bash
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

### 4. 啟動開發伺服器

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- **API 根目錄**：http://localhost:8000
- **互動式文件（Swagger）**：http://localhost:8000/docs
- **ReDoc 文件**：http://localhost:8000/redoc

> 啟動時會自動偵測並同步台股清單（twstock）；若失敗則使用內建熱門股票備用清單。

---

## 核心 API 一覽

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/api/funds/init` | 初始化代操資金（只能執行一次） |
| `POST` | `/api/funds/deposit` | 新增後續資金（增資） |
| `GET` | `/api/funds/ledger` | 取得資金異動明細 |
| `GET` | `/api/funds/account` | 取得帳戶狀態快照 |
| `POST` | `/api/trades` | 新增交易（買入 / 賣出） |
| `GET` | `/api/trades?symbol=2330` | 取得交易歷史（可依股票代號過濾） |
| `GET` | `/api/portfolio` | 取得持股與即時未實現損益 |
| `GET` | `/api/stocks/search?q=台積` | 台股搜尋（autocomplete） |

---

## 開發模式（Dev Mode Bypass）

本系統的認證完全依賴外部 SSO；開發或管理作業時可啟用 **Dev Mode**，直接在後端建立 Session Token，跳過 SSO 流程。

> ⚠️ **警告：正式環境絕對不可開啟 Dev Mode。** 啟用後任何人只要知道 `DEV_SECRET` 即可以任意身份登入。

### 1. 啟用 Dev Mode

在 `backend/.env` 加入：

```
DEV_MODE_ENABLED=true
DEV_SECRET=your-local-secret
FRONTEND_URL=http://localhost:3000
```

重啟後端後，Swagger 文件（http://localhost:8000/docs）會出現 **Dev (開發模式)** 分類的路由，終端機也會顯示警告訊息。

---

### 2. 瀏覽器一鍵登入（最常用）

直接在瀏覽器網址列輸入以下 URL，後端會自動建立 Token 並 302 跳轉到前端完成登入，**無需任何手動操作**：

```
http://localhost:8000/api/dev/redirect?dev_secret=your-local-secret&user_id=1&username=kai&roles=ADMIN
```

| 參數 | 說明 | 必填 |
|------|------|------|
| `dev_secret` | 與 `.env` 的 `DEV_SECRET` 相同 | 是 |
| `user_id` | 登入身份的 user ID | 是 |
| `username` | 顯示名稱 | 否 |
| `roles` | FAS 角色，逗號分隔；可填 `ADMIN`、`USER` | 否，預設 `USER` |
| `language` | 介面語言，如 `zh-TW`、`en` | 否，預設 `zh-TW` |

> 可以把常用的 URL **存成書籤**，例如分別建立 ADMIN / USER 兩個書籤快速切換身份。

**運作流程：**

```
瀏覽器開啟 /api/dev/redirect?...
    ↓ 後端建立 Redis Session，寫入 token
302 → http://localhost:3000/?token=<uuid>
    ↓ 前端 TokenCatcher 讀取 ?token
    ↓ 呼叫 /api/auth/me 驗證
    ↓ 存入 Zustand（localStorage）
    ↓ URL 自動清除 token 參數
已登入，進入 Dashboard
```

---

### 3. 程式 / curl 取得 Token

若需要在腳本或 CI 中使用：

```bash
curl -X POST http://localhost:8000/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{
    "dev_secret": "your-local-secret",
    "user_id": "1",
    "username": "kai",
    "roles": ["ADMIN"],
    "language": "zh-TW"
  }'
```

回應範例：

```json
{
  "token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "user_id": "1",
  "username": "kai",
  "roles": ["ADMIN"],
  "expires_in": 1800
}
```

Token 有效期預設 1800 秒，每次呼叫 API 都會自動延長（sliding window）。

---

### 4. 在 Swagger / curl 使用 Token

將取得的 Token 放入 `Authorization` header：

```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

或在 Swagger UI 右上角點擊 **Authorize**，填入 `Bearer <token>`。

---

### 4. 撤銷 Token

```bash
curl -X DELETE "http://localhost:8000/api/dev/logout?dev_secret=your-local-secret" \
  -H "Authorization: Bearer xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Token 會立即從 Redis 刪除，後續請求將收到 401。

---

### 5. 關閉 Dev Mode

將 `.env` 中的 `DEV_MODE_ENABLED` 改回 `false`（或直接移除），重啟後端。`/api/dev/*` 路由將完全不掛載，Swagger 也不會顯示。

---

## 商業邏輯說明

### 買入 (BUY)
1. 檢查「可用資金」是否足夠
2. 以**加權平均成本法**更新 `positions`
3. 在 `fifo_lots` 新增買入批次（供賣出時 FIFO 計算用）
4. 從 `account.available_funds` 扣除花費

### 賣出 (SELL)
1. 檢查庫存股數是否足夠
2. 按照 **FIFO（先進先出）** 消耗最舊的買入批次，計算成本
3. 計算 `pnl`（已實現損益）與 `pnl_pct`（報酬率）
4. 將賣出收入加回 `account.available_funds`

### 即時報價
- 先查 **Redis 快取**（TTL 120 秒）
- 若未命中，呼叫 **yfinance** 抓取 `.TW` / `.TWO` 報價
- 結果寫回 Redis 供後續請求使用

---

## 專案結構

```
backend/
├── main.py               # FastAPI 入口，含 lifespan 事件
├── requirements.txt
├── .env.example
└── app/
    ├── core/
    │   ├── config.py     # 環境變數設定（Pydantic Settings）
    │   ├── database.py   # SQLAlchemy engine + get_db()
    │   └── redis_client.py
    ├── models/           # ORM：account / fund_ledger / stock_master / transaction / position / fifo_lot
    ├── schemas/
    │   └── schemas.py    # 所有 Pydantic v2 Request/Response 模型
    ├── services/
    │   ├── fund_service.py   # 資金初始化與增資
    │   ├── trade_service.py  # 買賣邏輯（FIFO + 平均成本）
    │   └── quote_service.py  # 報價抓取與損益計算
    ├── api/
    │   ├── funds.py
    │   ├── trades.py
    │   ├── portfolio.py
    │   └── stocks.py
    └── tasks/
        └── stock_sync.py # 股票清單同步背景任務
```
