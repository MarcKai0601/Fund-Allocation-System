# 前端應用 — Next.js Frontend

代操投資資金管理系統的前端介面，使用 **Next.js 14 + Tailwind CSS v4 + Shadcn UI** 建構。

---

## 環境需求

| 工具 | 版本 |
|------|------|
| Node.js | 18+ |
| npm | 9+ |

> 後端 API 需先啟動（預設 http://localhost:8000）

---

## 快速啟動

```bash
# 安裝套件
npm install

# 開發模式
npm run dev
```

前端運行於 **http://localhost:3000**

---

## 環境變數

若後端不在預設位址，可新增 `.env.local`：

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 頁面說明

### `/` — Dashboard 總覽
- 5 張數據卡片：**總資產、可用資金、持倉成本、未實現損益、已實現損益**
- 持股庫存表格，顯示：現價、今日漲跌幅、未實現損益、報酬率
- 每 **60 秒**自動向後端拉取最新報價

### `/funds` — 資金管理
- 帳戶摘要卡片（總入金、可用資金、已實現損益）
- 資金異動明細表格（初始資金 / 增資 / 出金）
- **設定初始資金**：只能執行一次，設定後鎖定
- **新增資金**：後續增資操作

### `/trades` — 交易紀錄
- **新增交易**表單（含股票 autocomplete 搜尋）
- 選擇買入 / 賣出、填入價格、數量、手續費、日期
- 歷史交易表格，顯示損益（賣出時才有 FIFO 損益計算結果）
- 支援依**股票代號**過濾

---

## 技術棧

| 項目 | 套件 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 樣式 | Tailwind CSS v4 |
| UI 元件 | Shadcn UI |
| HTTP 客戶端 | Axios |
| 圖示 | Lucide React |
| 通知 | Sonner |

---

## 專案結構

```
frontend/
└── src/
    ├── app/
    │   ├── layout.tsx          # 根 Layout（側邊欄 + Toaster）
    │   ├── globals.css         # 全域樣式（Tailwind v4 @theme 變數）
    │   ├── page.tsx            # Dashboard 頁面
    │   ├── funds/
    │   │   └── page.tsx        # 資金管理頁面
    │   └── trades/
    │       └── page.tsx        # 交易紀錄頁面
    ├── components/
    │   ├── Sidebar.tsx         # 左側導覽列
    │   └── ui/                 # Shadcn UI 元件
    └── lib/
        ├── api.ts              # 所有 API 呼叫與型別定義
        └── utils.ts            # cn() 工具函式
```

---

## 常用指令

```bash
npm run dev      # 啟動開發伺服器（含 HMR）
npm run build    # 建置生產版本
npm run start    # 啟動生產伺服器
npm run lint     # 執行 ESLint 檢查
```
