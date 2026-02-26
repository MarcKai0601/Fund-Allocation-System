import logging
import httpx
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.stock_master import StockMaster, MarketType
from app.core.database import SessionLocal
from app.core.redis_client import set_stock_list_cache

logger = logging.getLogger(__name__)

# Comprehensive fallback list — used when live API calls fail
_POPULAR_STOCKS = [
    # ── ETF ──────────────────────────────────────────────────────────────
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
    ("00636", "國泰費城半導體", "ETF", "TWSE"),
    ("00637L", "元大滬深300正2", "ETF", "TWSE"),
    ("00638R", "元大滬深300反1", "ETF", "TWSE"),
    ("00639", "富邦深100", "ETF", "TWSE"),
    ("00642U", "元大S&P石油", "ETF", "TWSE"),
    ("00643", "群益深証中小", "ETF", "TWSE"),
    ("00646", "元大S&P500", "ETF", "TWSE"),
    ("00647L", "元大S&P500正2", "ETF", "TWSE"),
    ("00648R", "元大S&P500反1", "ETF", "TWSE"),
    ("00649", "FH永豐美國500大", "ETF", "TWSE"),
    ("00650", "元大歐洲50", "ETF", "TWSE"),
    ("00652", "富邦印度", "ETF", "TWSE"),
    ("00657", "國泰日本正2", "ETF", "TWSE"),
    ("00662", "富邦NASDAQ", "ETF", "TWSE"),
    ("00663L", "國泰臺灣加權正2", "ETF", "TWSE"),
    ("00664R", "國泰臺灣加權反1", "ETF", "TWSE"),
    ("00668", "國泰美國道瓊", "ETF", "TWSE"),
    ("00670L", "富邦NASDAQ正2", "ETF", "TWSE"),
    ("00671R", "富邦NASDAQ反1", "ETF", "TWSE"),
    ("00675L", "富邦臺灣加權正2", "ETF", "TWSE"),
    ("00676R", "富邦臺灣加權反1", "ETF", "TWSE"),
    ("00680L", "元大美國政府20年期以上債券正2", "ETF", "TWSE"),
    ("00681R", "元大美國政府20年期以上債券反1", "ETF", "TWSE"),
    ("00682B", "富邦美國政府1至3年債券", "ETF", "TWSE"),
    ("00683L", "富邦美國政府20年期以上債券正2", "ETF", "TWSE"),
    ("00684R", "富邦美國政府20年期以上債券反1", "ETF", "TWSE"),
    ("00685L", "國泰20年期以上美國公債正2", "ETF", "TWSE"),
    ("00686R", "國泰20年期以上美國公債反1", "ETF", "TWSE"),
    ("00687B", "國泰20年期以上美國公債", "ETF", "TWSE"),
    ("00688B", "國泰15年期以上公司債", "ETF", "TWSE"),
    ("00689B", "凱基10年期以上高評級公司債", "ETF", "TWSE"),
    ("00690", "兆豐臺灣藍籌30", "ETF", "TWSE"),
    ("00692", "富邦公司治理", "ETF", "TWSE"),
    ("00694B", "富邦全球優先順位高收益債", "ETF", "TWSE"),
    ("00696B", "富邦美國投資等級企業債", "ETF", "TWSE"),
    ("00697B", "元大美國政府1至3年債券", "ETF", "TWSE"),
    ("00700", "FH彭博新興市場股息ETF", "ETF", "TWSE"),
    ("00701", "國泰台灣低波動30", "ETF", "TWSE"),
    ("00702", "國泰標普低波高息", "ETF", "TWSE"),
    ("00703", "台新臺灣SmartB", "ETF", "TWSE"),
    ("00706B", "元大20年期以上AAA至A級美元公司債", "ETF", "TWSE"),
    ("00707B", "群益15年期以上公司債", "ETF", "TWSE"),
    ("00708B", "凱基10年期以上BBB級美元公司債", "ETF", "TWSE"),
    ("00709B", "台新美元公司債15年", "ETF", "TWSE"),
    ("00710B", "FH彭博1至3年期美國政府債", "ETF", "TWSE"),
    ("00711B", "FH彭博7至10年期美國政府債", "ETF", "TWSE"),
    ("00712", "復華富時不動產", "ETF", "TWSE"),
    ("00713", "元大台灣高息低波", "ETF", "TWSE"),
    ("00714B", "群益7到10年IG美元公司債", "ETF", "TWSE"),
    ("00715L", "期元大美國政府20年期以上債券正2", "ETF", "TWSE"),
    ("00720B", "元大投資級公司債", "ETF", "TWSE"),
    ("00721B", "元大美國政府20年期以上債券", "ETF", "TWSE"),
    ("00723", "群益精選非金電", "ETF", "TWSE"),
    ("00724B", "群益投資級金融債", "ETF", "TWSE"),
    ("00725B", "國泰投資級公司債", "ETF", "TWSE"),
    ("00726B", "凱基新興市場债", "ETF", "TWSE"),
    ("00727B", "中信高評級公司債", "ETF", "TWSE"),
    ("00730", "FH富時台灣High Dividend", "ETF", "TWSE"),
    ("00731", "復華富時高息低波", "ETF", "TWSE"),
    ("00733", "富邦台灣中小", "ETF", "TWSE"),
    ("00737", "FH富時全球市場", "ETF", "TWSE"),
    ("00750", "元大台灣ESG永續", "ETF", "TWSE"),
    ("00752", "中信中國高股息", "ETF", "TWSE"),
    ("00757", "統一FANG+", "ETF", "TWSE"),
    ("00762", "元大全球AI", "ETF", "TWSE"),
    ("00770", "國泰網路資安", "ETF", "TWSE"),
    ("00782", "中信台灣ESG", "ETF", "TWSE"),
    ("00783", "富邦特選美股", "ETF", "TWSE"),
    ("00858", "永豐美國科技", "ETF", "TWSE"),
    ("00861", "元大全球AI人工智慧", "ETF", "TWSE"),
    ("00864B", "中信優先金融債", "ETF", "TWSE"),
    ("00865B", "中信美國公債20年", "ETF", "TWSE"),
    ("00867B", "中國信託彭博美國綜合債券", "ETF", "TWSE"),
    ("00871B", "中信ESG投資級債", "ETF", "TWSE"),
    ("00875", "國泰基礎建設", "ETF", "TWSE"),
    ("00876", "元大未來關鍵科技", "ETF", "TWSE"),
    ("00878", "國泰永續高股息", "ETF", "TWSE"),
    ("00881", "國泰台灣5G+", "ETF", "TWSE"),
    ("00882", "中信中國5G", "ETF", "TWSE"),
    ("00883", "國泰台灣科技100", "ETF", "TWSE"),
    ("00885", "FH台灣智慧截止", "ETF", "TWSE"),
    ("00886", "永豐全球關鍵供應鏈", "ETF", "TWSE"),
    ("00887", "中信電池及儲能", "ETF", "TWSE"),
    ("00888", "永豐台灣ESG", "ETF", "TWSE"),
    ("00891", "中信關鍵半導體", "ETF", "TWSE"),
    ("00892", "富邦台灣半導體", "ETF", "TWSE"),
    ("00893", "國泰智能電動車", "ETF", "TWSE"),
    ("00894", "中信小台灣50", "ETF", "TWSE"),
    ("00895", "富邦未來車", "ETF", "TWSE"),
    ("00896", "中信綠能及電動車", "ETF", "TWSE"),
    ("00897", "富邦元宇宙", "ETF", "TWSE"),
    ("00898", "華南台灣智趨", "ETF", "TWSE"),
    ("00900", "富邦特選高股息30", "ETF", "TWSE"),
    ("00901", "永豐台灣ET量化", "ETF", "TWSE"),
    ("00903", "富邦新科技", "ETF", "TWSE"),
    ("00904", "新光臺灣半導體30", "ETF", "TWSE"),
    ("00905", "FT臺灣Smart", "ETF", "TWSE"),
    ("00907", "永豐智能低波高息", "ETF", "TWSE"),
    ("00909", "國泰數位支付服務", "ETF", "TWSE"),
    ("00910", "第一金太空衛星", "ETF", "TWSE"),
    ("00912", "中信臺灣智慧50", "ETF", "TWSE"),
    ("00913", "兆豐台灣晶圓製造", "ETF", "TWSE"),
    ("00914", "中信智慧城市", "ETF", "TWSE"),
    ("00915", "凱基優選高股息30", "ETF", "TWSE"),
    ("00916", "國泰全球品牌50", "ETF", "TWSE"),
    ("00917", "中信特選金融", "ETF", "TWSE"),
    ("00918", "大華優利高填息30", "ETF", "TWSE"),
    ("00919", "群益台灣精選高息", "ETF", "TWSE"),
    ("00920", "富邦台灣核心科技", "ETF", "TWSE"),
    ("00921", "永豐台灣夢想ETF", "ETF", "TWSE"),
    ("00922", "國泰台灣動能高息", "ETF", "TWSE"),
    ("00923", "群益台灣ESG低碳高息", "ETF", "TWSE"),
    ("00924", "凱基優選金融股30", "ETF", "TWSE"),
    ("00925", "台新台灣IC設計", "ETF", "TWSE"),
    ("00926", "永豐ESG低碳高息", "ETF", "TWSE"),
    ("00927", "群益半導體收益", "ETF", "TWSE"),
    ("00928", "中信成長高股息", "ETF", "TWSE"),
    ("00929", "復華台灣科技優息", "ETF", "TWSE"),
    ("00930", "永豐ESG低碳高息", "ETF", "TWSE"),
    ("00931", "台新臺灣中小成長", "ETF", "TWSE"),
    ("00932", "兆豐永續高息等權", "ETF", "TWSE"),
    ("00934", "中信成長高股息", "ETF", "TWSE"),
    ("00935", "野村台灣新科技50", "ETF", "TWSE"),
    ("00936", "台新臺灣永續高息", "ETF", "TWSE"),
    ("00939", "台新台灣永續高息", "ETF", "TWSE"),
    ("00940", "元大台灣價值高息", "ETF", "TWSE"),
    ("00941", "台新北美科技", "ETF", "TWSE"),
    ("00944", "第一金小型高優息", "ETF", "TWSE"),
    ("00945", "台新臺灣IC設計", "ETF", "TWSE"),
    ("00946", "元大臺灣價值成長", "ETF", "TWSE"),
    ("00947", "大華高息本夢比ETF", "ETF", "TWSE"),
    ("00948", "永豐特選半導體ETF", "ETF", "TWSE"),
    ("00949", "凱基金融股精選ETF", "ETF", "TWSE"),
    ("00950", "逆風高息ETF", "ETF", "TWSE"),
    ("00951", "永豐MSCI台灣ETF", "ETF", "TWSE"),

    # ── 半導體 / 電子 ───────────────────────────────────────────────────
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
    ("2449", "京元電子", "半導體", "TWSE"),
    ("3293", "鈺太", "半導體", "TWSE"),
    ("5347", "世界先進", "半導體", "TWSE"),
    ("6598", "良維", "半導體", "TWSE"),
    ("8299", "群聯", "半導體", "TPEx"),
    ("3663", "峰岹科技-KY", "半導體", "TPEx"),
    ("3529", "力旺", "半導體", "TPEx"),
    ("3714", "昱捷", "半導體", "TPEx"),
    ("4966", "譜瑞-KY", "半導體", "TPEx"),
    ("6269", "台郡", "半導體", "TPEx"),
    ("6510", "精測", "半導體", "TPEx"),
    ("6488", "環球晶", "半導體", "TPEx"),

    # ── AI / 伺服器 ─────────────────────────────────────────────────────
    ("2382", "廣達", "電腦及週邊", "TWSE"),
    ("6669", "緯穎", "電腦及週邊", "TWSE"),
    ("3231", "緯創", "電腦及週邊", "TWSE"),
    ("2356", "英業達", "電腦及週邊", "TWSE"),
    ("2353", "宏碁", "電腦及週邊", "TWSE"),
    ("2357", "華碩", "電腦及週邊", "TWSE"),
    ("2376", "技嘉", "電腦及週邊", "TWSE"),
    ("2324", "仁寶", "電腦及週邊", "TWSE"),
    ("2395", "研華", "電腦及週邊", "TWSE"),
    ("3006", "晶豪科", "電腦及週邊", "TWSE"),
    ("6214", "精誠", "資訊服務", "TWSE"),
    ("3017", "奇鋐", "電子零組件", "TWSE"),
    ("2317", "鴻海", "電子零組件", "TWSE"),
    ("2354", "鴻準", "電腦及週邊", "TWSE"),
    ("2301", "光寶科", "電子零組件", "TWSE"),
    ("2308", "台達電", "電子零組件", "TWSE"),
    ("2474", "可成", "其他電子", "TWSE"),
    ("3045", "台灣大", "通信網路", "TWSE"),
    ("3533", "嘉澤", "電子零組件", "TWSE"),
    ("4938", "和碩", "電腦及週邊", "TWSE"),
    ("6409", "旭隼", "電子零組件", "TWSE"),

    # ── 光電 / 顯示 ─────────────────────────────────────────────────────
    ("2409", "友達", "光電", "TWSE"),
    ("3481", "群創", "光電", "TWSE"),
    ("3008", "大立光", "光學鏡頭", "TWSE"),
    ("2458", "義隆", "光電", "TWSE"),
    ("3706", "神達", "光電", "TWSE"),
    ("2360", "致茂", "光電", "TWSE"),
    ("3189", "景碩", "印刷電路板", "TWSE"),
    ("4958", "臻鼎-KY", "印刷電路板", "TWSE"),
    ("3037", "欣興", "印刷電路板", "TWSE"),
    ("2345", "智邦", "通信網路", "TWSE"),

    # ── 金融保險 / 銀行 ─────────────────────────────────────────────────
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
    ("2801", "彰銀", "金融保險", "TWSE"),
    ("5871", "中租-KY", "金融保險", "TWSE"),
    ("5876", "上海商銀", "金融保險", "TWSE"),
    ("2849", "安泰銀", "金融保險", "TWSE"),
    ("2812", "台中銀", "金融保險", "TWSE"),
    ("2834", "臺企銀", "金融保險", "TWSE"),

    # ── 通信網路 ─────────────────────────────────────────────────────────
    ("2412", "中華電", "通信網路", "TWSE"),
    ("4904", "遠傳", "通信網路", "TWSE"),
    ("3045", "台灣大", "通信網路", "TWSE"),
    ("6547", "高端疫苗", "生技醫療", "TWSE"),

    # ── 塑膠 / 石化 ──────────────────────────────────────────────────────
    ("1301", "台塑", "塑膠", "TWSE"),
    ("1303", "南亞", "塑膠", "TWSE"),
    ("1326", "台化", "塑膠", "TWSE"),
    ("6505", "台塑化", "石油化工", "TWSE"),
    ("1402", "遠東新", "紡織纖維", "TWSE"),
    ("1434", "福懋", "紡織纖維", "TWSE"),
    ("1440", "南紡", "紡織纖維", "TWSE"),
    ("1476", "儒鴻", "紡織纖維", "TWSE"),
    ("1477", "聚陽", "紡織纖維", "TWSE"),

    # ── 鋼鐵 / 金屬 ──────────────────────────────────────────────────────
    ("2002", "中鋼", "鋼鐵", "TWSE"),
    ("2006", "東和鋼鐵", "鋼鐵", "TWSE"),
    ("2014", "中鴻", "鋼鐵", "TWSE"),
    ("2015", "豐興", "鋼鐵", "TWSE"),
    ("2038", "海光", "鋼鐵", "TWSE"),
    ("2049", "上銀", "機械", "TWSE"),
    ("2059", "川湖", "機械", "TWSE"),
    ("2031", "新光鋼", "鋼鐵", "TWSE"),
    ("9904", "寶成", "橡膠", "TWSE"),
    ("1101", "台泥", "水泥", "TWSE"),
    ("1102", "亞泥", "水泥", "TWSE"),
    ("1108", "幸福水泥", "水泥", "TWSE"),
    ("1109", "信大水泥", "水泥", "TWSE"),

    # ── 航運 ─────────────────────────────────────────────────────────────
    ("2603", "長榮", "航運", "TWSE"),
    ("2609", "陽明", "航運", "TWSE"),
    ("2615", "萬海", "航運", "TWSE"),
    ("2610", "華航", "航運", "TWSE"),
    ("2618", "長榮航", "航運", "TWSE"),
    ("2606", "裕民", "航運", "TWSE"),
    ("2612", "中航", "航運", "TWSE"),
    ("2614", "東森國際", "航運", "TWSE"),
    ("2634", "漢翔", "航運", "TWSE"),
    ("2637", "慧洋-KY", "航運", "TWSE"),
    ("2642", "宅配通", "航運", "TWSE"),
    ("5608", "四維航", "航運", "TWSE"),
    ("8940", "新燕", "航運", "TWSE"),

    # ── 零售 / 食品 ──────────────────────────────────────────────────────
    ("2912", "統一超", "零售", "TWSE"),
    ("1216", "統一", "食品工業", "TWSE"),
    ("1210", "大成", "食品工業", "TWSE"),
    ("1229", "聯華", "食品工業", "TWSE"),
    ("1234", "黑松", "食品工業", "TWSE"),
    ("1235", "興泰", "食品工業", "TWSE"),
    ("1256", "鮮活果汁-KY", "食品工業", "TWSE"),
    ("2723", "美食-KY", "餐飲業", "TWSE"),
    ("2727", "王品", "餐飲業", "TWSE"),
    ("2729", "瓦城", "餐飲業", "TWSE"),
    ("2731", "雄獅", "觀光", "TWSE"),
    ("2733", "五福", "觀光", "TWSE"),
    ("2739", "寒舍美食", "觀光", "TWSE"),
    ("2901", "欣欣", "百貨", "TWSE"),
    ("2903", "遠百", "百貨", "TWSE"),
    ("2908", "特力", "百貨", "TWSE"),

    # ── 生技 / 醫療 ──────────────────────────────────────────────────────
    ("1786", "科妍", "生技醫療", "TWSE"),
    ("1789", "神隆", "生技醫療", "TWSE"),
    ("4551", "智邦生醫", "生技醫療", "TWSE"),
    ("4126", "太醫", "生技醫療", "TWSE"),
    ("4137", "麗豐-KY", "生技醫療", "TWSE"),
    ("4148", "全宇生技-KY", "生技醫療", "TWSE"),
    ("4164", "博晟生醫", "生技醫療", "TWSE"),
    ("4174", "浩鼎", "生技醫療", "TWSE"),
    ("4804", "大學光", "生技醫療", "TWSE"),
    ("6547", "高端疫苗", "生技醫療", "TWSE"),
    ("6550", "北極星藥業-KY", "生技醫療", "TWSE"),
    ("2867", "三商壽", "保險", "TWSE"),

    # ── 建設 / 營造 ──────────────────────────────────────────────────────
    ("2880", "華南金", "金融保險", "TWSE"),
    ("5522", "遠雄", "建設", "TWSE"),
    ("5534", "長虹", "建設", "TWSE"),
    ("5536", "聖暉", "建設", "TWSE"),
    ("5538", "東明", "建設", "TWSE"),
    ("5607", "遠雄港", "建設", "TWSE"),
    ("2501", "國建", "建設", "TWSE"),
    ("2503", "長榮建設", "建設", "TWSE"),
    ("2505", "國揚", "建設", "TWSE"),
    ("5516", "碩河", "建設", "TWSE"),
    ("2515", "中工", "建設", "TWSE"),
    ("2520", "冠德", "建設", "TWSE"),
    ("2524", "京城", "建設", "TWSE"),
    ("2527", "宏璟", "建設", "TWSE"),
    ("2542", "興富發", "建設", "TWSE"),
    ("2545", "皇翔", "建設", "TWSE"),
    ("2546", "根基", "建設", "TWSE"),
    ("2548", "華固", "建設", "TWSE"),

    # ── 電力 / 綠能 ──────────────────────────────────────────────────────
    ("6244", "茂迪", "半導體", "TPEx"),
    ("3576", "聯合再生", "半導體", "TWSE"),
    ("6409", "旭隼", "電子零組件", "TWSE"),
    ("3296", "勝德", "電子零組件", "TPEx"),
    ("6657", "台生材", "化學", "TPEx"),

    # ── 上櫃精選 TPEx ───────────────────────────────────────────────────
    ("6271", "同欣電", "電子零組件", "TPEx"),
    ("3085", "比比昂", "電腦及週邊", "TPEx"),
    ("6594", "豐民金屬", "金屬", "TPEx"),
    ("6153", "嘉聯益", "印刷電路板", "TPEx"),
    ("3419", "譜瑞", "半導體", "TPEx"),
    ("4968", "立積", "半導體", "TPEx"),
    ("6176", "瑞儀", "光電", "TPEx"),
    ("3380", "明泰", "通信網路", "TPEx"),
    ("3704", "合勤控", "通信網路", "TPEx"),
    ("8070", "長華電材", "電子零組件", "TPEx"),
    ("6269", "台郡", "電子零組件", "TPEx"),
    ("6202", "盛群", "半導體", "TPEx"),
    ("3035", "智原", "半導體", "TPEx"),
    ("3711", "日月光投控", "半導體", "TWSE"),
]


