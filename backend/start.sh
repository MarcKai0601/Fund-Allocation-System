#!/bin/sh

echo "啟動 Tailscale 背景服務..."
# 移除 userspace-networking，使用 Gen 2 原生支援的 TUN 模式
tailscaled --state=mem: &

# 等待背景服務就緒
sleep 3

echo "驗證 Tailscale 授權金鑰..."
# 使用環境變數帶入 Auth Key
tailscale up --authkey="${TAILSCALE_AUTHKEY}" --hostname="gcp-fund-api" --accept-routes

# 🌟 關鍵：給予 Tailscale 充裕的時間打通底層虛擬網卡與路由
echo "等待 Tailscale 隧道打通..."
sleep 10

echo "啟動 FastAPI 應用程式..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}