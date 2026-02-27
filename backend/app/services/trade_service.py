from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.portfolio import Portfolio
from app.models.transaction import Transaction, ActionType
from app.models.position import Position
from app.models.fifo_lot import FifoLot
from app.schemas.schemas import TradeRequest


def _get_portfolio(db: Session, portfolio_id: int) -> Portfolio:
    p = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return p


def create_trade(db: Session, portfolio_id: int, req: TradeRequest) -> Transaction:
    p = _get_portfolio(db, portfolio_id)
    if not p.is_initialized:
        raise HTTPException(status_code=400, detail="請先初始化資金")

    if req.action == "BUY":
        return _process_buy(db, p, portfolio_id, req)
    else:
        return _process_sell(db, p, portfolio_id, req)


def _process_buy(db: Session, p: Portfolio, portfolio_id: int, req: TradeRequest) -> Transaction:
    total_cost = Decimal(str(req.price)) * req.quantity + Decimal(str(req.fee))

    if Decimal(str(p.available_funds)) < total_cost:
        raise HTTPException(
            status_code=400,
            detail=f"可用資金不足。可用: {p.available_funds}, 需要: {total_cost}"
        )

    # Create transaction record
    tx = Transaction(
        portfolio_id=portfolio_id,
        symbol=req.symbol,
        action=ActionType.BUY,
        price=req.price,
        quantity=req.quantity,
        fee=req.fee,
        total_amount=total_cost,
        trade_date=req.trade_date,
        note=req.note,
    )
    db.add(tx)
    db.flush()  # get tx.id

    # Add FIFO lot
    lot = FifoLot(
        portfolio_id=portfolio_id,
        symbol=req.symbol,
        transaction_id=tx.id,
        price=req.price,
        original_qty=req.quantity,
        remaining_qty=req.quantity,
        trade_date=req.trade_date,
    )
    db.add(lot)

    # Update or create position (average cost)
    position = (
        db.query(Position)
        .filter(Position.portfolio_id == portfolio_id, Position.symbol == req.symbol)
        .first()
    )
    if position:
        old_total = Decimal(str(position.avg_cost)) * position.quantity
        new_total = old_total + Decimal(str(req.price)) * req.quantity
        new_qty = position.quantity + req.quantity
        position.avg_cost = (new_total / new_qty).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        position.quantity = new_qty
        position.total_cost = Decimal(str(position.total_cost)) + total_cost
    else:
        position = Position(
            portfolio_id=portfolio_id,
            symbol=req.symbol,
            quantity=req.quantity,
            avg_cost=req.price,
            total_cost=total_cost,
            first_buy_date=req.trade_date,
        )
        db.add(position)

    # Deduct from available funds
    p.available_funds = (Decimal(str(p.available_funds)) - total_cost).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )
    p.total_invested = (Decimal(str(p.total_invested)) + total_cost).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    db.commit()
    db.refresh(tx)
    return tx


def _process_sell(db: Session, p: Portfolio, portfolio_id: int, req: TradeRequest) -> Transaction:
    position = (
        db.query(Position)
        .filter(Position.portfolio_id == portfolio_id, Position.symbol == req.symbol)
        .first()
    )
    if not position or position.quantity < req.quantity:
        have = position.quantity if position else 0
        raise HTTPException(
            status_code=400,
            detail=f"庫存不足。庫存: {have} 股, 嘗試賣出: {req.quantity} 股"
        )

    sell_proceeds = Decimal(str(req.price)) * req.quantity - Decimal(str(req.fee))

    # FIFO cost calculation
    lots = (
        db.query(FifoLot)
        .filter(
            FifoLot.portfolio_id == portfolio_id,
            FifoLot.symbol == req.symbol,
            FifoLot.remaining_qty > 0,
        )
        .order_by(FifoLot.trade_date, FifoLot.id)
        .all()
    )

    remaining_to_sell = req.quantity
    fifo_cost = Decimal("0")

    for lot in lots:
        if remaining_to_sell <= 0:
            break
        use_qty = min(lot.remaining_qty, remaining_to_sell)
        fifo_cost += Decimal(str(lot.price)) * use_qty
        lot.remaining_qty -= use_qty
        remaining_to_sell -= use_qty

    pnl = sell_proceeds - fifo_cost
    pnl_pct = (pnl / fifo_cost * 100).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP) if fifo_cost else Decimal("0")

    tx = Transaction(
        portfolio_id=portfolio_id,
        symbol=req.symbol,
        action=ActionType.SELL,
        price=req.price,
        quantity=req.quantity,
        fee=req.fee,
        total_amount=sell_proceeds,
        trade_date=req.trade_date,
        cost_basis=fifo_cost,
        pnl=pnl,
        pnl_pct=pnl_pct,
        note=req.note,
    )
    db.add(tx)

    # Update position
    sell_cost = (Decimal(str(position.total_cost)) * req.quantity / position.quantity).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )
    position.quantity -= req.quantity
    position.total_cost = max(Decimal("0"), Decimal(str(position.total_cost)) - sell_cost)
    if position.quantity == 0:
        position.avg_cost = Decimal("0")

    # Update portfolio
    p.available_funds = (Decimal(str(p.available_funds)) + sell_proceeds).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )
    p.total_invested = max(
        Decimal("0"),
        (Decimal(str(p.total_invested)) - sell_cost).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    )
    p.realized_pnl = (Decimal(str(p.realized_pnl)) + pnl).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    db.commit()
    db.refresh(tx)
    return tx


def get_trades(db: Session, portfolio_id: int, symbol: str = None) -> list[Transaction]:
    q = db.query(Transaction).filter(Transaction.portfolio_id == portfolio_id)
    if symbol:
        q = q.filter(Transaction.symbol == symbol)
    return q.order_by(Transaction.id.desc()).all()
