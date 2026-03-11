from fastapi import APIRouter, Depends
from app.core.security import get_current_user_session, UserSession

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.get("/me", response_model=UserSession, summary="Get current user profile")
def get_me(user: UserSession = Depends(get_current_user_session)):
    """回傳從 Redis 解析出來的當前使用者完整資訊，包含語系偏好 (language)。"""
    return user
