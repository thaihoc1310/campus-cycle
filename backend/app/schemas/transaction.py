from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class TransactionResponse(BaseModel):
    id: UUID
    item_id: UUID | None
    buyer_id: UUID
    seller_id: UUID
    campaign_id: UUID | None
    amount: Decimal
    platform_fee: Decimal
    fund_amount: Decimal
    status: str
    buyer_name: str | None = None
    seller_name: str | None = None
    item_title: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
