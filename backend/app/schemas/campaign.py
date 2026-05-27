from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID
from pydantic import BaseModel

CampaignStatus = Literal["pending", "approved", "rejected", "completed"]
CampaignType = Literal["fundraising", "donation"]


class CampaignCreate(BaseModel):
    title: str
    description: str | None = None
    type: CampaignType = "fundraising"
    status: CampaignStatus = "pending"
    start_date: datetime | None = None
    end_date: datetime | None = None
    organization_id: UUID | None = None


class CampaignUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    type: CampaignType | None = None
    status: CampaignStatus | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    organization_id: UUID | None = None


class CampaignResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    type: str
    status: str
    start_date: datetime | None
    end_date: datetime | None
    organization_id: UUID | None
    organization_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CampaignImageResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    image_path: str
    is_main: bool
    created_at: datetime

    model_config = {"from_attributes": True}
