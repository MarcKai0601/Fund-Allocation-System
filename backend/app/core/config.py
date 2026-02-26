from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/fund_allocation"
    REDIS_URL: str = "redis://localhost:6379/0"
    QUOTE_CACHE_TTL: int = 120  # seconds
    STOCK_SYNC_INTERVAL_HOURS: int = 24
    FUGLE_API_KEY: str = ""  # 富果 Market Data API Key

    class Config:
        env_file = ".env"


settings = Settings()
