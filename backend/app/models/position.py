from sqlalchemy import Integer, Numeric, String, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Position(Base):
    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(
        String(10), ForeignKey("stock_master.symbol", onupdate="CASCADE"), nullable=False, unique=True
    )
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    avg_cost: Mapped[float] = mapped_column(Numeric(12, 4), default=0)
    total_cost: Mapped[float] = mapped_column(Numeric(18, 4), default=0)
    first_buy_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    last_updated: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
