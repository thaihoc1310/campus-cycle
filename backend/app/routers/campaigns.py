import math
import os
import uuid as uuid_lib
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.campaign import Campaign, CampaignImage
from app.models.organization import Organization
from app.models.user import User
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse, CampaignImageResponse
from app.schemas.common import PaginatedResponse
from app.routers.sorting import apply_sort
from app.services.auth import require_admin

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


def _campaign_to_response(c: Campaign) -> CampaignResponse:
    images_list = []
    if hasattr(c, "images") and c.images:
        images_list = [CampaignImageResponse.model_validate(img) for img in c.images]
        
    return CampaignResponse(
        id=c.id, title=c.title, description=c.description,
        type=c.type, status=c.status, start_date=c.start_date, end_date=c.end_date,
        organization_id=c.organization_id,
        organization_name=c.organization.name if c.organization else None,
        created_at=c.created_at, updated_at=c.updated_at,
        images=images_list 
    )


@router.get("", response_model=PaginatedResponse[CampaignResponse])
def list_campaigns(
    page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
    search: str = Query(""),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db), _admin: User = Depends(require_admin),
):
    query = db.query(Campaign)
    if search:
        query = query.filter(or_(Campaign.title.ilike(f"%{search}%"), Campaign.description.ilike(f"%{search}%")))
    total = query.count()
    if sort_by == "organization":
        query = query.outerjoin(Campaign.organization)
    query = apply_sort(query, sort_by, sort_order, {
        "title": Campaign.title,
        "type": Campaign.type,
        "status": Campaign.status,
        "organization": Organization.name,
        "start_date": Campaign.start_date,
        "end_date": Campaign.end_date,
        "created_at": Campaign.created_at,
        "updated_at": Campaign.updated_at,
    })
    campaigns = query.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[_campaign_to_response(c) for c in campaigns],
        total=total, page=page, page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    campaign = Campaign(**data.model_dump())
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _campaign_to_response(campaign)


@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(campaign_id: str, data: CampaignUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(campaign, key, value)
    db.commit()
    db.refresh(campaign)
    return _campaign_to_response(campaign)


@router.delete("/{campaign_id}", status_code=status.HTTP_200_OK)
def delete_campaign(campaign_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted successfully"}


# --- Image Management ---

@router.get("/{campaign_id}/images", response_model=list[CampaignImageResponse])
def list_campaign_images(campaign_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    images = db.query(CampaignImage).filter(CampaignImage.campaign_id == campaign_id).order_by(CampaignImage.created_at).all()
    return [CampaignImageResponse.model_validate(img) for img in images]


@router.post("/{campaign_id}/images", response_model=list[CampaignImageResponse], status_code=status.HTTP_201_CREATED)
async def upload_campaign_images(
    campaign_id: str, files: List[UploadFile] = File(...),
    db: Session = Depends(get_db), _admin: User = Depends(require_admin),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "campaigns", str(campaign_id))
    os.makedirs(upload_dir, exist_ok=True)

    created_images = []
    for file in files:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        filename = f"{uuid_lib.uuid4()}{ext}"
        filepath = os.path.join(upload_dir, filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        relative_path = f"/uploads/campaigns/{campaign_id}/{filename}"
        img = CampaignImage(campaign_id=campaign.id, image_path=relative_path, is_main=False)
        db.add(img)
        created_images.append(img)

    db.commit()
    for img in created_images:
        db.refresh(img)
    return [CampaignImageResponse.model_validate(img) for img in created_images]


@router.put("/images/{image_id}/main", response_model=CampaignImageResponse)
def set_main_image(image_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    image = db.query(CampaignImage).filter(CampaignImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    db.query(CampaignImage).filter(CampaignImage.campaign_id == image.campaign_id, CampaignImage.id != image.id).update({"is_main": False})
    image.is_main = True
    db.commit()
    db.refresh(image)
    return CampaignImageResponse.model_validate(image)


@router.delete("/images/{image_id}", status_code=status.HTTP_200_OK)
def delete_campaign_image(image_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    image = db.query(CampaignImage).filter(CampaignImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    full_path = os.path.join(settings.UPLOAD_DIR, image.image_path.lstrip("/uploads/"))
    if os.path.exists(full_path):
        os.remove(full_path)
    db.delete(image)
    db.commit()
    return {"message": "Image deleted successfully"}