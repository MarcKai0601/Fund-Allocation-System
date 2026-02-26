from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


# ─── Fund ───────────────────────────────────────────────────────────────────

class FundInitRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="初始代操金額 (TWD)")
    note: Optional[str] = None
    trade_date: date = Field(default_factory=date.today)


class FundDepositRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="新增資金金額 (TWD)")
    note: Optional[str] = None
    trade_date: date = Field(default_factory=date.today)


class FundLedgerOut(BaseModel):
    id: int
    type: str
    amount: Decimal
    note: Optional[str]
    trade_date: date
    created_at: datetime

    class Config:
        from_attributes = True


class AccountOut(BaseModel):
    id: int
    available_funds: Decimal
    total_invested: Decimal
    total_deposited: Decimal
    realized_pnl: Decimal
    is_initialized: bool

    class Config:
        from_attributes = True


# ─── Stock ──────────────────────────────────────────────────────────────────

class StockMasterOut(BaseModel):
    symbol: str
    name: str
    sector: Optional[str]
    market: str

    class Config:
        from_attributes = True


# ─── Trade ──────────────────────────────────────────────────────────────────

class TradeRequest(BaseModel):
    symbol: str = Field(..., max_length=10)
    action: str = Field(..., pattern="^(BUY|SELL)$")
    price: Decimal = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    fee: Decimal = Field(default=0, ge=0)
    trade_date: date = Field(default_factory=date.today)
    note: Optional[str] = None


class TransactionOut(BaseModel):
    id: int
    symbol: str
    action: str
    price: Decimal
    quantity: int
    fee: Decimal
    total_amount: Decimal
    trade_date: date
    cost_basis: Optional[Decimal]
    pnl: Optional[Decimal]
    pnl_pct: Optional[Decimal]
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Portfolio ───────────────────────────────────────────────────────────────

class PositionOut(BaseModel):
    symbol: str
    name: Optional[str]
    quantity: int
    avg_cost: Decimal
    total_cost: Decimal
    current_price: Optional[Decimal]
    market_value: Optional[Decimal]
    unrealized_pnl: Optional[Decimal]
    unrealized_pnl_pct: Optional[Decimal]
    change_pct: Optional[Decimal]  # 今日漲跌幅

    class Config:
        from_attributes = True


class PortfolioOut(BaseModel):
    account: AccountOut
    positions: list[PositionOut]
    total_market_value: Decimal
    total_unrealized_pnl: Decimal


# ─── Generic ─────────────────────────────────────────────────────────────────

class MessageOut(BaseModel):
    message: str
    data: Optional[dict] = None
