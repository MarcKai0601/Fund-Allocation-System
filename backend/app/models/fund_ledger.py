from sqlalchemy import Integer, Numeric, String, Date, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
import enum


class LedgerType(str, enum.Enum):
    INIT = "INIT"
    DEPOSIT = "DEPOSIT"
    WITHDRAW = "WITHDRAW"


class FundLedger(Base):
    __tablename__ = "fund_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    portfolio_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    type: Mapped[str] = mapped_column(Enum(LedgerType), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    trade_date: Mapped[Date] = mapped_column(Date, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
