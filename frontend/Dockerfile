# 階段 1: 安裝依賴
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 階段 2: 構建 (Builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 👉 這裡負責接收 GCP 打包時傳進來的網址變數
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_SSO_LOGIN_URL
ENV NEXT_PUBLIC_SSO_LOGIN_URL=$NEXT_PUBLIC_SSO_LOGIN_URL

RUN npm run build

# 階段 3: 執行 (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# 這裡設定 8080 以符合 Cloud Run 的預設要求
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製打包好的靜態檔案與獨立執行檔
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]