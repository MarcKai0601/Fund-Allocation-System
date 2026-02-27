"""
DEV-ONLY Auth Endpoints
=======================
提供開發測試用的 Token 發放 API。
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
    user_id: str = Field(default="dev_user_001", description="模擬的 User ID")


class DevLoginResponse(BaseModel):
    token: str
    user_id: str
    ttl: int


@router.post("/login", response_model=DevLoginResponse, summary="[DEV] 模擬登入取得 Token")
def dev_login(req: DevLoginRequest = DevLoginRequest()):
    """
    開發測試用：模擬外部 Java MGR 登入，產生 Token 並寫入 Redis。
    生產環境應禁用此端點。
    """
    token = f"dev_{uuid.uuid4().hex[:16]}"
    ttl = 86400  # 24h
    set_auth_token(token, req.user_id, ttl)
    logger.info(f"[DEV] Login: user_id={req.user_id}, token={token}")
    return DevLoginResponse(token=token, user_id=req.user_id, ttl=ttl)


@router.post("/logout", summary="[DEV] 模擬登出")
def dev_logout(token: str):
    delete_auth_token(token)
    return {"message": "Token deleted"}
