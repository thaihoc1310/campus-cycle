import math
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.campaign import Campaign, CampaignImage, CampaignItem
from app.models.category import Category
from app.models.item import Item, ItemImage
from app.models.organization import Organization
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.campaign import CampaignImageResponse, CampaignResponse
from app.schemas.category import CategoryResponse
from app.schemas.organization import OrganizationResponse
from app.schemas.common import PaginatedResponse
from app.schemas.item import ItemImageResponse, ItemResponse
from app.schemas.transaction import TransactionResponse
from app.services.auth import get_current_user, require_active_user
from app.services.uploads import delete_upload, replace_upload

router = APIRouter(prefix="/api/client", tags=["client"])

SELL_FEE_RATE = Decimal("0.20")

# How long a buyer has to complete payment after initiating a purchase
PENDING_SALE_TTL = timedelta(minutes=1)
PENDING_DONATION_TTL = timedelta(minutes=1)
# How long after payment before we auto-complete on behalf of buyer (no handover confirmation)
PAID_AUTO_COMPLETE_TTL = timedelta(days=30)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_tz(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _transaction_expires_at(transaction: Transaction) -> datetime | None:
    if transaction.status == "pending":
        ttl = PENDING_SALE_TTL if transaction.transaction_type == "sale" else PENDING_DONATION_TTL
        return _ensure_tz(transaction.created_at) + ttl
    if transaction.status == "paid" and transaction.transaction_type == "sale":
        return _ensure_tz(transaction.updated_at) + PAID_AUTO_COMPLETE_TTL
    return None


def _lazy_expire_pending(transaction: Transaction, db: Session) -> bool:
    """Cancel a pending transaction if its payment window has passed. Returns True if cancelled."""
    if transaction.status != "pending":
        return False
    expires_at = _transaction_expires_at(transaction)
    if expires_at and _now() > expires_at:
        transaction.status = "cancelled"
        db.commit()
        return True
    return False


def _lazy_auto_complete(transaction: Transaction, db: Session) -> bool:
    """Auto-complete a paid transaction if the handover window has passed. Returns True if completed."""
    if transaction.status != "paid" or transaction.transaction_type != "sale":
        return False
    expires_at = _transaction_expires_at(transaction)
    if expires_at and _now() > expires_at:
        item = db.query(Item).filter(Item.id == transaction.item_id).first()
        if item:
            item.status = "sold"
        transaction.status = "completed"
        db.commit()
        return True
    return False


class ClientItemResponse(ItemResponse):
    main_image: str | None = None
    images: list[ItemImageResponse] = Field(default_factory=list)
    item_status: str | None = None
    campaign_item_status: str | None = None
    campaign_id: UUID | None = None
    campaign_name: str | None = None
    buyer_name: str | None = None
    buyer_phone: str | None = None
    buyer_email: str | None = None


class ClientCampaignResponse(CampaignResponse):
    main_image: str | None = None
    images: list[CampaignImageResponse] = Field(default_factory=list)


class PurchasePreview(BaseModel):
    item_price: Decimal
    buyer_platform_fee: Decimal
    seller_platform_fee: Decimal
    platform_fee: Decimal
    buyer_total: Decimal
    seller_receives: Decimal


class PurchaseResponse(BaseModel):
    transaction: TransactionResponse
    preview: PurchasePreview


class MoneyDonationCreate(BaseModel):
    amount: Decimal


class ClientItemCreate(BaseModel):
    title: str
    description: str | None = None
    price: Decimal = Decimal("0")
    type: str = "sell"
    category_id: UUID | None = None
    campaign_id: UUID | None = None


class ClientItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price: Decimal | None = None
    category_id: UUID | None = None


class CampaignItemCreate(BaseModel):
    item_id: UUID


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))


def _item_preview(item: Item) -> PurchasePreview:
    price = _money(item.price or Decimal("0"))
    if item.type == "donate":
        return PurchasePreview(
            item_price=Decimal("0.00"),
            buyer_platform_fee=Decimal("0.00"),
            seller_platform_fee=Decimal("0.00"),
            platform_fee=Decimal("0.00"),
            buyer_total=Decimal("0.00"),
            seller_receives=Decimal("0.00"),
        )

    platform_fee = _money(price * SELL_FEE_RATE)
    buyer_fee = _money(platform_fee / Decimal("2"))
    seller_fee = platform_fee - buyer_fee
    return PurchasePreview(
        item_price=price,
        buyer_platform_fee=buyer_fee,
        seller_platform_fee=seller_fee,
        platform_fee=platform_fee,
        buyer_total=price + buyer_fee,
        seller_receives=price - seller_fee,
    )


def _item_images(item_id: UUID, db: Session) -> list[ItemImage]:
    return (
        db.query(ItemImage)
        .filter(ItemImage.item_id == item_id)
        .order_by(ItemImage.is_main.desc(), ItemImage.created_at.asc())
        .all()
    )



