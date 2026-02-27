# Bug 處理紀錄

## Bug #001 — React Hydration Mismatch Error

| 項目 | 說明 |
|------|------|
| **發現日期** | 2026-02-27 |
| **嚴重程度** | Medium |
| **狀態** | ✅ 已修復 |
| **影響範圍** | 前端 Console 報錯，頁面可能閃爍 |

### 錯誤訊息

```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
This won't be patched up.
```

### 根因分析

Next.js 為 SSR 框架，Server 端先渲染 HTML，Client 端再 hydrate 接管互動。
若兩端渲染結果不一致就會觸發此錯誤。

**本案根因：`new Date()` 在 `useState` 初始值中直接呼叫**

SSR 時 `new Date()` 取得的是伺服器時間，Client 端 hydrate 時取得的是瀏覽器時間。
兩者時間差異（甚至跨日時區不同）導致 `trade_date` 值不一致。

#### 問題檔案

| 檔案 | 問題程式碼 |
|------|-----------|
| `frontend/src/app/funds/page.tsx` | `useState({ trade_date: new Date().toISOString().slice(0, 10) })` |
| `frontend/src/app/trades/page.tsx` | `defaultForm()` 中 `trade_date: new Date().toISOString().slice(0, 10)` |

### 修復方式

**策略**: 將 `new Date()` 呼叫從 `useState` 初始值移至 `useEffect`，確保只在 Client 端執行。

#### 修改前

```tsx
// ❌ SSR 與 CSR 時間不一致
const [form, setForm] = useState({
  trade_date: new Date().toISOString().slice(0, 10)
});
```

#### 修改後

```tsx
// ✅ 初始值用空字串，Client mount 後再設定
const [form, setForm] = useState({ trade_date: "" });

useEffect(() => {
  const today = new Date().toISOString().slice(0, 10);
  setForm(f => ({ ...f, trade_date: f.trade_date || today }));
}, []);
```

### 常見 Hydration Error 成因速查

| 成因 | 說明 | 解法 |
|------|------|------|
| `new Date()` / `Date.now()` | SSR vs CSR 時間不同 | 延遲至 `useEffect` |
| `Math.random()` | 每次呼叫值不同 | 延遲至 `useEffect` |
| `typeof window` 分支 | Server 無 window 物件 | 用 `mounted` state 守衛 |
| `toLocaleString()` | Server/Client locale 不同 | 統一 locale 參數或延遲渲染 |
| 瀏覽器擴充套件 | 修改 HTML 結構 | `suppressHydrationWarning` |
| HTML 巢套錯誤 | `<p>` 內包 `<div>` 等 | 修正 HTML 結構 |

### 預防措施

1. **禁止在 `useState` 初始值使用動態值**（`Date`, `Math.random` 等）
2. 動態值統一放在 `useEffect` 中設定
3. Theme 相關渲染使用 `mounted` 守衛模式
4. 定期檢查 Console 是否有 hydration warning
