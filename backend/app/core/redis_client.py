import json
import redis
from app.core.config import settings

_pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis():
    return redis.Redis(connection_pool=_pool)


def set_auth_token(token: str, user_id: int, roles: dict | None = None, ttl: int | None = None):
    """
    寫入 Token Session 到 Redis (與 Java MGR 共用格式)。
    Key: token:<token>
    Value: JSON {"UserId": int, "Roles": {"FAS": [...], ...}}
    """
    if ttl is None:
        ttl = settings.AUTH_TOKEN_TTL
    if roles is None:
        roles = {"FAS": ["ADMIN"]}
    r = get_redis()
    session = json.dumps({"UserId": user_id, "Roles": roles})
    r.setex(f"token:{token}", ttl, session)


def get_auth_session(token: str) -> dict | None:
    """從 Redis 讀取 Token Session JSON。"""
    r = get_redis()
    raw = r.get(f"token:{token}")
    if raw:
        return json.loads(raw)
    return None


def delete_auth_token(token: str):
    r = get_redis()
    r.delete(f"token:{token}")


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
