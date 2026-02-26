from sqlalchemy import Integer, Numeric, SmallInteger, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Account(Base):
    __tablename__ = "account"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    available_funds: Mapped[float] = mapped_column(Numeric(18, 4), default=0)
    total_invested: Mapped[float] = mapped_column(Numeric(18, 4), default=0)
    total_deposited: Mapped[float] = mapped_column(Numeric(18, 4), default=0)
    realized_pnl: Mapped[float] = mapped_column(Numeric(18, 4), default=0)
    is_initialized: Mapped[int] = mapped_column(SmallInteger, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