def _fetch_twse_stocks() -> list[dict]:
    """從 TWSE 公開 API 取得完整上市股票清單"""
    url = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
    try:
        resp = httpx.get(url, timeout=15, follow_redirects=True)
        resp.raise_for_status()
        data = resp.json()
        results = []
        for item in data:
            symbol = item.get("Code", "").strip()
            name = item.get("Name", "").strip()
            if symbol and name:
                results.append({"symbol": symbol, "name": name, "sector": None, "market": "TWSE"})
        logger.info(f"TWSE API returned {len(results)} stocks")
        return results
    except Exception as e:
        logger.warning(f"TWSE open API failed: {e}")
        return []


def _fetch_tpex_stocks() -> list[dict]:
    """從 TPEx 公開 API 取得完整上櫃股票清單"""
    url = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes"
    try:
        resp = httpx.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        results = []
        for item in data:
            symbol = item.get("SecuritiesCompanyCode", "").strip()
            name = item.get("CompanyName", "").strip()
            if symbol and name:
                results.append({"symbol": symbol, "name": name, "sector": item.get("industry"), "market": "TPEx"})
        logger.info(f"TPEx API returned {len(results)} stocks")
        return results
    except Exception as e:
        logger.warning(f"TPEx open API failed: {e}")
        return []


