import json
import redis
from app.core.config import settings

_pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis() -> redis.Redis:
    return redis.Redis(connection_pool=_pool)


def get_quote(symbol: str) -> dict | None:
    r = get_redis()
    raw = r.get(f"quote:{symbol}")
    if raw:
        return json.loads(raw)
    return None


def set_quote(symbol: str, data: dict, ttl: int = None) -> None:
    if ttl is None:
        ttl = settings.QUOTE_CACHE_TTL
    r = get_redis()
    r.setex(f"quote:{symbol}", ttl, json.dumps(data))


def get_stock_list_cache() -> list | None:
    r = get_redis()
    raw = r.get("stock_master:all")
    if raw:
        return json.loads(raw)
    return None


def set_stock_list_cache(data: list, ttl: int = 3600) -> None:
    r = get_redis()
    r.setex("stock_master:all", ttl, json.dumps(data, ensure_ascii=False))
