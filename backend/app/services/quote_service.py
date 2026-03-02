import logging
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.stock_master import StockMaster
from app.models.position import Position
from app.models.portfolio import Portfolio
from app.core.config import settings
from app.core.redis_client import get_quote, set_quote
from app.schemas.schemas import PortfolioOverviewOut, PortfolioOut, PositionOut

logger = logging.getLogger(__name__)


def _get_fugle_client(api_key: str | None = None):
    """建立富果 RestClient（每次呼叫建立，避免長連線問題）"""
    from fugle_marketdata import RestClient
    key = api_key or settings.FUGLE_API_KEY
    return RestClient(api_key=key)


def _parse_fugle_body(symbol: str, body: dict) -> dict | None:
    """將富果 API 回傳的 body 解析為標準 quote dict。"""
    last_price = body.get("lastPrice")
    prev_close = body.get("previousClose")
    change_pct = body.get("changePercent")

    if last_price is None:
        logger.warning(f"Fugle quote for {symbol} returned no lastPrice: {body}")
        return None

    if change_pct is None and prev_close:
        change_pct = round((last_price - prev_close) / prev_close * 100, 4)

    return {
        "price": float(last_price),
        "prev_close": float(prev_close) if prev_close is not None else None,
        "change_pct": float(change_pct) if change_pct is not None else 0.0,
        "change": float(body.get("change", 0)),
        "name": body.get("name"),
    }


def fetch_quote_fresh(symbol: str) -> dict | None:
    """
    強制從 Fugle API 取得最新報價（**不讀 Redis cache**），
    優先使用 FUGLE_API_KEY_QUOTE（第二組 token），若未設定則 fallback 至 FUGLE_API_KEY。
    取得後仍寫入 Redis cache 供後續使用。
    適用於「新增交易選股時即時報價」，避免與定時刷新 token 互相佔用頻率配額。
    """
    # 選用 token：第二組優先
    api_key = settings.FUGLE_API_KEY_QUOTE or settings.FUGLE_API_KEY
    if not api_key:
        logger.warning("FUGLE_API_KEY / FUGLE_API_KEY_QUOTE 皆未設定，無法取得即時報價。")
        return None

    try:
        client = _get_fugle_client(api_key=api_key)
        body = client.stock.intraday.quote(symbol=symbol)
        data = _parse_fugle_body(symbol, body)
        if data is None:
            return None
        # 寫入 cache 供後續呼叫受益
        set_quote(symbol, data)
        token_label = "FUGLE_API_KEY_QUOTE" if settings.FUGLE_API_KEY_QUOTE else "FUGLE_API_KEY"
        logger.info(f"[fresh] Fugle quote fetched: {symbol} @ {data['price']} (token={token_label})")
        return data
    except Exception as e:
        logger.warning(f"[fresh] Fugle SDK error for {symbol}: {e}")
        return None


def _fetch_quote(symbol: str) -> dict | None:
    """
    取得即時報價：先查 Redis 快取，未命中則呼叫富果 SDK（使用主要 FUGLE_API_KEY）。
    供定期刷新排程使用。
    """
    # 1. Redis cache hit
    cached = get_quote(symbol)
    if cached:
        logger.debug(f"Quote cache hit: {symbol}")
        return cached

    # 2. 若未設定 API Key，回傳 None
    if not settings.FUGLE_API_KEY:
        logger.warning("FUGLE_API_KEY 未設定，無法取得即時報價。")
        return None

    # 3. 使用富果官方 SDK 取得報價
    try:
        client = _get_fugle_client()
        body = client.stock.intraday.quote(symbol=symbol)
        data = _parse_fugle_body(symbol, body)
        if data is None:
            return None
        set_quote(symbol, data)
        logger.info(f"Fugle quote fetched: {symbol} @ {data['price']}")
        return data

    except Exception as e:
        logger.warning(f"Fugle SDK error for {symbol}: {e}")
        return None


def get_portfolio_overview(db: Session, portfolio_id: int) -> PortfolioOverviewOut:
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    positions = (
        db.query(Position)
        .filter(Position.portfolio_id == portfolio_id, Position.quantity > 0)
        .all()
    )

    # 取股票名稱
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

    return PortfolioOverviewOut(
        portfolio=PortfolioOut.model_validate(portfolio),
        positions=pos_out_list,
        total_market_value=total_market_value,
        total_unrealized_pnl=total_unrealized_pnl,
    )
