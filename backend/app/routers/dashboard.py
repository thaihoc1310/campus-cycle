from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.item import Item
from app.models.campaign import Campaign
from app.models.transaction import Transaction
from app.models.organization import Organization
from app.services.auth import require_admin

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_items = db.query(func.count(Item.id)).scalar() or 0
    total_campaigns = db.query(func.count(Campaign.id)).scalar() or 0
    total_transactions = db.query(func.count(Transaction.id)).scalar() or 0
    total_orgs = db.query(func.count(Organization.id)).scalar() or 0
    total_revenue = db.query(func.coalesce(func.sum(Transaction.platform_fee), 0)).scalar()

    return {
        "total_users": total_users,
        "total_items": total_items,
        "total_campaigns": total_campaigns,
        "total_transactions": total_transactions,
        "total_organizations": total_orgs,
        "total_revenue": float(total_revenue),
    }


@router.get("/charts")
def get_charts(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    # Monthly transactions for last 6 months
    now = datetime.now(timezone.utc)
    monthly_data = []
    for i in range(5, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)

        count = db.query(func.count(Transaction.id)).filter(
            Transaction.created_at >= month_start,
            Transaction.created_at < month_end,
        ).scalar() or 0

        revenue = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.created_at >= month_start,
            Transaction.created_at < month_end,
        ).scalar()

        monthly_data.append({
            "month": month_start.strftime("%b %Y"),
            "transactions": count,
            "revenue": float(revenue),
        })

    # Item status distribution
    item_statuses = db.query(Item.status, func.count(Item.id)).group_by(Item.status).all()
    item_chart = [{"status": s, "count": c} for s, c in item_statuses]

    # Campaign status distribution
    campaign_statuses = db.query(Campaign.status, func.count(Campaign.id)).group_by(Campaign.status).all()
    campaign_chart = [{"status": s, "count": c} for s, c in campaign_statuses]

    return {
        "monthly": monthly_data,
        "item_statuses": item_chart,
        "campaign_statuses": campaign_chart,
    }
