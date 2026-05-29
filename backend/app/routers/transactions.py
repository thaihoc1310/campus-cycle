import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, aliased

from app.database import get_db
from app.models.item import Item
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import TransactionResponse
from app.schemas.common import PaginatedResponse
from app.routers.sorting import apply_sort
from app.services.auth import require_admin

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _txn_to_response(t: Transaction) -> TransactionResponse:
    to_name = t.to_user.name if t.to_user else None
    if not to_name and t.transaction_type == "campaign_donation" and t.campaign and t.campaign.organization:
        to_name = t.campaign.organization.name
    return TransactionResponse(
        id=t.id, transaction_type=t.transaction_type, item_id=t.item_id,
        from_user_id=t.from_user_id, to_user_id=t.to_user_id,
        campaign_id=t.campaign_id, amount=t.amount, platform_fee=t.platform_fee,
        status=t.status,
        from_user_name=t.from_user.name if t.from_user else None,
        to_user_name=to_name,
        item_title=t.item.title if t.item else None,
        campaign_title=t.campaign.title if t.campaign else None,
        created_at=t.created_at, updated_at=t.updated_at,
    )


@router.get("", response_model=PaginatedResponse[TransactionResponse])
def list_transactions(
    page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
    search: str = Query(""),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db), _admin: User = Depends(require_admin),
):
    from_user = aliased(User)
    to_user = aliased(User)
    query = db.query(Transaction)
    if search or sort_by in {"from_user", "to_user"}:
        query = query.outerjoin(from_user, Transaction.from_user).outerjoin(to_user, Transaction.to_user)
    if sort_by == "item":
        query = query.outerjoin(Transaction.item)
    if search:
        query = query.filter(
            or_(
                from_user.name.ilike(f"%{search}%"),
                from_user.email.ilike(f"%{search}%"),
                to_user.name.ilike(f"%{search}%"),
                to_user.email.ilike(f"%{search}%"),
            )
        )
    total = query.count()
    query = apply_sort(query, sort_by, sort_order, {
        "id": Transaction.id,
        "transaction_type": Transaction.transaction_type,
        "from_user": from_user.name,
        "to_user": to_user.name,
        "item": Item.title,
        "amount": Transaction.amount,
        "platform_fee": Transaction.platform_fee,
        "status": Transaction.status,
        "created_at": Transaction.created_at,
        "updated_at": Transaction.updated_at,
    })
    txns = query.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[_txn_to_response(t) for t in txns],
        total=total, page=page, page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )
