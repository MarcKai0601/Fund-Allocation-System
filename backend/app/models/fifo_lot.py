from sqlalchemy import Integer, Numeric, String, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class FifoLot(Base):
    __tablename__ = "fifo_lots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(
        String(10), ForeignKey("stock_master.symbol", onupdate="CASCADE"), nullable=False
    )
    transaction_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("transactions.id"), nullable=False
    )
    price: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    original_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    trade_date: Mapped[Date] = mapped_column(Date, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
