#!/bin/sh

echo "啟動 Tailscale 背景服務 (明確綁定 IPv4)..."
tailscaled --state=mem: --tun=userspace-networking --socks5-server=127.0.0.1:1055 &
sleep 3

echo "驗證 Tailscale 授權金鑰..."
tailscale up --authkey="${TAILSCALE_AUTHKEY}" --hostname="gcp-fund-api" --accept-routes

echo "等待 Tailscale 通道建立（自動輪詢偵測）..."
for i in $(seq 1 30); do
    if tailscale ping -c 1 100.93.200.127 > /dev/null 2>&1; then
        echo "✅ Tailscale 隧道已成功打通！"
        break
    fi
    echo "等待連線中... ($i/30)"
    sleep 1
done

echo "設定 Proxychains 攔截路由..."
# 建立 proxychains 設定檔，將所有底層流量導向 Tailscale SOCKS5 代理
cat <<EOF > /etc/proxychains4.conf
strict_chain
proxy_dns
remote_dns_subnet 224
tcp_read_time_out 15000
tcp_connect_time_out 8000
[ProxyList]
socks5  127.0.0.1 1055
EOF

echo "透過 Proxychains 啟動 FastAPI 應用程式..."
# 使用 proxychains4 包覆 uvicorn，它會自動把資料庫連線送進 Tailscale
exec proxychains4 -q uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}