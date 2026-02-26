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
