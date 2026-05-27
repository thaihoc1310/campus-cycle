import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionResponse
from app.schemas.common import PaginatedResponse
from app.services.auth import require_admin

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _txn_to_response(t: Transaction) -> TransactionResponse:
    return TransactionResponse(
        id=t.id, item_id=t.item_id, buyer_id=t.buyer_id, seller_id=t.seller_id,
        campaign_id=t.campaign_id, amount=t.amount, platform_fee=t.platform_fee,
        fund_amount=t.fund_amount, status=t.status,
        buyer_name=t.buyer.name if t.buyer else None,
        seller_name=t.seller.name if t.seller else None,
        item_title=t.item.title if t.item else None,
        created_at=t.created_at, updated_at=t.updated_at,
    )


@router.get("", response_model=PaginatedResponse[TransactionResponse])
def list_transactions(
    page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
    search: str = Query(""),
    db: Session = Depends(get_db), _admin: User = Depends(require_admin),
):
    query = db.query(Transaction)
    if search:
        query = query.join(Transaction.buyer, aliased=True).filter(
            or_(User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%"))
        )
    total = query.count()
    txns = query.order_by(Transaction.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[_txn_to_response(t) for t in txns],
        total=total, page=page, page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )
