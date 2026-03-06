"""
DEV-ONLY Auth Endpoints
=======================
模擬 Java MGR SSO 登入：產生 Token 並存入 Redis (與 Java MGR 共用格式)。
Key: token:<token>
Value: {"UserId": <int>, "Roles": {"FAS": ["ADMIN"]}}

生產環境應移除或禁用本模組。
"""
import uuid
import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.redis_client import set_auth_token, delete_auth_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dev", tags=["Dev Auth"])


class DevLoginRequest(BaseModel):
    user_id: int = Field(default=1, description="模擬的 User ID (int)")
    username: str = Field(default="dev_user", description="模擬的使用者名稱")
    roles: dict = Field(
        default={"FAS": ["ADMIN"]},
        description="模擬的角色權限 (Java MGR 舊格式)",
    )
    role_codes: list[str] = Field(
        default=["ADMIN"],
        description="模擬的角色代碼清單 (新 RBAC 格式)",
    )


class DevLoginResponse(BaseModel):
    token: str
    user_id: int
    username: str
    roles: dict
    role_codes: list[str]
    ttl: int


@router.post("/login", response_model=DevLoginResponse, summary="[DEV] 模擬 Java MGR 登入")
def dev_login(req: DevLoginRequest = DevLoginRequest()):
    """
    模擬外部 Java MGR 登入，產生 Token 並寫入 Redis (JSON Session 格式)。
    Redis Key: token:<token>
    Redis Value: 包含新舊兩套格式欄位的 JSON
    """
    token = f"dev_{uuid.uuid4().hex[:16]}"
    ttl = 86400  # 24h
    set_auth_token(
        token, req.user_id,
        roles=req.roles,
        role_codes=req.role_codes,
        username=req.username,
        ttl=ttl,
    )
    logger.info(
        f"[DEV] Login: UserId={req.user_id}, username={req.username}, "
        f"Roles={req.roles}, role_codes={req.role_codes}, token={token}"
    )
    return DevLoginResponse(
        token=token, user_id=req.user_id, username=req.username,
        roles=req.roles, role_codes=req.role_codes, ttl=ttl,
    )


@router.post("/logout", summary="[DEV] 模擬登出")
def dev_logout(token: str):
    delete_auth_token(token)
    return {"message": "Token deleted"}
