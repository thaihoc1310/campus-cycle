import math
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.campaign import Campaign, CampaignImage, CampaignItem
from app.models.category import Category
from app.models.item import Item, ItemImage
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.campaign import CampaignImageResponse, CampaignResponse
from app.schemas.category import CategoryResponse
from app.schemas.common import PaginatedResponse
from app.schemas.item import ItemImageResponse, ItemResponse
from app.schemas.transaction import TransactionResponse
from app.services.auth import get_current_user, require_active_user
from app.services.uploads import delete_upload, replace_upload

router = APIRouter(prefix="/api/client", tags=["client"])

SELL_FEE_RATE = Decimal("0.20")


class ClientItemResponse(ItemResponse):
    main_image: str | None = None
    images: list[ItemImageResponse] = Field(default_factory=list)
    item_status: str | None = None
    campaign_item_status: str | None = None
    campaign_id: UUID | None = None
    campaign_name: str | None = None


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


def _item_main_image(item_id: UUID, db: Session) -> str | None:
    images = _item_images(item_id, db)
    image = images[0] if images else None
    return image.image_path if image else None


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
    if item.status != "approved":
        return item.status
    if any(entry.status == "approved" for entry in campaign_items):
        return "approved"
    return "pending"


def _public_item_filter():
    return and_(Item.type == "sell", Item.status == "approved")


def _is_public_item(item: Item) -> bool:
    return item.type == "sell" and item.status == "approved"


def _item_to_response(item: Item, db: Session) -> ClientItemResponse:
    campaign_item = _primary_campaign_item(item)
    images = _item_images(item.id, db)
    return ClientItemResponse(
        id=item.id,
        title=item.title,
        description=item.description,
        price=item.price,
        type=item.type,
        status=_effective_item_status(item),
        category_id=item.category_id,
        user_id=item.user_id,
        owner_name=item.owner.name if item.owner else None,
        category_name=item.category.name if item.category else None,
        main_image=images[0].image_path if images else None,
        images=[ItemImageResponse.model_validate(image) for image in images],
        item_status=item.status,
        campaign_item_status=campaign_item.status if campaign_item else None,
        campaign_id=campaign_item.campaign_id if campaign_item else None,
        campaign_name=campaign_item.campaign.title if campaign_item and campaign_item.campaign else None,
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


def _transaction_to_response(transaction: Transaction) -> TransactionResponse:
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
        from_user_name=transaction.from_user.name if transaction.from_user else None,
        to_user_name=transaction.to_user.name if transaction.to_user else None,
        item_title=transaction.item.title if transaction.item else None,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
    )


class FeedEntry(BaseModel):
    feed_type: str  # 'item' or 'campaign'
    item: ClientItemResponse | None = None
    campaign: ClientCampaignResponse | None = None


@router.get("/feed")
def list_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=60),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    items_q = db.query(Item).filter(_public_item_filter()).all()
    campaigns_q = db.query(Campaign).filter(Campaign.status == "approved").all()

    entries: list[dict] = []
    for item in items_q:
        entries.append({
            "feed_type": "item",
            "created_at": item.created_at,
            "data": _item_to_response(item, db),
        })
    for campaign in campaigns_q:
        entries.append({
            "feed_type": "campaign",
            "created_at": campaign.created_at,
            "data": _campaign_to_response(campaign, db),
        })

    entries.sort(key=lambda e: e["created_at"], reverse=True)
    total = len(entries)
    start = (page - 1) * page_size
    page_entries = entries[start : start + page_size]

    results = []
    for entry in page_entries:
        if entry["feed_type"] == "item":
            results.append(FeedEntry(feed_type="item", item=entry["data"]))
        else:
            results.append(FeedEntry(feed_type="campaign", campaign=entry["data"]))

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Item).filter(Item.user_id == current_user.id)
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
    return PurchaseResponse(transaction=_transaction_to_response(transaction), preview=preview)


@router.get("/campaigns", response_model=PaginatedResponse[ClientCampaignResponse])
def list_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=60),
    search: str = Query(""),
    campaign_type: str = Query(""),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = db.query(Campaign).filter(Campaign.status == "approved")
    if search:
        query = query.filter(or_(Campaign.title.ilike(f"%{search}%"), Campaign.description.ilike(f"%{search}%")))
    if campaign_type:
        query = query.filter(Campaign.type == campaign_type)

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
            CampaignItem.status == "approved",
            Item.status == "approved",
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
    return _transaction_to_response(transaction)


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