def _campaign_images(campaign_id: UUID, db: Session) -> list[CampaignImage]:
    return (
        db.query(CampaignImage)
        .filter(CampaignImage.campaign_id == campaign_id)
        .order_by(CampaignImage.is_main.desc(), CampaignImage.created_at.asc())
        .all()
    )


def _campaign_main_image(campaign_id: UUID, db: Session) -> str | None:
    images = _campaign_images(campaign_id, db)
    image = images[0] if images else None
    return image.image_path if image else None


def _primary_campaign_item(item: Item) -> CampaignItem | None:
    campaign_items = list(item.campaign_items or [])
    if not campaign_items:
        return None
    return sorted(campaign_items, key=lambda entry: entry.created_at, reverse=True)[0]


def _effective_item_status(item: Item) -> str:
    if item.type != "donate":
        return item.status

    campaign_items = list(item.campaign_items or [])
    if item.status == "rejected" or any(entry.status == "rejected" for entry in campaign_items):
        return "rejected"
    if item.status == "donated" or any(entry.status == "received" for entry in campaign_items):
        return "donated"
    if not campaign_items:
        return item.status
    if item.status != "approved":
        return item.status
    if any(entry.status == "handover" for entry in campaign_items):
        return "handover"
    return "awaiting_org_review"


def _public_item_filter():
    return and_(Item.type == "sell", Item.status == "approved")


def _is_public_item(item: Item) -> bool:
    return item.type == "sell" and item.status == "approved"


