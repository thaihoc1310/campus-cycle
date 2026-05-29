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
    expires_at: datetime | None = None
    from_user_name: str | None = None
    to_user_name: str | None = None
    # Contact info — only populated when status is paid/completed
    seller_name: str | None = None
    seller_phone: str | None = None
    seller_email: str | None = None
    buyer_name: str | None = None
    buyer_phone: str | None = None
    buyer_email: str | None = None
    item_title: str | None = None
    item_image: str | None = None
    item_images: list[str] = []
    item_status: str | None = None
    item_description: str | None = None
    item_price: Decimal | None = None
    campaign_title: str | None = None
    campaign_image: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
