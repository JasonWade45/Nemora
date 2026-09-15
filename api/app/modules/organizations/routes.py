import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.rbac import Role
from app.core.security import hash_password
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.modules.audit.service import create_audit_log
from app.schemas.organization import (
    OrganizationBootstrapRequest,
    OrganizationResponse,
    OrganizationUpdateRequest,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


def _safe_load_settings(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        value = json.loads(raw)
        if isinstance(value, dict):
            return value
    except (json.JSONDecodeError, TypeError):
        pass
    return {}


def _org_to_response(org: Organization) -> OrganizationResponse:
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        settings=_safe_load_settings(getattr(org, "settings", None)),
        created_at=org.created_at,
    )


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def bootstrap_organization(
    payload: OrganizationBootstrapRequest,
    db: Session = Depends(get_db),
) -> OrganizationResponse:
    existing_slug = db.query(Organization).filter(Organization.slug == payload.organization_slug).first()
    if existing_slug:
        raise HTTPException(status_code=409, detail="Organization slug already exists")

    existing_email = db.query(User).filter(User.email == payload.admin_email).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="Admin email already exists")

    organization = Organization(
        name=payload.organization_name,
        slug=payload.organization_slug,
        settings=json.dumps(
            {
                "check_in_radius_meters": 100,
                "gps_ping_interval_minutes": 10,
                "working_hours": {"start": "09:00", "end": "17:00"},
                "notifications": {
                    "followup_due": True,
                    "visit_reminder": True,
                    "daily_report": True,
                },
            }
        ),
    )
    db.add(organization)
    db.flush()

    admin = User(
        organization_id=organization.id,
        email=payload.admin_email,
        full_name=payload.admin_full_name,
        password_hash=hash_password(payload.admin_password),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.flush()

    create_audit_log(
        db,
        organization_id=organization.id,
        actor_user_id=admin.id,
        action="ORGANIZATION_BOOTSTRAPPED",
        entity="Organization",
        entity_id=organization.id,
    )

    db.commit()
    db.refresh(organization)

    return _org_to_response(organization)


@router.get("/me", response_model=OrganizationResponse)
def get_my_organization(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationResponse:
    organization = (
        db.query(Organization)
        .filter(Organization.id == current_user.organization_id)
        .first()
    )
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    return _org_to_response(organization)


@router.patch("/me", response_model=OrganizationResponse)
def update_my_organization(
    payload: OrganizationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationResponse:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update organization settings")

    organization = (
        db.query(Organization)
        .filter(Organization.id == current_user.organization_id)
        .first()
    )
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    updates = payload.model_dump(exclude_none=True)

    if "name" in updates:
        organization.name = updates["name"].strip()

    if "settings" in updates:
        # Merge with existing settings
        current = _safe_load_settings(getattr(organization, "settings", None))
        merged = {**current, **(updates["settings"] or {})}
        organization.settings = json.dumps(merged)

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="ORGANIZATION_UPDATED",
        entity="Organization",
        entity_id=organization.id,
        metadata={"updated_fields": list(updates.keys())},
    )

    db.commit()
    db.refresh(organization)

    return _org_to_response(organization)