def sync_stock_master() -> int:
    """
    Sync Taiwan stock list from TWSE/TPEx open APIs.
    Falls back to built-in popular stocks list if APIs are unavailable.
    Returns number of records upserted.
    """
    db: Session = SessionLocal()
    count = 0
    try:
        stocks_to_upsert: list[dict] = []

        # 1. Try live TWSE + TPEx APIs first
        twse_stocks = _fetch_twse_stocks()
        tpex_stocks = _fetch_tpex_stocks()
        stocks_to_upsert = twse_stocks + tpex_stocks

        # 2. Try twstock as secondary source if APIs returned nothing
        if not stocks_to_upsert:
            try:
                import twstock
                for symbol, info in twstock.twse.items():
                    stocks_to_upsert.append({"symbol": symbol, "name": info.name, "sector": getattr(info, "group", None), "market": "TWSE"})
                for symbol, info in twstock.otc.items():
                    stocks_to_upsert.append({"symbol": symbol, "name": info.name, "sector": getattr(info, "group", None), "market": "TPEx"})
                logger.info(f"twstock returned {len(stocks_to_upsert)} stocks")
            except Exception as e:
                logger.warning(f"twstock also failed ({e}), using built-in fallback list")

        # 3. Final fallback: built-in list
        if not stocks_to_upsert:
            logger.warning("All live sources failed — using built-in popular stocks fallback")
            for sym, name, sector, market in _POPULAR_STOCKS:
                stocks_to_upsert.append({"symbol": sym, "name": name, "sector": sector, "market": market})

        # Merge built-in list entries that are not already present in live data
        live_symbols = {s["symbol"] for s in stocks_to_upsert}
        for sym, name, sector, market in _POPULAR_STOCKS:
            if sym not in live_symbols:
                stocks_to_upsert.append({"symbol": sym, "name": name, "sector": sector, "market": market})

        now = datetime.utcnow()
        seen: set[str] = set()
        for item in stocks_to_upsert:
            sym = item["symbol"]
            if sym in seen:
                continue
            seen.add(sym)
            existing = db.query(StockMaster).filter(StockMaster.symbol == sym).first()
            if existing:
                existing.name = item["name"]
                existing.sector = item.get("sector")
                existing.synced_at = now
            else:
                db.add(StockMaster(
                    symbol=sym,
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
    """Returns True if stock_master has fewer than 200 stocks or last sync > 7 days."""
    count = db.query(StockMaster).count()
    if count < 200:
        return True
    latest = db.query(StockMaster).order_by(StockMaster.synced_at.desc()).first()
    if latest and latest.synced_at:
        return datetime.utcnow() - latest.synced_at > timedelta(days=7)
    return True
