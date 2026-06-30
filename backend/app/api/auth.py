from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_session, UserSession
from app.services.rbac_service import get_user_system_roles

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class UserProfileResponse(BaseModel):
    user_id: str
    username: Optional[str] = None
    roles: list[str] = []
    language: Optional[str] = "zh-TW"
    fas_roles: list[str] = []  # FAS 內部系統層級角色（SYSTEM_ADMIN 等）


@router.get("/me", response_model=UserProfileResponse, summary="Get current user profile")
def get_me(
    user: UserSession = Depends(get_current_user_session),
    db: Session = Depends(get_db),
):
    """回傳當前使用者資訊，包含 SSO 角色與 FAS 內部系統層級角色。"""
    fas_roles = get_user_system_roles(user.user_id, db)
    return UserProfileResponse(
        user_id=user.user_id,
        username=user.username,
        roles=user.roles,
        language=user.language,
        fas_roles=fas_roles,
    )
