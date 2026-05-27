import math
import os
import uuid as uuid_lib
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.item import Item, ItemImage
from app.models.user import User
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse, ItemImageResponse
from app.schemas.common import PaginatedResponse
from app.services.auth import require_admin

router = APIRouter(prefix="/api/items", tags=["items"])


def _item_to_response(item: Item) -> ItemResponse:
    return ItemResponse(
        id=item.id, title=item.title, description=item.description,
        price=item.price, type=item.type, status=item.status,
        category_id=item.category_id, user_id=item.user_id,
        owner_name=item.owner.name if item.owner else None,
        category_name=item.category.name if item.category else None,
        created_at=item.created_at, updated_at=item.updated_at,
    )


@router.get("", response_model=PaginatedResponse[ItemResponse])
def list_items(
    page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100),
    search: str = Query(""),
    db: Session = Depends(get_db), _admin: User = Depends(require_admin),
):
    query = db.query(Item)
    if search:
        query = query.filter(or_(Item.title.ilike(f"%{search}%"), Item.description.ilike(f"%{search}%")))
    total = query.count()
    items = query.order_by(Item.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[_item_to_response(i) for i in items],
        total=total, page=page, page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(data: ItemCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    item = Item(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _item_to_response(item)


@router.put("/{item_id}", response_model=ItemResponse)
def update_item(item_id: str, data: ItemUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return _item_to_response(item)


@router.delete("/{item_id}", status_code=status.HTTP_200_OK)
def delete_item(item_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}


# --- Image Management ---

@router.get("/{item_id}/images", response_model=list[ItemImageResponse])
def list_item_images(item_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    images = db.query(ItemImage).filter(ItemImage.item_id == item_id).order_by(ItemImage.created_at).all()
    return [ItemImageResponse.model_validate(img) for img in images]


@router.post("/{item_id}/images", response_model=list[ItemImageResponse], status_code=status.HTTP_201_CREATED)
async def upload_item_images(
    item_id: str, files: List[UploadFile] = File(...),
    db: Session = Depends(get_db), _admin: User = Depends(require_admin),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "items", str(item_id))
    os.makedirs(upload_dir, exist_ok=True)

    created_images = []
    for file in files:
        ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        filename = f"{uuid_lib.uuid4()}{ext}"
        filepath = os.path.join(upload_dir, filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)

        relative_path = f"/uploads/items/{item_id}/{filename}"
        img = ItemImage(item_id=item.id, image_path=relative_path, is_main=False)
        db.add(img)
        created_images.append(img)

    db.commit()
    for img in created_images:
        db.refresh(img)
    return [ItemImageResponse.model_validate(img) for img in created_images]


@router.put("/images/{image_id}/main", response_model=ItemImageResponse)
def set_main_image(image_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    image = db.query(ItemImage).filter(ItemImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    # Unset all other main images for this item
    db.query(ItemImage).filter(ItemImage.item_id == image.item_id, ItemImage.id != image.id).update({"is_main": False})
    image.is_main = True
    db.commit()
    db.refresh(image)
    return ItemImageResponse.model_validate(image)


@router.delete("/images/{image_id}", status_code=status.HTTP_200_OK)
def delete_item_image(image_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    image = db.query(ItemImage).filter(ItemImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    # Try to delete file
    full_path = os.path.join(settings.UPLOAD_DIR, image.image_path.lstrip("/uploads/"))
    if os.path.exists(full_path):
        os.remove(full_path)
    db.delete(image)
    db.commit()
    return {"message": "Image deleted successfully"}
