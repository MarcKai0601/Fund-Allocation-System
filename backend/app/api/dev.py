"""
Dev-mode bypass API — 僅在 DEV_MODE_ENABLED=true 時掛載，絕對不可在正式環境開啟。
提供開發者直接建立 Redis Session Token，跳過外部 SSO 流程。
"""
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.redis_client import get_redis, set_auth_token, get_auth_session, delete_auth_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dev", tags=["Dev (開發模式)"])

_DEV_REF_PREFIX = "dev:last_token:"


class DevLoginRequest(BaseModel):
    dev_secret: str
    user_id: str
    username: Optional[str] = None
    roles: list[str] = ["USER"]
    language: Optional[str] = "zh-TW"


class DevLoginResponse(BaseModel):
    token: str
    user_id: str
    username: Optional[str]
    roles: list[str]
    expires_in: int


def _check_secret(provided: str):
    """若 DEV_SECRET 有設定，則驗證是否相符。"""
    if settings.DEV_SECRET and provided != settings.DEV_SECRET:
        raise HTTPException(status_code=403, detail="Invalid dev_secret")


def _replace_dev_token(user_id: str, new_token: str, ttl: int):
    """
    刪除該 user_id 上一個 dev token（若存在），再記錄新的 token 索引。
    確保每次建立新 token 時，舊的 Redis session 立即失效，
    前端 TokenCatcher 接收新 token 後 localStorage 也會同步更新。
    """
    r = get_redis()
    ref_key = f"{_DEV_REF_PREFIX}{user_id}"
    old_token = r.get(ref_key)
    if old_token:
        r.delete(f"token:{old_token}")
        logger.warning("⚠️  [DEV] invalidated old token for user_id=%s", user_id)
    r.setex(ref_key, ttl, new_token)


@router.post("/login", response_model=DevLoginResponse, summary="建立開發用 Session Token")
def dev_login(req: DevLoginRequest):
    """
    建立一個模擬 SSO Session 的 Redis Token，可直接用於後端所有受保護路由。
    每次呼叫會自動使該 user_id 的舊 dev token 失效。
    需在 .env 中設定 DEV_MODE_ENABLED=true 才能使用。
    """
    _check_secret(req.dev_secret)

    token = str(uuid.uuid4())
    ttl = settings.SLIDING_WINDOW_TTL

    set_auth_token(
        token=token,
        user_id=int(req.user_id),
        roles={"FAS": req.roles},
        role_codes=req.roles,
        username=req.username,
        language=req.language,
        ttl=ttl,
    )
    _replace_dev_token(req.user_id, token, ttl)

    logger.warning(
        "⚠️  [DEV] dev_login issued token for user_id=%s username=%s roles=%s",
        req.user_id,
        req.username,
        req.roles,
    )

    return DevLoginResponse(
        token=token,
        user_id=req.user_id,
        username=req.username,
        roles=req.roles,
        expires_in=ttl,
    )


@router.get("/redirect", summary="建立 Token 並直接跳轉至前端（瀏覽器用）")
def dev_redirect(
    dev_secret: str,
    user_id: str,
    username: Optional[str] = None,
    roles: str = "USER",
    language: str = "zh-TW",
):
    """
    在瀏覽器網址列貼上此 URL，後端自動建立 Token 並 302 跳轉到前端 /?token=xxx。
    前端 TokenCatcher 會讀取 token、驗證並完成登入，無需手動複製貼上。
    每次呼叫會自動使該 user_id 的舊 dev token 失效，不需手動清 localStorage。

    roles 用逗號分隔，例如：ADMIN 或 ADMIN,USER
    """
    _check_secret(dev_secret)
    role_list = [r.strip() for r in roles.split(",") if r.strip()]
    ttl = settings.SLIDING_WINDOW_TTL
    token = str(uuid.uuid4())

    set_auth_token(
        token=token,
        user_id=int(user_id),
        roles={"FAS": role_list},
        role_codes=role_list,
        username=username,
        language=language,
        ttl=ttl,
    )
    _replace_dev_token(user_id, token, ttl)

    logger.warning(
        "⚠️  [DEV] dev_redirect issued token for user_id=%s roles=%s → %s",
        user_id,
        role_list,
        settings.FRONTEND_URL,
    )
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/?token={token}")


@router.delete("/logout", summary="撤銷開發用 Session Token")
def dev_logout(
    dev_secret: str,
    authorization: Optional[str] = Header(default=None),
):
    """
    立即從 Redis 刪除指定的 Token，使其失效。
    authorization 格式：Bearer <token>
    """
    _check_secret(dev_secret)

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=400, detail="Missing or invalid Authorization header")

    token = authorization.split(" ", 1)[1].strip()

    session = get_auth_session(token)
    if session:
        uid = str(session.get("userId") or session.get("UserId") or "")
        if uid:
            r = get_redis()
            ref_key = f"{_DEV_REF_PREFIX}{uid}"
            if r.get(ref_key) == token:
                r.delete(ref_key)

    delete_auth_token(token)
    logger.warning("⚠️  [DEV] dev_logout revoked token=%s", token[:8] + "...")
    return {"detail": "Token revoked"}
