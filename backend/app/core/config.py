from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/fund_allocation"
    REDIS_URL: str = "redis://localhost:6379/0"
    QUOTE_CACHE_TTL: int = 120
    STOCK_SYNC_INTERVAL_HOURS: int = 24
    FUGLE_API_KEY: str = ""
    # 第二組 Fugle token，專供「新增交易時選股即時報價」使用
    # 若未設定，則 fallback 至 FUGLE_API_KEY
    FUGLE_API_KEY_QUOTE: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    AUTH_TOKEN_TTL: int = 86400
    SLIDING_WINDOW_TTL: int = 1800    # 每次 API 呼叫自動延長 30 分鐘
    # 開發模式：設為 True 才會掛載 /api/dev/* 路由（絕對不可在正式環境開啟）
    DEV_MODE_ENABLED: bool = False
    DEV_SECRET: str = ""              # 呼叫 dev 端點時必須附帶的額外密碼
    FRONTEND_URL: str = "http://localhost:3000"  # dev redirect 跳轉目標
    INITIAL_ADMIN_USER_IDS: str = ""             # 逗號分隔；啟動時自動授予 SYSTEM_ADMIN

    class Config:
        env_file = ".env"


settings = Settings()
