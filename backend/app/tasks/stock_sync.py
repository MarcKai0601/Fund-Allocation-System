import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.stock_master import StockMaster, MarketType
from app.core.database import SessionLocal
from app.core.redis_client import set_stock_list_cache

logger = logging.getLogger(__name__)

_POPULAR_STOCKS = [
    # ── ETF ────────────────────────────────────────────────────────────────
    ("0050", "元大台灣50", "ETF", "TWSE"),
    ("0051", "元大中型100", "ETF", "TWSE"),
    ("0052", "富邦科技", "ETF", "TWSE"),
    ("0053", "元大電子", "ETF", "TWSE"),
    ("0054", "元大台商50", "ETF", "TWSE"),
    ("0055", "元大MSCI金融", "ETF", "TWSE"),
    ("0056", "元大高股息", "ETF", "TWSE"),
    ("0057", "富邦摩台", "ETF", "TWSE"),
    ("0058", "富邦發達", "ETF", "TWSE"),
    ("0059", "富邦金融", "ETF", "TWSE"),
    ("006204", "永豐臺灣加權", "ETF", "TWSE"),
    ("006208", "富邦台50", "ETF", "TWSE"),
    ("00692", "富邦公司治理", "ETF", "TWSE"),
    ("00701", "國泰台灣低波動30", "ETF", "TWSE"),
    ("00713", "元大台灣高息低波", "ETF", "TWSE"),
    ("00720B", "元大投資級公司債", "ETF", "TWSE"),
    ("00723", "群益精選非金電", "ETF", "TWSE"),
    ("00733", "富邦台灣中小", "ETF", "TWSE"),
    ("00762", "元大全球AI", "ETF", "TWSE"),
    ("00878", "國泰永續高股息", "ETF", "TWSE"),
    ("00881", "國泰台灣5G+", "ETF", "TWSE"),
    ("00888", "永豐台灣ESG", "ETF", "TWSE"),
    ("00891", "中信關鍵半導體", "ETF", "TWSE"),
    ("00892", "富邦台灣半導體", "ETF", "TWSE"),
    ("00893", "國泰智能電動車", "ETF", "TWSE"),
    ("00896", "中信綠能及電動車", "ETF", "TWSE"),
    ("00900", "富邦特選高股息30", "ETF", "TWSE"),
    ("00905", "FT臺灣Smart", "ETF", "TWSE"),
    ("00907", "永豐智能低波高息", "ETF", "TWSE"),
    ("00912", "中信臺灣智慧50", "ETF", "TWSE"),
    ("00915", "凱基優選高股息30", "ETF", "TWSE"),
    ("00916", "國泰全球品牌50", "ETF", "TWSE"),
    ("00919", "群益台灣精選高息", "ETF", "TWSE"),
    ("00922", "國泰台灣動能高息", "ETF", "TWSE"),
    ("00923", "群益台灣ESG低碳高息", "ETF", "TWSE"),
    ("00927", "群益半導體收益", "ETF", "TWSE"),
    ("00929", "復華台灣科技優息", "ETF", "TWSE"),
    ("00930", "永豐ESG低碳高息", "ETF", "TWSE"),
    ("00932", "兆豐永續高息等權", "ETF", "TWSE"),
    ("00933B", "國泰10Y+金融債", "ETF", "TWSE"),
    ("00934", "中信成長高股息", "ETF", "TWSE"),
    ("00939", "台新台灣永續高息", "ETF", "TWSE"),
    ("00940", "元大台灣價值高息", "ETF", "TWSE"),
    ("00941", "台新北美科技", "ETF", "TWSE"),
    ("00944", "第一金小型高優息", "ETF", "TWSE"),
    ("00945", "台新臺灣IC設計", "ETF", "TWSE"),
    ("00946", "元大臺灣價值成長", "ETF", "TWSE"),
    # ── 半導體 / 電子 ──────────────────────────────────────────────────────
    ("2330", "台積電", "半導體", "TWSE"),
    ("2303", "聯電", "半導體", "TWSE"),
    ("2379", "瑞昱", "半導體", "TWSE"),
    ("2454", "聯發科", "半導體", "TWSE"),
    ("3711", "日月光投控", "半導體", "TWSE"),
    ("3034", "聯詠", "半導體", "TWSE"),
    ("6770", "力積電", "半導體", "TWSE"),
    ("2408", "南亞科", "半導體", "TWSE"),
    ("3443", "創意", "半導體", "TWSE"),
    ("6415", "矽力-KY", "半導體", "TWSE"),
    ("2337", "旺宏", "半導體", "TWSE"),
    ("2344", "華邦電", "半導體", "TWSE"),
    # ── 電腦及週邊 ─────────────────────────────────────────────────────────
    ("2317", "鴻海", "電子零組件", "TWSE"),
    ("2354", "鴻準", "電腦及週邊", "TWSE"),
    ("2357", "華碩", "電腦及週邊", "TWSE"),
    ("2382", "廣達", "電腦及週邊", "TWSE"),
    ("2353", "宏碁", "電腦及週邊", "TWSE"),
    ("2395", "研華", "電腦及週邊", "TWSE"),
    ("3231", "緯創", "電腦及週邊", "TWSE"),
    ("2324", "仁寶", "電腦及週邊", "TWSE"),
    ("2301", "光寶科", "電子零組件", "TWSE"),
    ("2308", "台達電", "電子零組件", "TWSE"),
    ("2474", "可成", "其他電子", "TWSE"),
    ("2409", "友達", "光電", "TWSE"),
    ("3481", "群創", "光電", "TWSE"),
    ("3008", "大立光", "光學鏡頭", "TWSE"),
    ("2345", "智邦", "通信網路", "TWSE"),
    ("4958", "臻鼎-KY", "印刷電路板", "TWSE"),
    ("2376", "技嘉", "電腦及週邊", "TWSE"),
    ("3533", "嘉澤", "電子零組件", "TWSE"),
    # ── AI / 伺服器 ────────────────────────────────────────────────────────
    ("2379", "瑞昱", "半導體", "TWSE"),
    ("6669", "緯穎", "電腦及週邊", "TWSE"),
    ("3293", "鈺太", "半導體", "TWSE"),
    ("6214", "精誠", "資訊服務", "TWSE"),
    ("2449", "京元電子", "半導體", "TWSE"),
    # ── 金融保險 ───────────────────────────────────────────────────────────
    ("2882", "國泰金", "金融保險", "TWSE"),
    ("2881", "富邦金", "金融保險", "TWSE"),
    ("2891", "中信金", "金融保險", "TWSE"),
    ("2886", "兆豐金", "金融保險", "TWSE"),
    ("2884", "玉山金", "金融保險", "TWSE"),
    ("5880", "合庫金", "金融保險", "TWSE"),
    ("2892", "第一金", "金融保險", "TWSE"),
    ("2885", "元大金", "金融保險", "TWSE"),
    ("2880", "華南金", "金融保險", "TWSE"),
    ("2887", "台新金", "金融保險", "TWSE"),
    ("2883", "開發金", "金融保險", "TWSE"),
    ("2890", "永豐金", "金融保險", "TWSE"),
    ("2888", "新光金", "金融保險", "TWSE"),
    ("2889", "國票金", "金融保險", "TWSE"),
    ("6016", "富邦產險", "金融保險", "TWSE"),
    ("2823", "中壽", "金融保險", "TWSE"),
    ("2809", "京城銀", "金融保險", "TWSE"),
    # ── 通信網路 ───────────────────────────────────────────────────────────
    ("2412", "中華電", "通信網路", "TWSE"),
    ("4904", "遠傳", "通信網路", "TWSE"),
    ("3045", "台灣大", "通信網路", "TWSE"),
    # ── 塑膠 ───────────────────────────────────────────────────────────────
    ("1301", "台塑", "塑膠", "TWSE"),
    ("1303", "南亞", "塑膠", "TWSE"),
    ("1326", "台化", "塑膠", "TWSE"),
    ("6505", "台塑化", "石油化工", "TWSE"),
    # ── 鋼鐵 / 傳產 ────────────────────────────────────────────────────────
    ("2002", "中鋼", "鋼鐵", "TWSE"),
    ("2006", "東和鋼鐵", "鋼鐵", "TWSE"),
    ("2014", "中鴻", "鋼鐵", "TWSE"),
    ("9904", "寶成", "橡膠", "TWSE"),
    ("1101", "台泥", "水泥", "TWSE"),
    ("1102", "亞泥", "水泥", "TWSE"),
    # ── 航運 ───────────────────────────────────────────────────────────────
    ("2603", "長榮", "航運", "TWSE"),
    ("2609", "陽明", "航運", "TWSE"),
    ("2615", "萬海", "航運", "TWSE"),
    ("2610", "華航", "航運", "TWSE"),
    ("2618", "長榮航", "航運", "TWSE"),
    # ── 零售 / 食品 ────────────────────────────────────────────────────────
    ("2912", "統一超", "零售", "TWSE"),
    ("2801", "彰銀", "金融保險", "TWSE"),
    ("1216", "統一", "食品工業", "TWSE"),
    ("1210", "大成", "食品工業", "TWSE"),
    # ── 上櫃 TPEx ─────────────────────────────────────────────────────────
    ("6488", "環球晶", "半導體", "TPEx"),
    ("3711", "日月光投控", "半導體", "TWSE"),
    ("6271", "同欣電", "電子零組件", "TPEx"),
    ("6510", "精測", "半導體", "TPEx"),
    ("3085", "比比昂", "電腦及週邊", "TPEx"),
    ("6594", "豐民金屬", "金屬", "TPEx"),
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
