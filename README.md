# 代操投資資金與台股績效管理系統
> Fund Allocation & Taiwan Stock Performance Management System

---

## 專案結構

```
Fund Allocation System/
├── init.sql              ← 資料庫初始化腳本（先執行此檔）
├── backend/              ← FastAPI 後端
│   ├── .env.example      ← 環境變數範本
│   ├── requirements.txt  ← Python 套件清單
│   ├── main.py           ← API 入口
│   └── app/
│       ├── core/         ← 設定、DB、Redis
│       ├── models/       ← SQLAlchemy ORM 模型
│       ├── schemas/      ← Pydantic 資料模型
│       ├── services/     ← 業務邏輯
│       ├── api/          ← 路由 handlers
│       └── tasks/        ← 背景任務（股票同步）
└── frontend/             ← Next.js 14 前端
    └── src/
        ├── app/          ← 頁面 (Dashboard / Funds / Trades)
        ├── components/   ← UI 元件
        └── lib/          ← API 客戶端
```

---

## 快速啟動

### 1. 建立資料庫

```bash
# 登入 MySQL 後執行初始化腳本
mysql -u root -p < init.sql
```

### 2. 啟動後端

```bash
cd backend

# 複製環境變數
cp .env.example .env
# 編輯 .env 填入你的 MySQL 密碼與 Redis 位址

# 建立虛擬環境並安裝套件
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 啟動開發伺服器
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API 文件：http://localhost:8000/docs

### 3. 啟動前端

```bash
cd frontend
npm install
npm run dev
```

前端：http://localhost:3000

---

## 環境需求

| 項目 | 版本 |
|------|------|
| Python | 3.11+ |
| Node.js | 18+ |
| MySQL | 8.0+ |
| Redis | 7.0+ |

---

## 核心 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/funds/init` | 初始化代操資金（只能一次） |
| POST | `/api/funds/deposit` | 新增後續資金 |
| GET | `/api/funds/ledger` | 取得資金異動明細 |
| POST | `/api/trades` | 新增交易（買/賣） |
| GET | `/api/trades` | 取得交易歷史（可過濾股票代號） |
| GET | `/api/portfolio` | 取得持股與即時損益 |
| GET | `/api/stocks/search?q=` | 台股搜尋 autocomplete |

---

## 商業邏輯

- **可用資金** = 總入金 − 持倉成本
- **買入**：以平均成本法更新庫存
- **賣出**：以 **FIFO** 計算已實現損益
- **即時報價**：透過 yfinance 抓取，快取至 Redis（TTL 120 秒）
- **股票清單**：啟動時自動同步（使用 twstock；無法連線時採用內建熱門股清單）
