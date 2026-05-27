from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

from app.schemas.user import UserResponse


class OrganizationCreate(BaseModel):
    name: str
    description: str | None = None
    type: str | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    type: str | None = None


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    type: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrgAdminResponse(BaseModel):
    id: UUID
    user_id: UUID
    organization_id: UUID
    user: UserResponse
    created_at: datetime

    model_config = {"from_attributes": True}


class OrgAdminCreate(BaseModel):
    user_id: UUID