def _item_to_response(item: Item, db: Session) -> ClientItemResponse:
    campaign_item = _primary_campaign_item(item)
    images = _item_images(item.id, db)

    # Look up buyer info when item is reserved or sold
    buyer_name = buyer_phone = buyer_email = None
    if item.status in ("reserved", "sold"):
        txn = (
            db.query(Transaction)
            .filter(
                Transaction.item_id == item.id,
                Transaction.status.in_(["paid", "completed"]),
            )
            .order_by(Transaction.updated_at.desc())
            .first()
        )
        if txn and txn.from_user:
            buyer_name = txn.from_user.name
            buyer_phone = txn.from_user.phone
            buyer_email = txn.from_user.email

    return ClientItemResponse(
        id=item.id,
        title=item.title,
        description=item.description,
        price=item.price,
        type=item.type,
        status=_effective_item_status(item),
        category_id=item.category_id,
        user_id=item.user_id,
        owner_name=None,
        category_name=item.category.name if item.category else None,
        main_image=images[0].image_path if images else None,
        images=[ItemImageResponse.model_validate(image) for image in images],
        item_status=item.status,
        campaign_item_status=campaign_item.status if campaign_item else None,
        campaign_id=campaign_item.campaign_id if campaign_item else None,
        campaign_name=campaign_item.campaign.title if campaign_item and campaign_item.campaign else None,
        buyer_name=buyer_name,
        buyer_phone=buyer_phone,
        buyer_email=buyer_email,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _campaign_to_response(campaign: Campaign, db: Session) -> ClientCampaignResponse:
    images = _campaign_images(campaign.id, db)
    return ClientCampaignResponse(
        id=campaign.id,
        title=campaign.title,
        description=campaign.description,
        type=campaign.type,
        status=campaign.status,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        organization_id=campaign.organization_id,
        organization_name=campaign.organization.name if campaign.organization else None,
        main_image=images[0].image_path if images else None,
        images=[CampaignImageResponse.model_validate(image) for image in images],
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )


def _transaction_to_response(transaction: Transaction, db: Session | None = None) -> TransactionResponse:
    item_image = None
    item_images: list[str] = []
    if transaction.item and db is not None:
        images = _item_images(transaction.item.id, db)
        item_images = [img.image_path for img in images if img.image_path]
        item_image = item_images[0] if item_images else None
    campaign_image = None
    campaign_title = None
    if transaction.campaign and db is not None:
        campaign_title = transaction.campaign.title
        campaign_image = _campaign_main_image(transaction.campaign.id, db)

    # Only reveal contact info when the transaction is paid or completed
    reveal_contact = transaction.status in ("paid", "completed")
    seller_name = None
    seller_phone = None
    seller_email = None
    buyer_name = None
    buyer_phone = None
    buyer_email = None
    if reveal_contact:
        if transaction.to_user:
            seller_name = transaction.to_user.name
            seller_phone = transaction.to_user.phone
            seller_email = transaction.to_user.email
        if transaction.from_user:
            buyer_name = transaction.from_user.name
            buyer_phone = transaction.from_user.phone
            buyer_email = transaction.from_user.email

    return TransactionResponse(
        id=transaction.id,
        transaction_type=transaction.transaction_type,
        item_id=transaction.item_id,
        from_user_id=transaction.from_user_id,
        to_user_id=transaction.to_user_id,
        campaign_id=transaction.campaign_id,
        amount=transaction.amount,
        platform_fee=transaction.platform_fee,
        status=transaction.status,
        expires_at=_transaction_expires_at(transaction),
        from_user_name=None,
        to_user_name=None,
        seller_name=seller_name,
        seller_phone=seller_phone,
        seller_email=seller_email,
        buyer_name=buyer_name,
        buyer_phone=buyer_phone,
        buyer_email=buyer_email,
        item_title=transaction.item.title if transaction.item else None,
        item_image=item_image,
        item_images=item_images,
        item_status=transaction.item.status if transaction.item else None,
        item_description=transaction.item.description if transaction.item else None,
        item_price=transaction.item.price if transaction.item else None,
        campaign_title=campaign_title,
        campaign_image=campaign_image,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
    )


class FeedEntry(BaseModel):
    feed_type: str  # 'item' or 'campaign'
    row_key: str
    row_size: int
    item: ClientItemResponse | None = None
    campaign: ClientCampaignResponse | None = None


@router.get("/feed")
def list_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=60),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    items_q = db.query(Item).filter(_public_item_filter()).order_by(Item.created_at.desc()).all()
    campaigns_q = (
        db.query(Campaign)
        .filter(Campaign.status == "approved")
        .order_by(Campaign.created_at.desc())
        .limit(3)
        .all()
    )

    item_entries = []
    for item in items_q:
        item_entries.append({
            "feed_type": "item",
            "created_at": item.created_at,
            "data": _item_to_response(item, db),
        })
    campaign_entries = []
    for campaign in campaigns_q:
        campaign_entries.append({
            "feed_type": "campaign",
            "created_at": campaign.created_at,
            "data": _campaign_to_response(campaign, db),
        })

    # Use a stable pseudo-random layout so pagination remains consistent while
    # the feed still feels varied whenever the available content changes.
    layout_seed = "|".join(str(entry["data"].id) for entry in item_entries + campaign_entries)
    randomizer = random.Random(layout_seed)
    randomizer.shuffle(item_entries)
    randomizer.shuffle(campaign_entries)

    entries: list[dict] = []
    item_index = 0
    campaign_index = 0
    row_index = 0
    item_rows_until_campaign = 2
    while item_index < len(item_entries) or campaign_index < len(campaign_entries):
        if item_index < len(item_entries):
            remaining = len(item_entries) - item_index
            if row_index == 0:
                row_size = min(2, remaining)
            elif row_index == 1:
                row_size = min(3, remaining)
            else:
                row_size = remaining if remaining <= 3 else 2 if remaining == 4 else randomizer.choice([2, 3])
            row_key = f"items-{row_index}"
            for entry in item_entries[item_index : item_index + row_size]:
                entries.append({**entry, "row_key": row_key, "row_size": row_size})
            item_index += row_size
            row_index += 1
            item_rows_until_campaign -= 1

        if campaign_index < len(campaign_entries) and (
            item_index >= len(item_entries) or item_rows_until_campaign <= 0
        ):
            entries.append({
                **campaign_entries[campaign_index],
                "row_key": f"campaign-{row_index}",
                "row_size": 1,
            })
            campaign_index += 1
            row_index += 1
            item_rows_until_campaign = randomizer.choice([1, 1, 2])

    total = len(entries)
    start = (page - 1) * page_size
    page_entries = entries[start : start + page_size]

    results = []
    for entry in page_entries:
        if entry["feed_type"] == "item":
            results.append(FeedEntry(
                feed_type="item",
                row_key=entry["row_key"],
                row_size=entry["row_size"],
                item=entry["data"],
            ))
        else:
            results.append(FeedEntry(
                feed_type="campaign",
                row_key=entry["row_key"],
                row_size=entry["row_size"],
                campaign=entry["data"],
            ))

    return {
        "items": [r.model_dump() for r in results],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total > 0 else 1,
    }


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    categories = db.query(Category).filter(Category.is_active == True).order_by(Category.name).all()
    return [CategoryResponse.model_validate(category) for category in categories]


