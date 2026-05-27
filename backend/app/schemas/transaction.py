from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class TransactionResponse(BaseModel):
    id: UUID
    transaction_type: str
    item_id: UUID | None
    from_user_id: UUID
    to_user_id: UUID | None
    campaign_id: UUID | None
    amount: Decimal
    platform_fee: Decimal
    status: str
    from_user_name: str | None = None
    to_user_name: str | None = None
    item_title: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
