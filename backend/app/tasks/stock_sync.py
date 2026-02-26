import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.stock_master import StockMaster, MarketType
from app.core.database import SessionLocal
from app.core.redis_client import set_stock_list_cache

logger = logging.getLogger(__name__)

_POPULAR_STOCKS = [
    ("2330", "台積電", "半導體", "TWSE"),
    ("2317", "鴻海", "電子零組件", "TWSE"),
    ("2454", "聯發科", "半導體", "TWSE"),
    ("2412", "中華電", "通信網路", "TWSE"),
    ("2308", "台達電", "電子零組件", "TWSE"),
    ("2882", "國泰金", "金融保險", "TWSE"),
    ("2881", "富邦金", "金融保險", "TWSE"),
    ("1301", "台塑", "塑膠", "TWSE"),
    ("1303", "南亞", "塑膠", "TWSE"),
    ("2002", "中鋼", "鋼鐵", "TWSE"),
    ("2891", "中信金", "金融保險", "TWSE"),
    ("6505", "台塑化", "石油化工", "TWSE"),
    ("2886", "兆豐金", "金融保險", "TWSE"),
    ("2884", "玉山金", "金融保險", "TWSE"),
    ("3711", "日月光投控", "半導體", "TWSE"),
    ("2357", "華碩", "電腦及週邊", "TWSE"),
    ("2382", "廣達", "電腦及週邊", "TWSE"),
    ("2303", "聯電", "半導體", "TWSE"),
    ("5880", "合庫金", "金融保險", "TWSE"),
    ("2892", "第一金", "金融保險", "TWSE"),
    ("2885", "元大金", "金融保險", "TWSE"),
    ("2379", "瑞昱", "半導體", "TWSE"),
    ("3008", "大立光", "光學鏡頭", "TWSE"),
    ("2395", "研華", "電腦及週邊", "TWSE"),
    ("2474", "可成", "其他電子", "TWSE"),
    ("4904", "遠傳", "通信網路", "TWSE"),
    ("2353", "宏碁", "電腦及週邊", "TWSE"),
    ("1326", "台化", "塑膠", "TWSE"),
    ("2880", "華南金", "金融保險", "TWSE"),
    ("2887", "台新金", "金融保險", "TWSE"),
]


def sync_stock_master() -> int:
    """
    Sync Taiwan stock list. Uses twstock if available,
    falls back to the built-in popular stocks list.
    Returns number of records upserted.
    """
    db: Session = SessionLocal()
    count = 0
    try:
        stocks_to_upsert = []

        try:
            import twstock
            twse_stocks = twstock.twse  # dict {symbol: StockCodeInfo}
            otc_stocks = twstock.otc

            for symbol, info in twse_stocks.items():
                stocks_to_upsert.append({
                    "symbol": symbol,
                    "name": info.name,
                    "sector": getattr(info, "group", None),
                    "market": "TWSE",
                })
            for symbol, info in otc_stocks.items():
                stocks_to_upsert.append({
                    "symbol": symbol,
                    "name": info.name,
                    "sector": getattr(info, "group", None),
                    "market": "TPEx",
                })
            logger.info(f"twstock returned {len(stocks_to_upsert)} stocks")
        except Exception as e:
            logger.warning(f"twstock sync failed ({e}), using fallback list")
            for sym, name, sector, market in _POPULAR_STOCKS:
                stocks_to_upsert.append({"symbol": sym, "name": name, "sector": sector, "market": market})

        now = datetime.utcnow()
        for item in stocks_to_upsert:
            existing = db.query(StockMaster).filter(StockMaster.symbol == item["symbol"]).first()
            if existing:
                existing.name = item["name"]
                existing.sector = item.get("sector")
                existing.synced_at = now
            else:
                db.add(StockMaster(
                    symbol=item["symbol"],
                    name=item["name"],
                    sector=item.get("sector"),
                    market=item["market"],
                    synced_at=now,
                ))
            count += 1

        db.commit()
        logger.info(f"Stock master synced: {count} records")

        # Refresh Redis cache
        all_stocks = db.query(StockMaster).filter(StockMaster.is_active == 1).all()
        cache_data = [{"symbol": s.symbol, "name": s.name, "sector": s.sector, "market": s.market} for s in all_stocks]
        set_stock_list_cache(cache_data)

    except Exception as e:
        db.rollback()
        logger.error(f"Stock sync error: {e}")
    finally:
        db.close()

    return count


def should_sync(db: Session) -> bool:
    """Returns True if stock_master table is empty or last sync > 24 hours."""
    count = db.query(StockMaster).count()
    if count == 0:
        return True
    latest = db.query(StockMaster).order_by(StockMaster.synced_at.desc()).first()
    if latest and latest.synced_at:
        return datetime.utcnow() - latest.synced_at > timedelta(hours=24)
    return True
