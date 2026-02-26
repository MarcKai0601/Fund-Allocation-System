from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.quote_service import get_portfolio
from app.schemas.schemas import PortfolioOut

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])


@router.get("", response_model=PortfolioOut, summary="取得投資組合（含即時損益）")
def portfolio(db: Session = Depends(get_db)):
    return get_portfolio(db)
