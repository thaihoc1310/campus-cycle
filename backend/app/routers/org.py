import math
import os
import uuid as uuid_lib
from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.campaign import Campaign, CampaignImage, CampaignItem
from app.models.item import Item, ItemImage
from app.models.organization import Organization, OrganizationAdmin
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignImageResponse, CampaignResponse, CampaignUpdate
from app.schemas.common import PaginatedResponse
from app.schemas.organization import OrgAdminResponse, OrganizationResponse, OrganizationUpdate
from app.services.auth import get_current_user
from app.services.uploads import replace_upload

router = APIRouter(prefix="/api/org", tags=["org"])


class OrgDashboardResponse(BaseModel):
    total_campaigns: int
    approved_campaigns: int
    pending_campaigns: int
    fundraising_campaigns: int
    donation_campaigns: int
    pending_items: int
    approved_items: int
    rejected_items: int
    money_donors: int
    total_money_donations: Decimal
    campaign_statuses: list[dict]
    campaign_types: list[dict]


class OrgCampaignResponse(CampaignResponse):
    main_image: str | None = None


class OrgCampaignItemResponse(BaseModel):
    id: UUID
    item_id: UUID
    campaign_id: UUID
    status: str
    created_at: datetime
    item_title: str
    item_status: str
    item_type: str
    donor_name: str | None = None
    donor_email: str | None = None
    main_image: str | None = None


class OrgMoneyDonationResponse(BaseModel):
    id: UUID
    amount: Decimal
    platform_fee: Decimal
    status: str
    donor_name: str | None = None
    donor_email: str | None = None
    created_at: datetime


class OrgCampaignStats(BaseModel):
    money_donations: int
    total_money_donations: Decimal
    pending_items: int
    approved_items: int
    rejected_items: int


class OrgCampaignDetailResponse(BaseModel):
    campaign: OrgCampaignResponse
    images: list[CampaignImageResponse]
    stats: OrgCampaignStats
    money_donations: list[OrgMoneyDonationResponse]
    campaign_items: list[OrgCampaignItemResponse]


class CampaignItemStatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]


def _require_org_admin(org_id: str, current_user: User, db: Session) -> Organization:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    entry = (
        db.query(OrganizationAdmin)
        .filter(
            OrganizationAdmin.organization_id == org.id,
            OrganizationAdmin.user_id == current_user.id,
        )
        .first()
    )
    if not entry:
        raise HTTPException(status_code=403, detail="Organization access required")
    return org


def _item_main_image(item_id: UUID, db: Session) -> str | None:
    image = (
        db.query(ItemImage)
        .filter(ItemImage.item_id == item_id)
        .order_by(ItemImage.is_main.desc(), ItemImage.created_at.asc())
        .first()
    )
    return image.image_path if image else None


def _campaign_main_image(campaign_id: UUID, db: Session) -> str | None:
    image = (
        db.query(CampaignImage)
        .filter(CampaignImage.campaign_id == campaign_id)
        .order_by(CampaignImage.is_main.desc(), CampaignImage.created_at.asc())
        .first()
    )
    return image.image_path if image else None


