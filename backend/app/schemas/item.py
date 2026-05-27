from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class ItemCreate(BaseModel):
    title: str
    description: str | None = None
    price: Decimal = Decimal("0")
    type: str = "sell"
    status: str = "draft"
    category_id: UUID | None = None
    user_id: UUID


class ItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price: Decimal | None = None
    type: str | None = None
    status: str | None = None
    category_id: UUID | None = None


class ItemResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    price: Decimal
    type: str
    status: str
    category_id: UUID | None
    user_id: UUID
    owner_name: str | None = None
    category_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ItemImageResponse(BaseModel):
    id: UUID
    item_id: UUID
    image_path: str
    is_main: bool
    created_at: datetime

    model_config = {"from_attributes": True}
