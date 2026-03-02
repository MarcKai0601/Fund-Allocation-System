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

> **現代做法**：不需要安裝完整的 Xcode（12GB+），只需安裝 **Command Line Tools** 與 **iOS Simulator Runtime** 即可在本機跑模擬器。完整 Xcode 只在需要上架到 App Store 或用原生模組時才必要。

### Step 1：安裝 Xcode Command Line Tools

```bash
xcode-select --install
```

> 安裝大約 500MB，遠比完整 Xcode 小。安裝後確認：
> ```bash
> xcode-select -p
> # 預期輸出：/Library/Developer/CommandLineTools
> ```

### Step 2：安裝 iOS Simulator Runtime（不需開啟 Xcode）

從 macOS 15 (Sequoia) 起，可以直接用指令下載模擬器 Runtime，不需要開 Xcode GUI：

```bash
# 列出可用的 simulator runtime
xcrun simctl runtime list

# 透過 Xcode CLI 下載最新 iOS simulator（約 7GB）
xcodebuild -downloadPlatform iOS
```

> 如果你偏好 GUI，也可以使用 **Simulator.app**（在 `/Applications/Simulator.app` 或從 Xcode 選單啟動），在其中直接管理裝置清單。

下載完成後，確認模擬器可用：
```bash
# 列出所有可用模擬器
xcrun simctl list devices available
```

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

> **現代做法**：直接用指令啟動，不需要打開 Xcode GUI。

```bash
cd ios-app
npx expo start --ios
```

或在 Expo 開發伺服器啟動後按 **`i`** 鍵。

Expo 會自動選擇最新的可用模擬器並啟動。如果你想指定裝置型號：

```bash
# 列出可用裝置
xcrun simctl list devices available | grep "iPhone"

# 啟動指定裝置（用 UDID 或名稱）
xcrun simctl boot "iPhone 16 Pro"
open -a Simulator
npx expo start --ios
```

> **首次啟動**會在模擬器上安裝 Expo Go App，需要幾分鐘。

### 模擬器常用操作

| 操作 | 快捷鍵 |
|------|--------|
| 搖一搖（開啟開發選單） | `Ctrl + Cmd + Z` |
| 重新載入 | 開發選單 → Reload 或按 `r` |
| Home 鍵 | `Cmd + Shift + H` |
| 旋轉 | `Cmd + ←` / `Cmd + →` |
| 截圖 | `Cmd + S` |

### 模擬器管理指令（xcrun simctl）

```bash
# 列出所有模擬器
xcrun simctl list devices

# 開機指定模擬器
xcrun simctl boot "iPhone 16 Pro"

# 關機所有模擬器
xcrun simctl shutdown all

# 刪除所有舊資料（相當於出廠重置）
xcrun simctl erase all

# 截圖存到桌面
xcrun simctl io booted screenshot ~/Desktop/screenshot.png
```

---

## 6. 在真實 iPhone 上運行

### 方法一：Expo Go App（最快，開發中推薦）

1. iPhone 上從 App Store 安裝 **Expo Go**
2. 確認 iPhone 和電腦在**同一個 WiFi**
3. 修改 `API_BASE` 為電腦的區域網路 IP
4. 執行 `npx expo start`
5. 用 iPhone 相機掃描終端機的 QR Code
6. 自動在 Expo Go 中打開 App

> 適合日常開發，無需 Apple Developer 帳號，即時熱更新。

### 方法二：EAS Build（接近正式 App 的體驗）

EAS（Expo Application Services）是 Expo 官方的雲端建置服務，**不需要在本機安裝完整 Xcode**：

```bash
# 安裝 EAS CLI
npm install -g eas-cli
eas login

# 建立 Development Build（第一次）
eas build --platform ios --profile development

# 後續開發：開發伺服器連接已安裝的 dev build
npx expo start --dev-client
```

> Development Build 安裝後的使用體驗幾乎等同於正式 App，支援原生模組（如 Camera、NFC 等），且後續修改 JS 程式碼**不需要重新 build**，只要重新整理即可。

### 方法三：本機 Development Build（需完整 Xcode）

如果需要快速迭代原生模組且不想等雲端 build：

