import json
import redis
from app.core.config import settings

_pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis():
    return redis.Redis(connection_pool=_pool)


def set_auth_token(token, user_id, ttl=None):
    if ttl is None:
        ttl = settings.AUTH_TOKEN_TTL
    r = get_redis()
    r.setex(f"auth:token:{token}", ttl, user_id)


def delete_auth_token(token):
    r = get_redis()
    r.delete(f"auth:token:{token}")


def get_quote(symbol):
    r = get_redis()
    raw = r.get(f"quote:{symbol}")
    if raw:
        return json.loads(raw)
    return None


def set_quote(symbol, data, ttl=None):
    if ttl is None:
        ttl = settings.QUOTE_CACHE_TTL
    r = get_redis()
    r.setex(f"quote:{symbol}", ttl, json.dumps(data))


def get_stock_list_cache():
    r = get_redis()
    raw = r.get("stock_master:all")
    if raw:
        return json.loads(raw)
    return None


def set_stock_list_cache(data, ttl=3600):
    r = get_redis()
    r.setex("stock_master:all", ttl, json.dumps(data, ensure_ascii=False))
