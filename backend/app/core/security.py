"""
Security module — Java MGR SSO 整合
=====================================
使用 HTTPBearer 從 Header 取得 Token，
到 Redis 查詢 `token:<token>` 取得 Session JSON：
  {"UserId": 1, "Roles": {"FAS": ["ADMIN"], "MGR": ["USER"]}}

提供兩個核心 Dependency：
  - get_current_user  → 驗證 Token，回傳解析後的 Session dict
  - require_fas_access → 檢查 Roles 含 "FAS" Key，回傳 UserId (int)
"""
import json
import logging

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.redis_client import get_redis
from app.core.database import get_db
from app.models.portfolio import Portfolio

logger = logging.getLogger(__name__)

# ── HTTPBearer scheme ─────────────────────────────────────────────────────────
bearer_scheme = HTTPBearer()

TOKEN_PREFIX = "token:"


# ── Dependency 1: Token 驗證 ──────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    從 Authorization: Bearer <token> 取得 Token，
    到 Redis 查詢 `token:<token>` 取得 Session JSON。
    成功回傳 {"UserId": int, "Roles": dict}。
    """
    token = credentials.credentials
    r = get_redis()
    raw = r.get(f"{TOKEN_PREFIX}{token}")

    if not raw:
        logger.warning(f"Token validation failed: token not found in Redis")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Parse session JSON
    try:
        session = json.loads(raw) if isinstance(raw, str) else raw
    except (json.JSONDecodeError, TypeError):
        logger.error(f"Token session data is not valid JSON")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session data",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if "UserId" not in session:
        logger.error(f"Token session missing UserId field")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session: missing UserId",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return session


# ── Dependency 2: RBAC — FAS 系統權限檢查 ──────────────────────────────────────

def require_fas_access(
    session: dict = Depends(get_current_user),
) -> int:
    """
    檢查 Session 的 Roles 中是否包含 "FAS" Key。
    成功回傳 UserId (int) 給 Controller 使用。
    """
    roles = session.get("Roles", {})

    if "FAS" not in roles:
        logger.warning(
            f"User {session.get('UserId')} does not have FAS access. "
            f"Available roles: {list(roles.keys())}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to Fund Allocation System",
        )

    user_id = session["UserId"]
    logger.debug(f"FAS access granted: UserId={user_id}, FAS roles={roles['FAS']}")
    return int(user_id)


# ── Dependency 3: Portfolio 所有權驗證 (BOLA/IDOR 防護) ────────────────────────

def get_valid_portfolio(
    pid: int,
    user_id: int = Depends(require_fas_access),
    db: Session = Depends(get_db),
):
    """
    驗證 Portfolio 存在且屬於當前 UserId。
    成功回傳 Portfolio ORM 物件。
    """
    portfolio = db.query(Portfolio).filter(Portfolio.id == pid).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    if portfolio.owner_user_id != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied")
    return portfolio