```bash
# 需要完整 Xcode（App Store 安裝，約 12GB）
npx expo run:ios --device
```

---

## 7. 開發常用指令

```bash
# 啟動開發伺服器
npx expo start

# 直接開啟 iOS 模擬器
npx expo start --ios

# 連接已安裝的 Development Build
npx expo start --dev-client

# 清除快取重新啟動
npx expo start --clear

# 安裝新的 npm 套件（用 expo install 確保版本相容）
npx expo install <package-name>

# 檢查套件版本是否相容
npx expo install --check

# 升級 Expo SDK
npx expo upgrade

# 查看目前專案狀態與建議
npx expo doctor
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
   eas init   # 初始化 EAS 專案（首次）
   ```

> 使用 EAS 建置，**不需要在本機安裝完整 Xcode**，所有建置在 Expo 雲端執行。

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

### 8.3 EAS Build 流程（全雲端）

```bash
# 建置 production iOS build
eas build --platform ios --profile production

# 提交到 App Store（自動上傳到 App Store Connect）
eas submit --platform ios --latest
```

### 8.4 TestFlight 測試（強烈推薦）

正式審核前，先用 TestFlight 邀請測試者：

```bash
# 建置 preview build 並上傳到 TestFlight
eas build --platform ios --profile preview
eas submit --platform ios --latest
```

- 前往 [App Store Connect](https://appstoreconnect.apple.com)
- 在 TestFlight 頁籤邀請測試者（輸入 Email）
- 測試者安裝 **TestFlight App** 即可收到測試版

> TestFlight 無需通過完整審核，一般 1 天內會審核通過。

### 8.5 App Store 正式審核

- 填寫 App 資訊（截圖、描述、分類、隱私政策）
- 提交審核（通常 1-3 天）

---

## 9. 常見問題

### Q1：模擬器無法啟動

```bash
# 確認 Command Line Tools 已正確設定
xcode-select -p

# 重設指向正確路徑
sudo xcode-select --switch /Library/Developer/CommandLineTools

# 列出可用模擬器，確認有已下載的版本
xcrun simctl list devices available

# 重建模擬器清單
xcrun simctl delete unavailable
```

### Q2：真機連不到 API

- 確認 iPhone 和電腦在同一 WiFi
- 確認 `API_BASE` 設為電腦 IP（非 `localhost`）
- 確認 backend 用 `--host 0.0.0.0` 啟動
- 檢查防火牆是否阻擋 port 8000：
  ```bash
  # 暫時允許 port 8000（macOS）
  sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/bin/python3
  ```

### Q3：「xcrun: error: unable to find utility simctl」

代表 Command Line Tools 路徑設定錯誤：
```bash
sudo xcode-select --switch /Library/Developer/CommandLineTools
# 如果你有安裝完整 Xcode，改為：
sudo xcode-select --switch /Applications/Xcode.app
```

### Q4：React Native 跟 React 的差異

| React (Web) | React Native (Mobile) |
|-------------|----------------------|
| `<div>` | `<View>` |
| `<span>`, `<p>` | `<Text>`（所有文字必須包在 Text 中） |
| `onClick` | `onPress` |
| `className` | `style={styles.xxx}` |
| CSS 檔案 | `StyleSheet.create({...})` |
| `window.alert()` | `Alert.alert()` |
| `fetch` / `axios` | 一樣用 `axios` ✅ |

### Q5：如何新增頁面？

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

### Q6：修改 App 圖示

將圖示（1024x1024 PNG）放到 `ios-app/assets/icon.png`，Expo 會自動處理各尺寸。

---

## 快速開始（TL;DR）

```bash
# 1. 安裝 Command Line Tools（不需要完整 Xcode！）
xcode-select --install

# 2. 下載 iOS Simulator Runtime
xcodebuild -downloadPlatform iOS

# 3. 安裝專案依賴
cd ios-app && npm install

# 4. 啟動 backend
cd ../backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 5. 啟動 iOS 模擬器（新開一個 terminal）
cd ../ios-app && npx expo start --ios
```

> **真機測試最快方式**：iPhone 安裝 [Expo Go](https://apps.apple.com/app/expo-go/id982107779)，執行 `npx expo start` 掃 QR Code 即可。無需任何 Apple Developer 帳號。
