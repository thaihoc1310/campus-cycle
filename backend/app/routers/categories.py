import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.schemas.common import PaginatedResponse
from app.routers.sorting import apply_sort
from app.services.auth import require_admin

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=PaginatedResponse[CategoryResponse])
def list_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", description="Search by name"),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    query = db.query(Category)
    if search:
        query = query.filter(Category.name.ilike(f"%{search}%"))
    total = query.count()
    query = apply_sort(query, sort_by, sort_order, {
        "name": Category.name,
        "description": Category.description,
        "is_active": Category.is_active,
        "created_at": Category.created_at,
        "updated_at": Category.updated_at,
    })
    categories = query.offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(
        items=[CategoryResponse.model_validate(c) for c in categories],
        total=total, page=page, page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/all", response_model=list[CategoryResponse])
def list_all_categories(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    categories = db.query(Category).filter(Category.is_active == True).order_by(Category.name).all()
    return [CategoryResponse.model_validate(c) for c in categories]


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    existing = db.query(Category).filter(Category.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    category = Category(**data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)


@router.put("/{cat_id}", response_model=CategoryResponse)
def update_category(cat_id: str, data: CategoryUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    category = db.query(Category).filter(Category.id == cat_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(category, key, value)
    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)


@router.delete("/{cat_id}", status_code=status.HTTP_200_OK)
def delete_category(cat_id: str, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    category = db.query(Category).filter(Category.id == cat_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}
