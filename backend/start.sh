#!/bin/sh

echo "啟動 Tailscale 背景服務..."
# state=mem: 讓 Tailscale 在記憶體中運作，不寫入硬碟
tailscaled --state=mem: &

# 等待 3 秒讓背景服務就緒
sleep 3

echo "驗證 Tailscale 授權金鑰..."
# 使用環境變數帶入 Auth Key，設定專屬主機名稱
tailscale up --authkey="${TAILSCALE_AUTHKEY}" --hostname="gcp-fund-api" --accept-routes

# 🌟 新增這裡：讓子彈飛一會兒，確保虛擬網路完全建立
echo "等待 Tailscale 隧道打通..."
sleep 5

echo "啟動 FastAPI 應用程式..."
# 啟動你的 Python 專案 (Cloud Run 會自動提供 $PORT 變數，預設 8080)
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}