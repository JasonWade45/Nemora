from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.visit import Visit

router = APIRouter(prefix="/super", tags=["super-admin"])


class OrganizationSummary(BaseModel):
    id: str
    name: str
    slug: str
    users_count: int
    doctors_count: int
    visits_count: int
    created_at: datetime


class OrganizationDetail(BaseModel):
    id: str
    name: str
    slug: str
    settings: dict
    users: list[dict]
    created_at: datetime


def _require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin only")
    return current_user


@router.get("/organizations", response_model=list[OrganizationSummary])
def list_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    orgs = db.query(Organization).order_by(Organization.created_at.desc()).all()

    result = []
    for org in orgs:
        users_count = db.query(func.count(User.id)).filter(User.organization_id == org.id).scalar() or 0
        # Count doctors
        from app.models.doctor import Doctor
        doctors_count = db.query(func.count(Doctor.id)).filter(Doctor.organization_id == org.id).scalar() or 0
        visits_count = db.query(func.count(Visit.id)).filter(Visit.organization_id == org.id).scalar() or 0

        result.append(OrganizationSummary(
            id=org.id,
            name=org.name,
            slug=org.slug,
            users_count=users_count,
            doctors_count=doctors_count,
            visits_count=visits_count,
            created_at=org.created_at,
        ))

    return result


@router.get("/organizations/{org_id}", response_model=OrganizationDetail)
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    import json

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    users = db.query(User).filter(User.organization_id == org.id).all()

    settings = {}
    try:
        settings = json.loads(org.settings or "{}")
    except Exception:
        pass

    return OrganizationDetail(
        id=org.id,
        name=org.name,
        slug=org.slug,
        settings=settings,
        users=[
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role.value,
                "is_active": u.is_active,
                "is_super_admin": bool(u.is_super_admin),
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        created_at=org.created_at,
    )


@router.delete("/organizations/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    db.delete(org)
    db.commit()
    return None


@router.get("/stats")
def platform_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    from app.models.doctor import Doctor

    total_orgs = db.query(func.count(Organization.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_doctors = db.query(func.count(Doctor.id)).scalar() or 0
    total_visits = db.query(func.count(Visit.id)).scalar() or 0

    return {
        "organizations": total_orgs,
        "users": total_users,
        "doctors": total_doctors,
        "visits": total_visits,
    }