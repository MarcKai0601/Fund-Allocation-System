import logging
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.stock_master import StockMaster
from app.models.position import Position
from app.models.account import Account
from app.core.config import settings
from app.core.redis_client import get_quote, set_quote
from app.schemas.schemas import PortfolioOut, AccountOut, PositionOut

logger = logging.getLogger(__name__)


def _get_fugle_client():
    """建立富果 RestClient（每次呼叫建立，避免長連線問題）"""
    from fugle_marketdata import RestClient
    return RestClient(api_key=settings.FUGLE_API_KEY)


def _fetch_quote(symbol: str) -> dict | None:
    """
    取得即時報價：先查 Redis 快取，未命中則呼叫富果 SDK。

    富果 intraday.quote 回傳欄位（我們使用的）：
        lastPrice     - 最新成交價
        previousClose - 昨日收盤價
        changePercent - 漲跌幅 (%)，例：0.35 代表 +0.35%
        change        - 漲跌點
        name          - 股票名稱
    """
    # 1. Redis cache hit
    cached = get_quote(symbol)
    if cached:
        logger.debug(f"Quote cache hit: {symbol}")
        return cached

    # 2. 若未設定 API Key，提示並回傳 None
    if not settings.FUGLE_API_KEY:
        logger.warning("FUGLE_API_KEY 未設定，無法取得即時報價。請在 .env 填入 API Key。")
        return None

    # 3. 使用富果官方 SDK 取得報價
    try:
        client = _get_fugle_client()
        body = client.stock.intraday.quote(symbol=symbol)

        last_price = body.get("lastPrice")
        prev_close = body.get("previousClose")
        change_pct = body.get("changePercent")  # 富果已提供，直接使用

        if last_price is None:
            logger.warning(f"Fugle quote for {symbol} returned no lastPrice: {body}")
            return None

        # changePercent 若未提供，自行計算
        if change_pct is None and prev_close:
            change_pct = round((last_price - prev_close) / prev_close * 100, 4)

        data = {
            "price": float(last_price),
            "prev_close": float(prev_close) if prev_close is not None else None,
            "change_pct": float(change_pct) if change_pct is not None else 0.0,
            "change": float(body.get("change", 0)),
            "name": body.get("name"),
        }
        set_quote(symbol, data)
        logger.info(f"Fugle quote fetched: {symbol} @ {last_price} ({change_pct:+.2f}%)")
        return data

    except Exception as e:
        logger.warning(f"Fugle SDK error for {symbol}: {e}")
        return None


def get_portfolio(db: Session) -> PortfolioOut:
    acct = db.query(Account).filter(Account.id == 1).first()
    positions = db.query(Position).filter(Position.quantity > 0).all()

    # 取股票名稱（從 stock_master 作為備援）
    symbols = [p.symbol for p in positions]
    stock_map: dict[str, str] = {}
    if symbols:
        masters = db.query(StockMaster).filter(StockMaster.symbol.in_(symbols)).all()
        stock_map = {sm.symbol: sm.name for sm in masters}

    total_market_value = Decimal("0")
    total_unrealized_pnl = Decimal("0")

    pos_out_list = []
    for pos in positions:
        quote = _fetch_quote(pos.symbol)
        current_price = Decimal(str(quote["price"])) if quote else None
        market_value = current_price * pos.quantity if current_price else None
        unrealized_pnl = (
            (market_value - Decimal(str(pos.total_cost))) if market_value is not None else None
        )
        unrealized_pnl_pct = (
            (unrealized_pnl / Decimal(str(pos.total_cost)) * 100)
            if unrealized_pnl is not None and pos.total_cost
            else None
        )
        change_pct = Decimal(str(quote["change_pct"])) if quote else None

        if market_value is not None:
            total_market_value += market_value
        if unrealized_pnl is not None:
            total_unrealized_pnl += unrealized_pnl

        # 富果 SDK 回傳的名稱優先；否則從 stock_master 取
        name = (quote.get("name") if quote else None) or stock_map.get(pos.symbol)

        pos_out_list.append(
            PositionOut(
                symbol=pos.symbol,
                name=name,
                quantity=pos.quantity,
                avg_cost=Decimal(str(pos.avg_cost)),
                total_cost=Decimal(str(pos.total_cost)),
                current_price=current_price,
                market_value=market_value,
                unrealized_pnl=unrealized_pnl,
                unrealized_pnl_pct=unrealized_pnl_pct,
                change_pct=change_pct,
            )
        )

    return PortfolioOut(
        account=AccountOut.model_validate(acct),
        positions=pos_out_list,
        total_market_value=total_market_value,
        total_unrealized_pnl=total_unrealized_pnl,
    )
