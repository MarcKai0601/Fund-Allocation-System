#!/bin/sh

echo "啟動 Tailscale 背景服務 (明確綁定 IPv4 127.0.0.1)..."
# 明確指定 127.0.0.1，避免 localhost 解析為 IPv6 導致 socat 找不到代理
tailscaled --state=mem: --tun=userspace-networking --socks5-server=127.0.0.1:1055 &
sleep 3

echo "驗證 Tailscale 授權金鑰..."
tailscale up --authkey="${TAILSCALE_AUTHKEY}" --hostname="gcp-fund-api" --accept-routes

echo "等待 Tailscale 通道建立（自動輪詢偵測）..."
# 每秒自動 Ping 樹莓派，最多等待 30 秒，確定網路通了才放行
for i in $(seq 1 30); do
    if tailscale ping -c 1 100.93.200.127 > /dev/null 2>&1; then
        echo "✅ Tailscale 隧道已成功打通！"
        break
    fi
    echo "等待連線中... ($i/30)"
    sleep 1
done

echo "--- 最終 Tailscale 狀態 ---"
tailscale status
echo "---------------------------"

echo "設定 Socat 本地 TCP 轉發 (開啟詳細日誌)..."
socat -d -d TCP4-LISTEN:3306,fork,reuseaddr SOCKS5:127.0.0.1:100.93.200.127:3306,socksport=1055 &
socat -d -d TCP4-LISTEN:6379,fork,reuseaddr SOCKS5:127.0.0.1:100.93.200.127:6379,socksport=1055 &

echo "啟動 FastAPI 應用程式..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}