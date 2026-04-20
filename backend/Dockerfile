# 使用輕量級的 Python 3.11 作為基底
FROM python:3.11-slim

# 安裝 Tailscale、socat 與必要系統工具
RUN apt-get update && apt-get install -y curl gnupg socat && \
    curl -fsSL https://tailscale.com/install.sh | sh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 設定工作目錄
WORKDIR /app

# 複製依賴清單並安裝套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製專案原始碼與啟動腳本
COPY . .

# 賦予腳本執行權限
RUN chmod +x start.sh

# 宣告 Cloud Run 預設通訊埠
ENV PORT=8080
EXPOSE 8080

# 容器啟動時，執行我們的雙核心腳本
CMD ["./start.sh"]