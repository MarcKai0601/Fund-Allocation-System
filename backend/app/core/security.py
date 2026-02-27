import logging
from abc import ABC, abstractmethod

from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.core.redis_client import get_redis
from app.core.database import get_db
from app.models.portfolio import Portfolio

logger = logging.getLogger(__name__)


class TokenValidator(ABC):

    @abstractmethod
    def validate(self, token):
        ...


class RedisTokenValidator(TokenValidator):
    TOKEN_PREFIX = "auth:token:"

    def validate(self, token):
        r = get_redis()
        key = f"{self.TOKEN_PREFIX}{token}"
        user_id = r.get(key)
        if not user_id:
            logger.warning("Token validation failed: token not found in Redis")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return str(user_id)


_active_validator = RedisTokenValidator()


def set_validator(validator):
    global _active_validator
    _active_validator = validator
    logger.info(f"Auth validator switched to: {type(validator).__name__}")


def get_current_user(authorization: str = Header(..., alias="Authorization")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must start with 'Bearer '",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization[7:]
    return _active_validator.validate(token)


def get_valid_portfolio(
    pid: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == pid).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    if portfolio.owner_user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return portfolio
