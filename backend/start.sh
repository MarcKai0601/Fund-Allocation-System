#!/bin/sh

echo "啟動 Tailscale 背景服務 (明確綁定 IPv4)..."
tailscaled --state=mem: --tun=userspace-networking --socks5-server=127.0.0.1:1055 &
sleep 3

echo "驗證 Tailscale 授權金鑰..."
tailscale up --authkey="${TAILSCALE_AUTHKEY}" --hostname="gcp-fund-api" --accept-routes

echo "等待 Tailscale 通道建立（自動輪詢偵測）..."
# ⚠️ 這裡換成樹莓派的新 IP
for i in $(seq 1 30); do
    if tailscale ping -c 1 100.79.183.91 > /dev/null 2>&1; then
        echo "✅ Tailscale 隧道已成功打通！"
        break
    fi
    echo "等待連線中... ($i/30)"
    sleep 1
done

echo "設定 Socat 本地 TCP 轉發 (使用樹莓派新 IP)..."
# ⚠️ 這裡也換成新 IP，並將 socat 推入背景執行
socat TCP4-LISTEN:3306,fork,reuseaddr SOCKS5:127.0.0.1:100.79.183.91:3306,socksport=1055 &
socat TCP4-LISTEN:6379,fork,reuseaddr SOCKS5:127.0.0.1:100.79.183.91:6379,socksport=1055 &

echo "啟動 FastAPI 應用程式..."
# 移除 proxychains，直接啟動 uvicorn
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}