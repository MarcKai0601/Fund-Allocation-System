from typing import Optional
from sqlalchemy import Integer, String, DateTime, UniqueConstraint, Index, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class FasUserRole(Base):
    __tablename__ = "fas_user_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    role_id: Mapped[int] = mapped_column(Integer, nullable=False)
    portfolio_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    granted_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "role_id", "portfolio_id", name="uq_user_role_portfolio"),
        Index("idx_fas_ur_user", "user_id"),
        Index("idx_fas_ur_portfolio", "portfolio_id"),
    )
