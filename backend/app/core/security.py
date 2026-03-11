import json
import logging
from typing import Optional

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.redis_client import get_redis
from app.core.config import settings
from app.core.database import get_db
from app.models.portfolio import Portfolio

logger = logging.getLogger(__name__)

# ── HTTPBearer scheme ─────────────────────────────────────────────────────────
bearer_scheme = HTTPBearer()

TOKEN_PREFIX = "token:"

# ── Pydantic Models ───────────────────────────────────────────────────────────
class UserSession(BaseModel):
    """從 Redis Session 解析出來的使用者資訊"""
    user_id: str
    username: Optional[str] = None
    roles: list[str] = []  # 這裡只存放屬於 FAS 的角色代碼 (如 ["ADMIN", "USER"])
    language: Optional[str] = "zh-TW"


# ── Dependency 1: Token 驗證與滑動視窗 ─────────────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """從 Redis 驗證 Token，並延長壽命 (滑動視窗)，回傳原始 Session 字典"""
    token = credentials.credentials
    r = get_redis()
    raw = r.get(f"{TOKEN_PREFIX}{token}")

    if not raw:
        logger.warning("Token validation failed: token not found in Redis")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        session = json.loads(raw) if isinstance(raw, str) else raw
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session data",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = session.get("userId") or session.get("UserId")
    if not user_id:
        logger.error("Token session missing UserId field")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session: missing UserId",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 滑動視窗延壽機制
    ttl = getattr(settings, "SLIDING_WINDOW_TTL", 1800)
    r.expire(f"{TOKEN_PREFIX}{token}", ttl)

    return session


# ── Dependency 2: 提取 FAS 角色並封裝為 UserSession ───────────────────────────
def get_current_user_session(session: dict = Depends(get_current_user)) -> UserSession:
    """將 Java 回傳的複雜角色結構，扁平化提取出屬於 FAS 的角色"""
    user_id = str(session.get("userId") or session.get("UserId"))
    username = session.get("username") or session.get("Username")
    raw_roles = session.get("roles") or session.get("Roles") or []
    
    fas_roles = []
    # 解析新結構: [{"systemCode": "FAS", "roleCode": "USER"}, ...]
    for role in raw_roles:
        if isinstance(role, dict) and role.get("systemCode") == "FAS":
            fas_roles.append(role.get("roleCode"))
        elif isinstance(role, str): # 容錯: 如果還是舊的純字串陣列
            fas_roles.append(role)

    language = session.get("language") or session.get("Language") or "zh-TW"

    return UserSession(user_id=user_id, username=username, roles=fas_roles, language=language)


# ── Dependency 3: 基本 FAS 系統權限檢查 ──────────────────────────────────────
def require_fas_access(
    user_session: UserSession = Depends(get_current_user_session),
) -> int:
    """只要擁有任何一個 FAS 角色即可放行"""
    if not user_session.roles:
        logger.warning(f"User {user_session.user_id} does not have FAS access.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to Fund Allocation System",
        )
    
    return int(user_session.user_id)


# ── Dependency 4: RBAC — RequireRole 通用角色檢查 ─────────────────────────────
class RequireRole:
    """
    用於細部控制 API 需要什麼角色 (例如 Depends(RequireRole("ADMIN")))
    """
    def __init__(self, *required_roles: str):
        if not required_roles:
            raise ValueError("RequireRole requires at least one role code")
        self.required_roles = set(required_roles)

    def __call__(
        self,
        user_session: UserSession = Depends(get_current_user_session),
    ) -> UserSession:
        user_roles = set(user_session.roles)

        if not user_roles.intersection(self.required_roles):
            logger.warning(
                f"User {user_session.user_id} lacks required roles {self.required_roles}. Has: {user_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role(s): {', '.join(sorted(self.required_roles))}",
            )
        return user_session


# ── Dependency 5: Portfolio 所有權驗證 (BOLA/IDOR 防護) ────────────────────────
def get_valid_portfolio(
    pid: int,
    user_id: int = Depends(require_fas_access),
    db: Session = Depends(get_db),
):
    """驗證 Portfolio 存在且屬於當前 UserId"""
    portfolio = db.query(Portfolio).filter(Portfolio.id == pid).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    if portfolio.owner_user_id != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied")
    return portfolio