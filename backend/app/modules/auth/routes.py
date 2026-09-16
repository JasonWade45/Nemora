import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.modules.audit.service import create_audit_log
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    MeResponse,
    SignupRequest,
    SignupResponse,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        subject=user.id,
        additional_claims={
            "organization_id": user.organization_id,
            "role": user.role.value,
            "is_super_admin": bool(user.is_super_admin),
        },
    )

    return TokenResponse(
        access_token=token,
        expires_in_minutes=get_settings().access_token_expire_minutes,
    )


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> SignupResponse:
    existing_email = db.query(User).filter(User.email == payload.admin_email).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="Email already registered")

    existing_slug = db.query(Organization).filter(Organization.slug == payload.organization_slug).first()
    if existing_slug:
        raise HTTPException(status_code=409, detail="Organization slug already taken")

    # Clean + dedupe focus areas
    focus_areas = sorted({s.strip() for s in (payload.focus_areas or []) if s and s.strip()})

    org = Organization(
        name=payload.organization_name.strip(),
        slug=payload.organization_slug.strip().lower(),
        settings=json.dumps({
            "check_in_radius_meters": 200,
            "gps_ping_interval_minutes": 10,
            "working_hours": {"start": "09:00", "end": "17:00"},
            "notifications": {
                "followup_due": True,
                "visit_reminder": True,
                "daily_report": True,
            },
            "plan": "basic",
            "status": "active",
            "focus_areas": focus_areas,
        }),
    )
    db.add(org)
    db.flush()

    admin = User(
        organization_id=org.id,
        email=payload.admin_email.strip().lower(),
        full_name=payload.admin_full_name.strip(),
        password_hash=hash_password(payload.admin_password),
        role=UserRole.ADMIN,
        is_active=True,
        is_super_admin=False,
        specialties_json="[]",
    )
    db.add(admin)
    db.flush()

    create_audit_log(
        db,
        organization_id=org.id,
        actor_user_id=admin.id,
        action="ORGANIZATION_SIGNUP",
        entity="Organization",
        entity_id=org.id,
        metadata={"slug": org.slug, "email": admin.email, "focus_areas": focus_areas},
    )

    db.commit()

    token = create_access_token(
        subject=admin.id,
        additional_claims={
            "organization_id": org.id,
            "role": admin.role.value,
            "is_super_admin": False,
        },
    )

    return SignupResponse(
        organization_id=org.id,
        organization_name=org.name,
        admin_user_id=admin.id,
        admin_email=admin.email,
        access_token=token,
        expires_in_minutes=get_settings().access_token_expire_minutes,
    )


@router.get("/me", response_model=MeResponse)
def get_me(current_user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        id=current_user.id,
        organization_id=current_user.organization_id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        is_super_admin=bool(current_user.is_super_admin),
        phone=current_user.phone,
        created_at=current_user.created_at,
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.password_hash = hash_password(payload.new_password)

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="PASSWORD_CHANGED",
        entity="User",
        entity_id=current_user.id,
    )

    db.commit()