@router.get("/items", response_model=PaginatedResponse[ClientItemResponse])
def list_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=60),
    search: str = Query(""),
    item_type: str = Query(""),
    category_id: str = Query(""),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = db.query(Item).filter(_public_item_filter())
    if search:
        query = query.filter(or_(Item.title.ilike(f"%{search}%"), Item.description.ilike(f"%{search}%")))
    if item_type:
        query = query.filter(Item.type == item_type)
    if category_id:
        query = query.filter(Item.category_id == category_id)

    total = query.count()
    items = query.order_by(Item.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[_item_to_response(item, db) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/items/my", response_model=PaginatedResponse[ClientItemResponse])
def list_my_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=60),
    search: str | None = Query(None),
    category_id: int | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Item).filter(Item.user_id == current_user.id)
    if search:
        query = query.filter(Item.title.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(Item.category_id == category_id)
    if status:
        if status == "awaiting_org_review":
            query = (
                query
                .join(CampaignItem, CampaignItem.item_id == Item.id)
                .filter(Item.type == "donate", Item.status == "approved", CampaignItem.status == "pending")
            )
        elif status == "handover":
            query = (
                query
                .join(CampaignItem, CampaignItem.item_id == Item.id)
                .filter(Item.type == "donate", Item.status == "approved", CampaignItem.status == "handover")
            )
        elif status == "rejected":
            query = (
                query
                .outerjoin(CampaignItem, CampaignItem.item_id == Item.id)
                .filter(or_(Item.status == "rejected", CampaignItem.status == "rejected"))
            )
        elif status == "approved":
            query = query.filter(Item.type == "sell", Item.status == "approved")
        else:
            query = query.filter(Item.status == status)

    total = query.count()
    items = query.order_by(Item.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[_item_to_response(item, db) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.post("/items", response_model=ClientItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    data: ClientItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    if data.type not in {"sell", "donate"}:
        raise HTTPException(status_code=400, detail="Invalid item type")

    campaign = None
    if data.type == "donate":
        if not data.campaign_id:
            raise HTTPException(status_code=400, detail="Donate items must be created from a donation campaign")
        campaign = db.query(Campaign).filter(Campaign.id == data.campaign_id, Campaign.status == "approved").first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        if campaign.type != "donation":
            raise HTTPException(status_code=400, detail="This campaign does not accept item donations")
    elif data.campaign_id:
        raise HTTPException(status_code=400, detail="Sell items cannot be attached to donation campaigns")

    item_data = data.model_dump(exclude={"campaign_id"})
    item_data["user_id"] = current_user.id
    item_data["status"] = "pending"
    if data.type == "donate":
        item_data["price"] = Decimal("0.00")
    item = Item(**item_data)
    db.add(item)
    if campaign:
        db.flush()
        db.add(CampaignItem(item_id=item.id, campaign_id=campaign.id, status="pending"))
    db.commit()
    db.refresh(item)
    return _item_to_response(item, db)


@router.put("/items/{item_id}", response_model=ClientItemResponse)
def update_my_item(
    item_id: str,
    data: ClientItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending items can be edited")

    payload = data.model_dump(exclude_unset=True)
    for key in ("title", "description", "category_id"):
        if key in payload:
            setattr(item, key, payload[key])
    if item.type == "sell" and "price" in payload:
        item.price = _money(payload["price"] or Decimal("0"))
    if item.type == "donate":
        item.price = Decimal("0.00")

    db.commit()
    db.refresh(item)
    return _item_to_response(item, db)


@router.delete("/items/{item_id}", status_code=status.HTTP_200_OK)
def delete_my_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.status in {"reserved", "sold", "donated"}:
        raise HTTPException(status_code=400, detail="Cannot delete an item with an active or completed handover")
    if any(entry.status in {"handover", "received"} for entry in item.campaign_items):
        raise HTTPException(status_code=400, detail="Cannot delete a donation item with an active or completed handover")

    for image in item.images:
        delete_upload(image.image_path)
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}


@router.post("/items/{item_id}/images", response_model=list[ItemImageResponse], status_code=status.HTTP_201_CREATED)
def upload_my_item_images(
    item_id: str,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    item = db.query(Item).filter(Item.id == item_id, Item.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending item images can be changed")

    existing_count = db.query(ItemImage).filter(ItemImage.item_id == item.id).count()
    if existing_count + len(files) > 6:
        raise HTTPException(status_code=400, detail="Items can have up to 6 images")

    images = []
    for index, file in enumerate(files):
        image = ItemImage(
            item_id=item.id,
            image_path=replace_upload(file, f"items/{item.id}"),
            is_main=existing_count == 0 and index == 0,
        )
        db.add(image)
        images.append(image)

    db.commit()
    for image in images:
        db.refresh(image)
    return [ItemImageResponse.model_validate(image) for image in images]


@router.put("/items/images/{image_id}/main", response_model=ItemImageResponse)
def set_my_item_main_image(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    image = db.query(ItemImage).join(Item).filter(ItemImage.id == image_id, Item.user_id == current_user.id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if image.item.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending item images can be changed")

    db.query(ItemImage).filter(ItemImage.item_id == image.item_id, ItemImage.id != image.id).update({"is_main": False})
    image.is_main = True
    db.commit()
    db.refresh(image)
    return ItemImageResponse.model_validate(image)


@router.delete("/items/images/{image_id}", status_code=status.HTTP_200_OK)
def delete_my_item_image(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    image = db.query(ItemImage).join(Item).filter(ItemImage.id == image_id, Item.user_id == current_user.id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if image.item.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending item images can be changed")

    item_id = image.item_id
    was_main = image.is_main
    delete_upload(image.image_path)
    db.delete(image)
    db.flush()
    if was_main:
        next_image = db.query(ItemImage).filter(ItemImage.item_id == item_id).order_by(ItemImage.created_at.asc()).first()
        if next_image:
            next_image.is_main = True
    db.commit()
    return {"message": "Image deleted successfully"}


@router.get("/items/{item_id}", response_model=ClientItemResponse)
def get_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.user_id != current_user.id and not _is_public_item(item):
        # Also allow buyer who has a paid/completed transaction for this item
        has_purchase = db.query(Transaction).filter(
            Transaction.item_id == item.id,
            Transaction.from_user_id == current_user.id,
            Transaction.status.in_(["paid", "completed", "refunded"]),
        ).first()
        if not has_purchase:
            raise HTTPException(status_code=404, detail="Item not found")
    return _item_to_response(item, db)


@router.get("/items/{item_id}/purchase-preview", response_model=PurchasePreview)
def preview_item_purchase(
    item_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item or not _is_public_item(item):
        raise HTTPException(status_code=404, detail="Item not found")
    return _item_preview(item)


@router.post("/items/{item_id}/purchase", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
def purchase_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item or not _is_public_item(item):
        raise HTTPException(status_code=404, detail="Item not found")
    if item.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot buy your own item")

    existing_active = (
        db.query(Transaction)
        .filter(
            Transaction.item_id == item.id,
            Transaction.status.in_(["pending", "paid"]),
        )
        .first()
    )
    if existing_active:
        # Lazily expire stale pending transactions so other buyers are unblocked
        if existing_active.status == "pending" and _lazy_expire_pending(existing_active, db):
            db.refresh(item)  # item status unchanged for pending, but refresh to be safe
            existing_active = None
        elif existing_active.status == "paid":
            # Item is legitimately reserved — block other buyers
            if existing_active.from_user_id == current_user.id:
                preview = _item_preview(item)
                return PurchaseResponse(
                    transaction=_transaction_to_response(existing_active, db),
                    preview=preview,
                )
            raise HTTPException(status_code=409, detail="This item is currently reserved by another buyer")
        elif existing_active and existing_active.from_user_id == current_user.id:
            # Same buyer has an active pending — redirect them to payment
            preview = _item_preview(item)
            return PurchaseResponse(
                transaction=_transaction_to_response(existing_active, db),
                preview=preview,
            )
        elif existing_active:
            raise HTTPException(status_code=409, detail="This item is currently reserved by another buyer")

    preview = _item_preview(item)
    transaction = Transaction(
        transaction_type="sale",
        item_id=item.id,
        from_user_id=current_user.id,
        to_user_id=item.user_id,
        campaign_id=None,
        amount=preview.buyer_total,
        platform_fee=preview.platform_fee,
        status="pending",
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return PurchaseResponse(transaction=_transaction_to_response(transaction, db), preview=preview)


@router.get("/campaigns", response_model=PaginatedResponse[ClientCampaignResponse])
def list_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=60),
    search: str = Query(""),
    campaign_type: str = Query(""),
    organization_id: str = Query(""),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = db.query(Campaign).filter(Campaign.status == "approved")
    if search:
        query = query.filter(or_(Campaign.title.ilike(f"%{search}%"), Campaign.description.ilike(f"%{search}%")))
    if campaign_type:
        query = query.filter(Campaign.type == campaign_type)
    if organization_id:
        query = query.filter(Campaign.organization_id == organization_id)

    total = query.count()
    campaigns = query.order_by(Campaign.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[_campaign_to_response(campaign, db) for campaign in campaigns],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/campaigns/{campaign_id}", response_model=ClientCampaignResponse)
def get_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.status == "approved").first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _campaign_to_response(campaign, db)


class CampaignTopContributor(BaseModel):
    name: str
    amount: Decimal | None = None
    item_count: int | None = None


class CampaignStatsResponse(BaseModel):
    campaign_type: str
    total_donors: int = 0
    total_items: int = 0
    total_raised: Decimal = Decimal("0")
    top_contributors: list[CampaignTopContributor] = []


@router.get("/campaigns/{campaign_id}/stats", response_model=CampaignStatsResponse)
def get_campaign_stats(
    campaign_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.status == "approved").first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.type == "fundraising":
        # Completed donations only
        donations = (
            db.query(Transaction)
            .filter(
                Transaction.campaign_id == campaign.id,
                Transaction.transaction_type == "campaign_donation",
                Transaction.status == "completed",
            )
            .all()
        )
        total_raised = sum(d.amount for d in donations) if donations else Decimal("0")
        total_donors = len(set(d.from_user_id for d in donations if d.from_user_id))

        # Top contributors: aggregate by user
        user_totals: dict[UUID, tuple[str, Decimal]] = {}
        for d in donations:
            if not d.from_user_id:
                continue
            uid = d.from_user_id
            name = d.from_user.name if d.from_user else "Anonymous"
            if uid in user_totals:
                user_totals[uid] = (user_totals[uid][0], user_totals[uid][1] + d.amount)
            else:
                user_totals[uid] = (name, d.amount)

        top_contributors = sorted(user_totals.values(), key=lambda x: x[1], reverse=True)[:5]

        return CampaignStatsResponse(
            campaign_type="fundraising",
            total_donors=total_donors,
            total_raised=total_raised,
            top_contributors=[
                CampaignTopContributor(name=name, amount=amount)
                for name, amount in top_contributors
            ],
        )
    else:
        # Donation campaign — count physically received items only
        donated_items = (
            db.query(CampaignItem)
            .join(Item, CampaignItem.item_id == Item.id)
            .filter(
                CampaignItem.campaign_id == campaign.id,
                CampaignItem.status == "received",
                Item.status == "donated",
                Item.type == "donate",
            )
            .all()
        )
        total_items = len(donated_items)
        total_donors = len(set(item.item.user_id for item in donated_items if item.item))

        # Top donors by item count
        user_counts: dict[UUID, tuple[str, int]] = {}
        for ci in donated_items:
            if not ci.item or not ci.item.user_id:
                continue
            uid = ci.item.user_id
            name = ci.item.owner.name if ci.item.owner else "Anonymous"
            if uid in user_counts:
                user_counts[uid] = (user_counts[uid][0], user_counts[uid][1] + 1)
            else:
                user_counts[uid] = (name, 1)

        top_contributors = sorted(user_counts.values(), key=lambda x: x[1], reverse=True)[:5]

        return CampaignStatsResponse(
            campaign_type="donation",
            total_donors=total_donors,
            total_items=total_items,
            top_contributors=[
                CampaignTopContributor(name=name, item_count=count)
                for name, count in top_contributors
            ],
        )


@router.get("/campaigns/{campaign_id}/donated-items", response_model=PaginatedResponse[ClientItemResponse])
def list_campaign_donated_items(
    campaign_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(9, ge=1, le=60),
    search: str = Query(""),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    campaign = (
        db.query(Campaign)
        .filter(Campaign.id == campaign_id, Campaign.status == "approved", Campaign.type == "donation")
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    query = (
        db.query(Item)
        .join(CampaignItem, CampaignItem.item_id == Item.id)
        .filter(
            CampaignItem.campaign_id == campaign.id,
            CampaignItem.status == "received",
            Item.status == "donated",
            Item.type == "donate",
        )
    )
    if search:
        query = query.filter(or_(Item.title.ilike(f"%{search}%"), Item.description.ilike(f"%{search}%")))

    total = query.count()
    items = query.order_by(Item.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[_item_to_response(item, db) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.post("/campaigns/{campaign_id}/donate-money", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def donate_money_to_campaign(
    campaign_id: str,
    data: MoneyDonationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.status == "approved").first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.type != "fundraising":
        raise HTTPException(status_code=400, detail="This campaign does not accept money donations")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    transaction = Transaction(
        transaction_type="campaign_donation",
        item_id=None,
        from_user_id=current_user.id,
        to_user_id=None,
        campaign_id=campaign.id,
        amount=_money(data.amount),
        platform_fee=Decimal("0.00"),
        status="pending",
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return _transaction_to_response(transaction, db)


@router.post("/campaigns/{campaign_id}/items", status_code=status.HTTP_201_CREATED)
def submit_item_to_campaign(
    campaign_id: str,
    data: CampaignItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.status == "approved").first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.type != "donation":
        raise HTTPException(status_code=400, detail="This campaign does not accept item donations")

    item = db.query(Item).filter(Item.id == data.item_id, Item.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.type != "donate":
        raise HTTPException(status_code=400, detail="Only donate items can be submitted to donation campaigns")
    if item.status in {"rejected", "sold", "donated"}:
        raise HTTPException(status_code=400, detail="This item cannot be submitted")

    existing = db.query(CampaignItem).filter(
        CampaignItem.item_id == item.id,
        CampaignItem.campaign_id == campaign.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Item already submitted to this campaign")
    if item.campaign_items:
        raise HTTPException(status_code=400, detail="Item is already attached to a donation campaign")

    campaign_item = CampaignItem(item_id=item.id, campaign_id=campaign.id, status="pending")
    db.add(campaign_item)
    db.commit()
    return {"message": "Item submitted to campaign", "status": campaign_item.status}


@router.get("/transactions/my-purchases", response_model=PaginatedResponse[TransactionResponse])
def list_my_purchases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=60),
    status_filter: str = Query("", alias="status"),
    search: str = Query(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Transaction).filter(Transaction.from_user_id == current_user.id)
    if status_filter:
        query = query.filter(Transaction.status == status_filter)
    if search:
        query = (
            query
            .outerjoin(Transaction.item)
            .outerjoin(Transaction.campaign)
            .filter(or_(Item.title.ilike(f"%{search}%"), Campaign.title.ilike(f"%{search}%")))
        )

    # Fetch without status filter first for lazy expiry, then re-query if needed
    transactions = (
        query.order_by(Transaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    # Lazily expire/auto-complete; if any changed, re-fetch this page
    changed = any(_lazy_expire_pending(tx, db) or _lazy_auto_complete(tx, db) for tx in transactions)
    if changed:
        transactions = (
            query.order_by(Transaction.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

    total = query.count()
    return PaginatedResponse(
        items=[_transaction_to_response(tx, db) for tx in transactions],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if current_user.id not in {transaction.from_user_id, transaction.to_user_id}:
        raise HTTPException(status_code=403, detail="Not authorized to view this transaction")
    _lazy_expire_pending(transaction, db)
    _lazy_auto_complete(transaction, db)
    db.refresh(transaction)
    return _transaction_to_response(transaction, db)


@router.post("/transactions/{transaction_id}/mark-paid", response_model=TransactionResponse)
def mark_transaction_paid(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.from_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can confirm payment")
    if transaction.status != "pending":
        raise HTTPException(status_code=400, detail=f"Transaction is already {transaction.status}")

    # Reject if payment window has expired
    if _lazy_expire_pending(transaction, db):
        raise HTTPException(status_code=410, detail="Payment window has expired. Please initiate a new purchase.")

    if transaction.transaction_type == "sale":
        item = db.query(Item).filter(Item.id == transaction.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item no longer exists")
        if item.status not in {"approved", "reserved"}:
            raise HTTPException(status_code=400, detail="Item is no longer available")
        item.status = "reserved"
        transaction.status = "paid"
    else:
        # Donation: skip escrow, go straight to completed
        transaction.status = "completed"

    db.commit()
    db.refresh(transaction)
    return _transaction_to_response(transaction, db)


@router.post("/transactions/{transaction_id}/mark-failed", response_model=TransactionResponse)
def mark_transaction_failed(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.from_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can cancel this payment")
    if transaction.status != "pending":
        raise HTTPException(status_code=400, detail=f"Transaction is already {transaction.status}")

    transaction.status = "cancelled"
    db.commit()
    db.refresh(transaction)
    return _transaction_to_response(transaction, db)


@router.post("/transactions/{transaction_id}/confirm-receipt", response_model=TransactionResponse)
def confirm_transaction_receipt(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.from_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can confirm receipt")
    if transaction.transaction_type != "sale":
        raise HTTPException(status_code=400, detail="Only item purchases can be confirmed")
    if transaction.status != "paid":
        raise HTTPException(status_code=400, detail=f"Transaction must be paid before confirming receipt (current: {transaction.status})")

    item = db.query(Item).filter(Item.id == transaction.item_id).first()
    if item:
        item.status = "sold"
    transaction.status = "completed"
    db.commit()
    db.refresh(transaction)
    return _transaction_to_response(transaction, db)


@router.post("/transactions/{transaction_id}/reject-handover", response_model=TransactionResponse)
def reject_transaction_handover(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.from_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the buyer can reject the handover")
    if transaction.transaction_type != "sale":
        raise HTTPException(status_code=400, detail="Only item purchases can be rejected")
    if transaction.status != "paid":
        raise HTTPException(status_code=400, detail=f"Can only reject a paid transaction (current: {transaction.status})")

    # Return item to approved so seller can re-list; money goes back to buyer (refunded state)
    item = db.query(Item).filter(Item.id == transaction.item_id).first()
    if item:
        item.status = "approved"
    transaction.status = "refunded"
    db.commit()
    db.refresh(transaction)
    return _transaction_to_response(transaction, db)


# ─── Notifications ────────────────────────────────────────────────

class NotificationItem(BaseModel):
    id: str
    type: str  # item_approved, sale_paid, donation_handover, donation_received, donation_rejected, ...
    message: str
    link: str | None = None
    timestamp: datetime
    is_read: bool = False


class NotificationsResponse(BaseModel):
    items: list[NotificationItem]
    unread_count: int


def _build_notifications(user: User, db: Session, after: datetime | None = None) -> list[NotificationItem]:
    """Derive notifications from existing Item, Transaction, and CampaignItem data."""
    notifs: list[NotificationItem] = []

    # 1. Item status changes — owner's items that got approved/rejected
    item_statuses = db.query(Item).filter(
        Item.user_id == user.id,
        Item.status.in_(["approved", "rejected"]),
    ).order_by(Item.updated_at.desc()).limit(30).all()

    for item in item_statuses:
        ntype = f"item_{item.status}"
        msg = f'Your item "{item.title}" has been {item.status} by campus admin.'
        link = f"/my-items?item={item.id}"
        notifs.append(NotificationItem(
            id=f"item-{item.id}-{item.status}",
            type=ntype,
            message=msg,
            link=link,
            timestamp=_ensure_tz(item.updated_at),
        ))

    # 2. Transaction events — as seller (to_user_id)
    seller_txns = db.query(Transaction).filter(
        Transaction.to_user_id == user.id,
        Transaction.status.in_(["paid", "completed", "refunded"]),
    ).order_by(Transaction.updated_at.desc()).limit(30).all()

    status_messages = {
        "paid": "Someone purchased your item",
        "completed": "Sale completed for",
        "refunded": "Buyer rejected handover for",
    }
    for txn in seller_txns:
        item_title = txn.item.title if txn.item else "an item"
        item_id_param = f"?item={txn.item_id}" if txn.item_id else ""
        msg = f'{status_messages.get(txn.status, "Update on")} "{item_title}".'
        link = f"/my-items{item_id_param}"
        ntype = f"sale_{txn.status}"
        notifs.append(NotificationItem(
            id=f"txn-seller-{txn.id}-{txn.status}",
            type=ntype,
            message=msg,
            link=link,
            timestamp=_ensure_tz(txn.updated_at),
        ))

    # 3. Transaction events — as buyer (from_user_id), cancelled
    buyer_cancelled = db.query(Transaction).filter(
        Transaction.from_user_id == user.id,
        Transaction.status == "cancelled",
    ).order_by(Transaction.updated_at.desc()).limit(10).all()

    for txn in buyer_cancelled:
        item_title = txn.item.title if txn.item else "an item"
        notifs.append(NotificationItem(
            id=f"txn-buyer-{txn.id}-cancelled",
            type="payment_cancelled",
            message=f'Payment expired for "{item_title}".',
            link="/my-purchases",
            timestamp=_ensure_tz(txn.updated_at),
        ))

    # 4. Campaign item status changes — donation item fulfillment by org
    campaign_items_query = (
        db.query(CampaignItem)
        .join(Item, CampaignItem.item_id == Item.id)
        .filter(
            Item.user_id == user.id,
            CampaignItem.status.in_(["handover", "received", "rejected"]),
        )
        .order_by(CampaignItem.updated_at.desc())
        .limit(20)
        .all()
    )
    campaign_item_messages = {
        "handover": "was accepted and is ready for handover",
        "received": "was received",
        "rejected": "was rejected",
    }
    for ci in campaign_items_query:
        item_title = ci.item.title if ci.item else "your donation"
        campaign_title = ci.campaign.title if ci.campaign else "a campaign"
        notifs.append(NotificationItem(
            id=f"ci-{ci.id}-{ci.status}",
            type=f"donation_{ci.status}",
            message=f'Your donation "{item_title}" {campaign_item_messages[ci.status]} by {campaign_title}.',
            link=f"/my-items?item={ci.item_id}",
            timestamp=_ensure_tz(ci.updated_at),
        ))

    # Sort by timestamp desc
    notifs.sort(key=lambda n: n.timestamp, reverse=True)

    # Mark read/unread based on after timestamp
    if after:
        for n in notifs:
            n.is_read = n.timestamp <= after

    return notifs[:50]


@router.get("/notifications", response_model=NotificationsResponse)
def get_notifications(
    after: Optional[str] = Query(None, description="ISO timestamp — notifications before this are marked as read"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    after_dt = None
    if after:
        try:
            after_dt = datetime.fromisoformat(after)
            if after_dt.tzinfo is None:
                after_dt = after_dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    notifs = _build_notifications(current_user, db, after_dt)
    unread = sum(1 for n in notifs if not n.is_read)
    return NotificationsResponse(items=notifs, unread_count=unread)


@router.get("/notifications/unread-count")
def get_unread_count(
    after: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    after_dt = None
    if after:
        try:
            after_dt = datetime.fromisoformat(after)
            if after_dt.tzinfo is None:
                after_dt = after_dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    notifs = _build_notifications(current_user, db, after_dt)
    unread = sum(1 for n in notifs if not n.is_read)
    return {"unread_count": unread}


@router.get("/organizations/{org_id}", response_model=OrganizationResponse)
def get_public_organization(
    org_id: UUID,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrganizationResponse.model_validate(org)
