# Fund Allocation System — iOS App 開發指南

**適用對象**: 首次開發 iOS App 的開發者  
**技術棧**: Expo + React Native + TypeScript  
**前置條件**: macOS 電腦

---

## 目錄

1. [為什麼選擇 Expo？](#1-為什麼選擇-expo)
2. [環境安裝](#2-環境安裝)
3. [專案結構說明](#3-專案結構說明)
4. [啟動開發](#4-啟動開發)
5. [在 iOS 模擬器上運行](#5-在-ios-模擬器上運行)
6. [在真實 iPhone 上運行](#6-在真實-iphone-上運行)
7. [開發常用指令](#7-開發常用指令)
8. [打包發布到 App Store](#8-打包發布到-app-store)
9. [常見問題](#9-常見問題)

---

## 1. 為什麼選擇 Expo？

| 比較 | 原生 Swift/Xcode | React Native (Expo) |
|------|------------------|---------------------|
| 語言 | Swift (全新學習) | TypeScript (你已熟悉) |
| UI 框架 | SwiftUI | React (你已熟悉) |
| API 串接 | URLSession | Axios (你已熟悉) |
| 學習成本 | ⬆️ 高 | ⬇️ 低 |
| 跨平台 | ❌ 僅 iOS | ✅ iOS + Android |
| 熱更新 | ❌ | ✅ 即時預覽變更 |

> **結論**: 因為你已經會 TypeScript + React，用 Expo 開發 iOS App 的學習成本最低，程式碼結構幾乎和 Next.js 前端一樣。

---

## 2. 環境安裝

### Step 1：安裝 Xcode（必要）

```bash
# 從 App Store 安裝 Xcode（約 12GB，需要時間）
# 搜尋 "Xcode" → 安裝
```

安裝完成後，開啟 Xcode 一次並同意所有條款。

然後安裝 Command Line Tools：
```bash
xcode-select --install
```

### Step 2：安裝 iOS Simulator

1. 開啟 **Xcode**
2. 選單列 → **Xcode** → **Settings** (或 Preferences)
3. 點 **Platforms** 頁籤
4. 點 **+** 加入 **iOS xx.x Simulator**（選最新版）
5. 下載完成即可

### Step 3：確認 Node.js

```bash
node --version   # 需要 v18 以上
npm --version    # 需要 v9 以上
```

如果沒有安裝：
```bash
brew install node
```

### Step 4：安裝專案依賴

```bash
cd ios-app
npm install
```

---

## 3. 專案結構說明

```
ios-app/
├── App.tsx                     ← 🏠 App 入口（類似 Next.js 的 layout.tsx）
│                                  設定底部 Tab 導航（4 個頁籤）
├── app.json                    ← 📱 App 設定檔（名稱、圖示、版本）
├── package.json                ← 📦 依賴管理
│
└── src/
    ├── lib/                    ← 🔧 共用邏輯（跟 Web 前端同結構！）
    │   ├── api.ts              │  API 呼叫 + Axios 攔截器
    │   ├── auth-store.ts       │  Token 管理 (AsyncStorage)
    │   └── portfolio-store.ts  │  帳戶狀態管理
    │
    └── screens/                ← 📺 畫面（類似 Next.js 的 page.tsx）
        ├── DashboardScreen.tsx │  總覽 Dashboard
        ├── FundsScreen.tsx     │  資金管理
        ├── TradesScreen.tsx    │  交易紀錄
        └── SettingsScreen.tsx  │  帳戶管理
```

### Web vs Mobile 對照表

| Web (Next.js) | Mobile (Expo) | 說明 |
|---------------|---------------|------|
| `page.tsx` | `XxxScreen.tsx` | 頁面元件 |
| `<div>` | `<View>` | 容器 |
| `<p>`, `<h1>` | `<Text>` | 文字（必須用 Text 包裹） |
| `<button>` | `<TouchableOpacity>` | 按鈕 |
| `<input>` | `<TextInput>` | 輸入框 |
| CSS / Tailwind | `StyleSheet.create()` | 樣式 |
| `localStorage` | `AsyncStorage` | 持久化儲存 |
| `useRouter()` | Tab Navigation | 頁面導航 |
| `npm run dev` | `npx expo start` | 開發伺服器 |

---

## 4. 啟動開發

### 4.1 修改 API 位址

開啟 `ios-app/src/lib/api.ts`，修改第 5 行：

```typescript
// 模擬器用 localhost 即可
const API_BASE = "http://localhost:8000";

// 真機測試時，改為你電腦的區域網路 IP
// const API_BASE = "http://192.168.1.xxx:8000";
```

> **如何取得區域網路 IP？**
> ```bash
> ipconfig getifaddr en0
> ```

### 4.2 確認 Backend 運行中

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> `--host 0.0.0.0` 很重要！這樣真機才能連到你的電腦。

### 4.3 啟動 Expo 開發伺服器

```bash
cd ios-app
npx expo start
```

終端機會顯示一個 QR Code 和選單：

```
› Press i │ open iOS simulator
› Press a │ open Android emulator
› Press w │ open web browser
› Press r │ reload app
```

---

## 5. 在 iOS 模擬器上運行

1. 確認 Xcode 和模擬器已安裝（[Step 1-2](#step-1安裝-xcode必要)）
2. 執行：

```bash
cd ios-app
npx expo start --ios
```

或者在 Expo 開發伺服器啟動後，按 **`i`** 鍵。

> **首次啟動會在模擬器上安裝 Expo Go App，需要幾分鐘。**

### 模擬器常用操作

| 操作 | 快捷鍵 |
|------|--------|
| 搖一搖（開啟開發選單） | `Ctrl + Cmd + Z` |
| 重新載入 | 開發選單 → Reload 或按 `r` |
| Home 鍵 | `Cmd + Shift + H` |
| 旋轉 | `Cmd + ←` / `Cmd + →` |

---

## 6. 在真實 iPhone 上運行

### 方法一：Expo Go App（最簡單）

1. iPhone 上從 App Store 安裝 **Expo Go**
2. 確認 iPhone 和電腦在**同一個 WiFi**
3. 修改 `API_BASE` 為電腦的區域網路 IP
4. 執行 `npx expo start`
5. 用 iPhone 相機掃描終端機的 QR Code
6. 自動在 Expo Go 中打開 App

### 方法二：Development Build（更完整）

如果用到原生模組（如 Camera），需要 Development Build：

```bash
npx expo install expo-dev-client
npx expo run:ios --device
```

> 這需要 Apple Developer Account（免費版可側載到自己的設備）。

---

## 7. 開發常用指令

```bash
# 啟動開發伺服器
npx expo start

# 直接開啟 iOS 模擬器
npx expo start --ios

# 清除快取重新啟動
npx expo start --clear

# 安裝新的 npm 套件
npx expo install <package-name>

# 檢查哪些套件需要更新
npx expo install --check
```

---

## 8. 打包發布到 App Store

### 8.1 前置準備

1. **Apple Developer Account**（$99 USD/年）
   - 前往 [developer.apple.com](https://developer.apple.com) 註冊
2. **EAS CLI**（Expo Application Services）
   ```bash
   npm install -g eas-cli
   eas login
   ```

### 8.2 設定 app.json

```json
{
  "expo": {
    "name": "代操管理系統",
    "slug": "fund-allocation-system",
    "version": "4.0.0",
    "ios": {
      "bundleIdentifier": "com.yourname.fundallocation",
      "buildNumber": "1"
    }
  }
}
```

### 8.3 建置 iOS App

```bash
# 產生 iOS build
eas build --platform ios

# 提交到 App Store
eas submit --platform ios
```

### 8.4 App Store 審核

- 建置完成後，前往 [App Store Connect](https://appstoreconnect.apple.com)
- 填寫 App 資訊（截圖、描述、分類）
- 提交審核（通常 1-3 天）

> **💡 提示**: 測試階段可使用 **TestFlight** 發送給測試者，不需要通過正式審核。

---

## 9. 常見問題

### Q1：模擬器打不開

```bash
# 重新安裝模擬器
sudo xcode-select -s /Applications/Xcode.app
xcodebuild -runFirstLaunch
```

### Q2：真機連不到 API

- 確認 iPhone 和電腦在同一 WiFi
- 確認 `API_BASE` 設為電腦 IP（非 `localhost`）
- 確認 backend 用 `--host 0.0.0.0` 啟動
- 檢查防火牆是否阻擋 port 8000

### Q3：React Native 跟 React 的差異

| React (Web) | React Native (Mobile) |
|-------------|----------------------|
| `<div>` | `<View>` |
| `<span>`, `<p>` | `<Text>`（所有文字必須包在 Text 中） |
| `onClick` | `onPress` |
| `className` | `style={styles.xxx}` |
| CSS 檔案 | `StyleSheet.create({...})` |
| `window.alert()` | `Alert.alert()` |
| `fetch` / `axios` | 一樣用 `axios` ✅ |

### Q4：如何新增頁面？

1. 在 `src/screens/` 建立 `NewScreen.tsx`
2. 在 `App.tsx` 的 `<Tab.Navigator>` 中新增：
```tsx
<Tab.Screen
  name="New"
  component={NewScreen}
  options={{
    title: "新頁面",
    tabBarIcon: ({ focused }) => <TabIcon label="🆕" focused={focused} />,
  }}
/>
```

### Q5：修改 App 圖示

將圖示（1024x1024 PNG）放到 `ios-app/assets/icon.png`，Expo 會自動處理各尺寸。

---

## 快速開始（TL;DR）

```bash
# 1. 安裝 Xcode（App Store）
# 2. 安裝 CLI tools
xcode-select --install

# 3. 安裝依賴
cd ios-app && npm install

# 4. 啟動 backend
cd ../backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 5. 啟動 iOS 模擬器
cd ../ios-app && npx expo start --ios
```
