"""
Security module — Java MGR SSO 整合 + RBAC
============================================
使用 HTTPBearer 從 Header 取得 Token，
到 Redis 查詢 `token:<token>` 取得 Session JSON。

支援兩種 Session 格式：
  ▸ 新格式 (camelCase): {"userId": 1, "username": "admin", "roles": [{"roleCode": "ADMIN"}, ...]}
  ▸ 舊格式 (PascalCase): {"UserId": 1, "Roles": {"FAS": ["ADMIN"], ...}}

提供核心 Dependency：
  - get_current_user         → 驗證 Token，回傳解析後的 Session dict
  - get_current_user_session → 回傳 UserSession Pydantic Model（含 roles）
  - require_fas_access       → 檢查 Roles 含 "FAS" Key，回傳 UserId (int)
  - RequireRole              → RBAC 角色檢查，支援一個或多個角色代碼
  - get_valid_portfolio      → Portfolio 所有權驗證 (BOLA/IDOR 防護)
"""
import json
import logging
from typing import Optional

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.redis_client import get_redis
from app.core.database import get_db
from app.models.portfolio import Portfolio

logger = logging.getLogger(__name__)

# ── HTTPBearer scheme ─────────────────────────────────────────────────────────
bearer_scheme = HTTPBearer()

TOKEN_PREFIX = "token:"


# ── UserSession Pydantic Model ────────────────────────────────────────────────

class UserSession(BaseModel):
    """從 Redis Session 解析出來的使用者資訊。"""
    user_id: str
    username: Optional[str] = None
    roles: list[str] = []


# ── Helper: 從 Session dict 提取角色代碼清單 ─────────────────────────────────

def _extract_roles(session: dict) -> list[str]:
    """
    支援兩種 roles 格式：
      ▸ 新格式: "roles": [{"roleCode": "ADMIN"}, {"roleCode": "USER"}]
      ▸ 新格式 (純字串): "roles": ["ADMIN", "USER"]
      ▸ 舊格式: "Roles": {"FAS": ["ADMIN"], "MGR": ["USER"]}
    回傳扁平化的角色代碼清單 (去重)。
    """
    role_codes: set[str] = set()

    # ── 新格式: roles ──
    roles_field = session.get("roles")
    if isinstance(roles_field, list):
        for item in roles_field:
            if isinstance(item, dict) and "roleCode" in item:
                role_codes.add(item["roleCode"])
            elif isinstance(item, str):
                role_codes.add(item)

    # ── 舊格式: Roles (dict of system → role list) ──
    roles_dict = session.get("Roles")
    if isinstance(roles_dict, dict):
        for system_roles in roles_dict.values():
            if isinstance(system_roles, list):
                for r in system_roles:
                    if isinstance(r, str):
                        role_codes.add(r)

    return list(role_codes)


# ── Dependency 1: Token 驗證 ──────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    從 Authorization: Bearer <token> 取得 Token，
    到 Redis 查詢 `token:<token>` 取得 Session JSON。

    支援三種 Redis 值：
      1. JSON 含 userId (新格式)
      2. JSON 含 UserId (舊格式)
      3. 純字串 user_id (最舊的 fallback)

    成功回傳 session dict。
    失敗拋出 HTTP 401。
    """
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

    # 嘗試解析 JSON
    try:
        session = json.loads(raw) if isinstance(raw, str) else raw
    except (json.JSONDecodeError, TypeError):
        # Fallback: 純字串視為 user_id（相容最舊的資料格式）
        logger.info("Token value is not JSON, treating as plain user_id string")
        return {"userId": str(raw), "roles": []}

    # 確認有 userId 或 UserId
    user_id = session.get("userId") or session.get("UserId")
    if user_id is None:
        logger.error("Token session missing userId/UserId field")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session: missing userId",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return session


# ── Dependency 2: 回傳完整 UserSession ────────────────────────────────────────

def get_current_user_session(
    session: dict = Depends(get_current_user),
) -> UserSession:
    """
    將 get_current_user 回傳的 session dict 轉換為 UserSession Model。
    包含 user_id, username, roles (角色代碼清單)。
    """
    user_id = session.get("userId") or session.get("UserId")
    username = session.get("username") or session.get("Username")
    roles = _extract_roles(session)

    return UserSession(
        user_id=str(user_id),
        username=username,
        roles=roles,
    )


# ── Dependency 3: RBAC — RequireRole 通用角色檢查 ─────────────────────────────

class RequireRole:
    """
    RBAC 依賴注入類別。

    用法：
        Depends(RequireRole("ADMIN"))           # 需要 ADMIN 角色
        Depends(RequireRole("ADMIN", "MGR"))     # 需要 ADMIN 或 MGR 任一角色

    若使用者不具備任何所需角色，拋出 HTTP 403 Forbidden。
    回傳 UserSession 供 endpoint 使用。
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
                f"User {user_session.user_id} lacks required roles "
                f"{self.required_roles}. Has: {user_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role(s): "
                       f"{', '.join(sorted(self.required_roles))}",
            )

        logger.debug(
            f"Role check passed: UserId={user_session.user_id}, "
            f"required={self.required_roles}, has={user_roles}"
        )
        return user_session


# ── Dependency 4: RBAC — FAS 系統權限檢查 (保留相容) ──────────────────────────

def require_fas_access(
    session: dict = Depends(get_current_user),
) -> int:
    """
    檢查 Session 的 Roles 中是否包含 "FAS" Key。
    成功回傳 UserId (int) 給 Controller 使用。
    （保留此 dependency 以維持現有路由不變）
    """
    roles = session.get("Roles", {})

    if "FAS" not in roles:
        logger.warning(
            f"User {session.get('UserId') or session.get('userId')} "
            f"does not have FAS access. Available roles: {list(roles.keys()) if isinstance(roles, dict) else roles}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to Fund Allocation System",
        )

    user_id = session.get("UserId") or session.get("userId")
    logger.debug(f"FAS access granted: UserId={user_id}, FAS roles={roles.get('FAS', [])}")
    return int(user_id)


# ── Dependency 5: Portfolio 所有權驗證 (BOLA/IDOR 防護) ────────────────────────

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
