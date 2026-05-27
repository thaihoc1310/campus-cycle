import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import Organization, OrganizationAdmin
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrgAdminResponse,
    OrgAdminCreate,
)
from app.schemas.user import UserResponse
from app.schemas.common import PaginatedResponse
from app.routers.sorting import apply_sort
from app.services.auth import require_admin

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("", response_model=PaginatedResponse[OrganizationResponse])
def list_organizations(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", description="Search by name"),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    query = db.query(Organization)
    if search:
        query = query.filter(Organization.name.ilike(f"%{search}%"))
    total = query.count()
    query = apply_sort(query, sort_by, sort_order, {
        "name": Organization.name,
        "type": Organization.type,
        "description": Organization.description,
        "created_at": Organization.created_at,
        "updated_at": Organization.updated_at,
    })
    orgs = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[OrganizationResponse.model_validate(o) for o in orgs],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 1,
    )


@router.get("/all", response_model=list[OrganizationResponse])
def list_all_organizations(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Get all organizations without pagination (for dropdowns)."""
    orgs = db.query(Organization).order_by(Organization.name).all()
    return [OrganizationResponse.model_validate(o) for o in orgs]


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    org = Organization(**data.model_dump())
    db.add(org)
    db.commit()
    db.refresh(org)
    return OrganizationResponse.model_validate(org)


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return OrganizationResponse.model_validate(org)


@router.put("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: str,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)

    db.commit()
    db.refresh(org)
    return OrganizationResponse.model_validate(org)


@router.delete("/{org_id}", status_code=status.HTTP_200_OK)
def delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    db.delete(org)
    db.commit()
    return {"message": "Organization deleted successfully"}


# --- Org Admin Management ---


@router.get("/{org_id}/admins", response_model=list[OrgAdminResponse])
def list_org_admins(
    org_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    admins = (
        db.query(OrganizationAdmin)
        .filter(OrganizationAdmin.organization_id == org_id)
        .all()
    )
    return [OrgAdminResponse.model_validate(a) for a in admins]


@router.post("/{org_id}/admins", response_model=OrgAdminResponse, status_code=status.HTTP_201_CREATED)
def add_org_admin(
    org_id: str,
    data: OrgAdminCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        db.query(OrganizationAdmin)
        .filter(
            OrganizationAdmin.organization_id == org_id,
            OrganizationAdmin.user_id == data.user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User is already an admin of this organization")

    org_admin = OrganizationAdmin(user_id=data.user_id, organization_id=org.id)
    db.add(org_admin)
    db.commit()
    db.refresh(org_admin)
    return OrgAdminResponse.model_validate(org_admin)


@router.delete("/{org_id}/admins/{user_id}", status_code=status.HTTP_200_OK)
def remove_org_admin(
    org_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    entry = (
        db.query(OrganizationAdmin)
        .filter(
            OrganizationAdmin.organization_id == org_id,
            OrganizationAdmin.user_id == user_id,
        )
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Org admin entry not found")

    db.delete(entry)
    db.commit()
    return {"message": "Org admin removed successfully"}


@router.get("/{org_id}/available-users", response_model=list[UserResponse])
def get_available_users(
    org_id: str,
    search: str = Query("", description="Search by name or email"),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Get users that are NOT already org admins of this organization."""
    existing_admin_ids = (
        db.query(OrganizationAdmin.user_id)
        .filter(OrganizationAdmin.organization_id == org_id)
        .subquery()
    )

    query = db.query(User).filter(User.id.notin_(existing_admin_ids))
    if search:
        query = query.filter(
            or_(
                User.name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )

    users = query.order_by(User.name).limit(20).all()
    return [UserResponse.model_validate(u) for u in users]