def _campaign_to_response(campaign: Campaign, db: Session) -> OrgCampaignResponse:
    return OrgCampaignResponse(
        id=campaign.id,
        title=campaign.title,
        description=campaign.description,
        type=campaign.type,
        status=campaign.status,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        organization_id=campaign.organization_id,
        organization_name=campaign.organization.name if campaign.organization else None,
        main_image=_campaign_main_image(campaign.id, db),
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


def _campaign_item_to_response(campaign_item: CampaignItem, db: Session) -> OrgCampaignItemResponse:
    item = campaign_item.item
    return OrgCampaignItemResponse(
        id=campaign_item.id,
        item_id=item.id,
        campaign_id=campaign_item.campaign_id,
        status=campaign_item.status,
        created_at=campaign_item.created_at,
        item_title=item.title,
        item_status=item.status,
        item_type=item.type,
        donor_name=item.owner.name if item.owner else None,
        donor_email=item.owner.email if item.owner else None,
        main_image=_item_main_image(item.id, db),
    )


def _is_campaign_item_pending_for_org(campaign_item: CampaignItem) -> bool:
    return campaign_item.status == "pending" and campaign_item.item.status == "approved"


def _is_campaign_item_approved(campaign_item: CampaignItem) -> bool:
    return campaign_item.status == "approved" and campaign_item.item.status == "approved"


def _is_campaign_item_rejected(campaign_item: CampaignItem) -> bool:
    return campaign_item.status == "rejected" or campaign_item.item.status == "rejected"


def _sync_rejected_item_pair(campaign_item: CampaignItem) -> None:
    campaign_item.item.status = "rejected"
    for related_campaign_item in campaign_item.item.campaign_items:
        related_campaign_item.status = "rejected"


@router.get("/me", response_model=list[OrganizationResponse])
def list_my_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entries = (
        db.query(OrganizationAdmin)
        .filter(OrganizationAdmin.user_id == current_user.id)
        .join(OrganizationAdmin.organization)
        .order_by(Organization.name)
        .all()
    )
    return [OrganizationResponse.model_validate(entry.organization) for entry in entries]


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_org_profile(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    return OrganizationResponse.model_validate(org)


@router.put("/{org_id}", response_model=OrganizationResponse)
def update_org_profile(
    org_id: str,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(org, key, value)
    db.commit()
    db.refresh(org)
    return OrganizationResponse.model_validate(org)


@router.post("/{org_id}/image", response_model=OrganizationResponse)
def upload_org_image(
    org_id: str,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    org.image_url = replace_upload(image, f"organizations/{org.id}", org.image_url)
    db.commit()
    db.refresh(org)
    return OrganizationResponse.model_validate(org)


@router.get("/{org_id}/admins", response_model=list[OrgAdminResponse])
def list_org_admins(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_org_admin(org_id, current_user, db)
    admins = (
        db.query(OrganizationAdmin)
        .filter(OrganizationAdmin.organization_id == org_id)
        .order_by(OrganizationAdmin.created_at.asc())
        .all()
    )
    return [OrgAdminResponse.model_validate(admin) for admin in admins]


@router.get("/{org_id}/dashboard", response_model=OrgDashboardResponse)
def get_org_dashboard(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    campaign_ids = db.query(Campaign.id).filter(Campaign.organization_id == org.id).subquery()

    total_campaigns = db.query(func.count(Campaign.id)).filter(Campaign.organization_id == org.id).scalar() or 0
    approved_campaigns = db.query(func.count(Campaign.id)).filter(Campaign.organization_id == org.id, Campaign.status == "approved").scalar() or 0
    pending_campaigns = db.query(func.count(Campaign.id)).filter(Campaign.organization_id == org.id, Campaign.status == "pending").scalar() or 0
    fundraising_campaigns = db.query(func.count(Campaign.id)).filter(Campaign.organization_id == org.id, Campaign.type == "fundraising").scalar() or 0
    donation_campaigns = db.query(func.count(Campaign.id)).filter(Campaign.organization_id == org.id, Campaign.type == "donation").scalar() or 0

    pending_items = (
        db.query(func.count(CampaignItem.id))
        .join(Item)
        .filter(CampaignItem.campaign_id.in_(campaign_ids), CampaignItem.status == "pending", Item.status == "approved")
        .scalar()
        or 0
    )
    approved_items = (
        db.query(func.count(CampaignItem.id))
        .join(Item)
        .filter(CampaignItem.campaign_id.in_(campaign_ids), CampaignItem.status == "approved", Item.status == "approved")
        .scalar()
        or 0
    )
    rejected_items = (
        db.query(func.count(CampaignItem.id))
        .join(Item)
        .filter(CampaignItem.campaign_id.in_(campaign_ids), or_(CampaignItem.status == "rejected", Item.status == "rejected"))
        .scalar()
        or 0
    )

    money_query = db.query(Transaction).filter(
        Transaction.campaign_id.in_(campaign_ids),
        Transaction.transaction_type == "campaign_donation",
    )
    money_donors = money_query.count()
    total_money_donations = money_query.with_entities(func.coalesce(func.sum(Transaction.amount), 0)).scalar() or Decimal("0")

    status_rows = (
        db.query(Campaign.status, func.count(Campaign.id))
        .filter(Campaign.organization_id == org.id)
        .group_by(Campaign.status)
        .all()
    )
    type_rows = (
        db.query(Campaign.type, func.count(Campaign.id))
        .filter(Campaign.organization_id == org.id)
        .group_by(Campaign.type)
        .all()
    )

    return OrgDashboardResponse(
        total_campaigns=total_campaigns,
        approved_campaigns=approved_campaigns,
        pending_campaigns=pending_campaigns,
        fundraising_campaigns=fundraising_campaigns,
        donation_campaigns=donation_campaigns,
        pending_items=pending_items,
        approved_items=approved_items,
        rejected_items=rejected_items,
        money_donors=money_donors,
        total_money_donations=total_money_donations,
        campaign_statuses=[{"status": status, "count": count} for status, count in status_rows],
        campaign_types=[{"type": campaign_type, "count": count} for campaign_type, count in type_rows],
    )


@router.get("/{org_id}/campaigns", response_model=PaginatedResponse[OrgCampaignResponse])
def list_org_campaigns(
    org_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=60),
    search: str = Query(""),
    campaign_type: str = Query(""),
    status_filter: str = Query(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    query = db.query(Campaign).filter(Campaign.organization_id == org.id)
    if search:
        query = query.filter(or_(Campaign.title.ilike(f"%{search}%"), Campaign.description.ilike(f"%{search}%")))
    if campaign_type:
        query = query.filter(Campaign.type == campaign_type)
    if status_filter:
        query = query.filter(Campaign.status == status_filter)

    total = query.count()
    campaigns = (
        query.order_by(Campaign.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedResponse(
        items=[_campaign_to_response(campaign, db) for campaign in campaigns],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.post("/{org_id}/campaigns", response_model=OrgCampaignResponse, status_code=status.HTTP_201_CREATED)
def create_org_campaign(
    org_id: str,
    data: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    payload = data.model_dump()
    payload["organization_id"] = org.id
    payload["status"] = "pending"
    campaign = Campaign(**payload)
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _campaign_to_response(campaign, db)


@router.get("/{org_id}/campaigns/{campaign_id}", response_model=OrgCampaignDetailResponse)
def get_org_campaign_detail(
    org_id: str,
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.organization_id == org.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    images = (
        db.query(CampaignImage)
        .filter(CampaignImage.campaign_id == campaign.id)
        .order_by(CampaignImage.is_main.desc(), CampaignImage.created_at.asc())
        .all()
    )
    campaign_items = (
        db.query(CampaignItem)
        .join(Item)
        .filter(CampaignItem.campaign_id == campaign.id)
        .filter(or_(CampaignItem.status != "pending", Item.status != "pending"))
        .order_by(CampaignItem.created_at.desc())
        .all()
    )
    donations = (
        db.query(Transaction)
        .filter(Transaction.campaign_id == campaign.id, Transaction.transaction_type == "campaign_donation")
        .order_by(Transaction.created_at.desc())
        .limit(50)
        .all()
    )
    total_money_donations = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.campaign_id == campaign.id, Transaction.transaction_type == "campaign_donation")
        .scalar()
        or Decimal("0")
    )

    return OrgCampaignDetailResponse(
        campaign=_campaign_to_response(campaign, db),
        images=[CampaignImageResponse.model_validate(image) for image in images],
        stats=OrgCampaignStats(
            money_donations=len(donations),
            total_money_donations=total_money_donations,
            pending_items=sum(1 for item in campaign_items if _is_campaign_item_pending_for_org(item)),
            approved_items=sum(1 for item in campaign_items if _is_campaign_item_approved(item)),
            rejected_items=sum(1 for item in campaign_items if _is_campaign_item_rejected(item)),
        ),
        money_donations=[
            OrgMoneyDonationResponse(
                id=donation.id,
                amount=donation.amount,
                platform_fee=donation.platform_fee,
                status=donation.status,
                donor_name=donation.from_user.name if donation.from_user else None,
                donor_email=donation.from_user.email if donation.from_user else None,
                created_at=donation.created_at,
            )
            for donation in donations
        ],
        campaign_items=[_campaign_item_to_response(item, db) for item in campaign_items],
    )


@router.put("/{org_id}/campaigns/{campaign_id}", response_model=OrgCampaignResponse)
def update_org_campaign(
    org_id: str,
    campaign_id: str,
    data: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.organization_id == org.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    allowed_fields = {"title", "description", "type", "start_date", "end_date"}
    for key, value in data.model_dump(exclude_unset=True).items():
        if key in allowed_fields:
            setattr(campaign, key, value)

    db.commit()
    db.refresh(campaign)
    return _campaign_to_response(campaign, db)


@router.post("/{org_id}/campaigns/{campaign_id}/images", response_model=list[CampaignImageResponse], status_code=status.HTTP_201_CREATED)
async def upload_org_campaign_images(
    org_id: str,
    campaign_id: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.organization_id == org.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "campaigns", str(campaign_id))
    os.makedirs(upload_dir, exist_ok=True)

    created_images = []
    for file in files:
        ext = os.path.splitext(file.filename or "")[1] or ".jpg"
        filename = f"{uuid_lib.uuid4()}{ext}"
        filepath = os.path.join(upload_dir, filename)
        content = await file.read()
        with open(filepath, "wb") as output:
            output.write(content)
        image = CampaignImage(
            campaign_id=campaign.id,
            image_path=f"/uploads/campaigns/{campaign_id}/{filename}",
            is_main=False,
        )
        db.add(image)
        created_images.append(image)

    db.commit()
    for image in created_images:
        db.refresh(image)
    return [CampaignImageResponse.model_validate(image) for image in created_images]


@router.put("/{org_id}/campaigns/images/{image_id}/main", response_model=CampaignImageResponse)
def set_org_campaign_main_image(
    org_id: str,
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    image = db.query(CampaignImage).join(Campaign).filter(
        CampaignImage.id == image_id,
        Campaign.organization_id == org.id,
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    db.query(CampaignImage).filter(
        CampaignImage.campaign_id == image.campaign_id,
        CampaignImage.id != image.id,
    ).update({"is_main": False})
    image.is_main = True
    db.commit()
    db.refresh(image)
    return CampaignImageResponse.model_validate(image)


@router.delete("/{org_id}/campaigns/images/{image_id}", status_code=status.HTTP_200_OK)
def delete_org_campaign_image(
    org_id: str,
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    image = db.query(CampaignImage).join(Campaign).filter(
        CampaignImage.id == image_id,
        Campaign.organization_id == org.id,
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    full_path = os.path.join(settings.UPLOAD_DIR, image.image_path.lstrip("/uploads/"))
    if os.path.exists(full_path):
        os.remove(full_path)
    db.delete(image)
    db.commit()
    return {"message": "Image deleted successfully"}


@router.put("/{org_id}/campaign-items/{campaign_item_id}", response_model=OrgCampaignItemResponse)
def update_campaign_item_status(
    org_id: str,
    campaign_item_id: str,
    data: CampaignItemStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = _require_org_admin(org_id, current_user, db)
    campaign_item = (
        db.query(CampaignItem)
        .join(Campaign)
        .filter(CampaignItem.id == campaign_item_id, Campaign.organization_id == org.id)
        .first()
    )
    if not campaign_item:
        raise HTTPException(status_code=404, detail="Campaign item not found")

    if campaign_item.item.status == "rejected":
        _sync_rejected_item_pair(campaign_item)
        db.commit()
        raise HTTPException(status_code=400, detail="Item was rejected by campus admin")

    if data.status == "approved" and campaign_item.item.status != "approved":
        raise HTTPException(status_code=400, detail="Campus admin approval is required before organization approval")

    if data.status == "rejected":
        _sync_rejected_item_pair(campaign_item)
    else:
        campaign_item.status = data.status
    db.commit()
    db.refresh(campaign_item)
    return _campaign_item_to_response(campaign_item, db)
