from sqlalchemy import Integer, Numeric, String, Date, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
import enum


class ActionType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(
        String(10), ForeignKey("stock_master.symbol", onupdate="CASCADE"), nullable=False
    )
    action: Mapped[str] = mapped_column(Enum(ActionType), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    fee: Mapped[float] = mapped_column(Numeric(10, 4), default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    trade_date: Mapped[Date] = mapped_column(Date, nullable=False)
    # Filled on SELL only
    cost_basis: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    pnl: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    pnl_pct: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
