from sqlalchemy import Integer, String, SmallInteger, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
import enum


class MarketType(str, enum.Enum):
    TWSE = "TWSE"
    TPEx = "TPEx"


class StockMaster(Base):
    __tablename__ = "stock_master"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(10), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    market: Mapped[str] = mapped_column(Enum(MarketType), default="TWSE")
    is_active: Mapped[int] = mapped_column(SmallInteger, default=1)
    synced_at: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
