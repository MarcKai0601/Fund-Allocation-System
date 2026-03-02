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

    class Config:
        env_file = ".env"


settings = Settings()
