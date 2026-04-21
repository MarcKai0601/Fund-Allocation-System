#!/bin/sh

echo "啟動 Tailscale 背景服務 (Userspace 模式)..."
tailscaled --state=mem: --tun=userspace-networking --socks5-server=localhost:1055 &
sleep 3

echo "驗證 Tailscale 授權金鑰..."
tailscale up --authkey="${TAILSCALE_AUTHKEY}" --hostname="gcp-fund-api" --accept-routes

# 🌟 關鍵修改：延長等待時間到 15 秒，確保隧道徹底建立
echo "等待 Tailscale 網路連線至樹莓派..."
sleep 15

echo "設定 Socat 本地 TCP 轉發 (MySQL & Redis)..."
socat TCP4-LISTEN:3306,fork,reuseaddr SOCKS5:127.0.0.1:100.93.200.127:3306,socksport=1055 &
socat TCP4-LISTEN:6379,fork,reuseaddr SOCKS5:127.0.0.1:100.93.200.127:6379,socksport=1055 &

echo "啟動 FastAPI 應用程式..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}