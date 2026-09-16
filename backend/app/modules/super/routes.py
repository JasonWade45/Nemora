import json
import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import create_access_token, hash_password
from app.models.audit_log import AuditLog
from app.models.doctor import Doctor
from app.models.notification import Notification, NotificationType
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.models.visit import Visit

router = APIRouter(prefix="/super", tags=["super-admin"])


# ============ Schemas ============

class OrganizationSummary(BaseModel):
    id: str
    name: str
    slug: str
    status: str = "active"
    plan: str = "basic"
    users_count: int
    doctors_count: int
    visits_count: int
    created_at: datetime


class OrganizationUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    status: str | None = None
    plan: str | None = None
    settings: dict | None = None


class OrganizationDetail(BaseModel):
    id: str
    name: str
    slug: str
    status: str
    plan: str
    settings: dict
    limits: dict = {}
    usage: dict = {}
    users: list[dict]
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    is_super_admin: bool | None = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8)


class BroadcastRequest(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    message: str = Field(min_length=2, max_length=2000)
    type: str = "SYSTEM"

    @field_validator("title")
    @classmethod
    def _validate_title(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < 2:
            raise ValueError("العنوان يجب أن يكون حرفين على الأقل")
        return v

    @field_validator("message")
    @classmethod
    def _validate_message(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < 2:
            raise ValueError("الرسالة يجب أن تكون حرفين على الأقل")
        return v


# ============ Helpers ============

def _require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin only")
    return current_user


def _load_settings(org: Organization) -> dict:
    try:
        return json.loads(org.settings or "{}")
    except Exception:
        return {}


def _save_settings(org: Organization, settings: dict):
    org.settings = json.dumps(settings)


def _org_to_summary(db: Session, org: Organization) -> OrganizationSummary:
    users_count = db.query(func.count(User.id)).filter(User.organization_id == org.id).scalar() or 0
    doctors_count = db.query(func.count(Doctor.id)).filter(Doctor.organization_id == org.id).scalar() or 0
    visits_count = db.query(func.count(Visit.id)).filter(Visit.organization_id == org.id).scalar() or 0

    s = _load_settings(org)

    return OrganizationSummary(
        id=org.id,
        name=org.name,
        slug=org.slug,
        status=s.get("status", "active"),
        plan=s.get("plan", "basic"),
        users_count=users_count,
        doctors_count=doctors_count,
        visits_count=visits_count,
        created_at=org.created_at,
    )


# ============ Stats ============

@router.get("/stats")
def platform_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    total_orgs = db.query(func.count(Organization.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_doctors = db.query(func.count(Doctor.id)).scalar() or 0
    total_visits = db.query(func.count(Visit.id)).scalar() or 0

    active_users = db.query(func.count(User.id)).filter(
        User.is_active == True,
    ).scalar() or 0

    return {
        "organizations": total_orgs,
        "users": total_users,
        "doctors": total_doctors,
        "visits": total_visits,
        "active_users": active_users,
    }


# ============ Organizations ============

@router.get("/organizations", response_model=list[OrganizationSummary])
def list_organizations(
    search: str | None = Query(default=None),
    status_filter: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    q = db.query(Organization)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(Organization.name.ilike(term), Organization.slug.ilike(term)))

    orgs = q.order_by(Organization.created_at.desc()).all()
    summaries = [_org_to_summary(db, o) for o in orgs]

    if status_filter:
        summaries = [s for s in summaries if s.status == status_filter]

    return summaries


@router.get("/organizations/{org_id}", response_model=OrganizationDetail)
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    users = db.query(User).filter(User.organization_id == org.id).order_by(User.created_at.asc()).all()
    settings = _load_settings(org)

    from app.core.plans import get_plan
    plan_data = get_plan(settings.get("plan", "basic"))
    doctors_count = db.query(func.count(Doctor.id)).filter(Doctor.organization_id == org.id).scalar() or 0

    return OrganizationDetail(
        id=org.id,
        name=org.name,
        slug=org.slug,
        status=settings.get("status", "active"),
        plan=settings.get("plan", "basic"),
        settings=settings,
        limits={
            "max_users": plan_data["max_users"],
            "max_doctors": plan_data["max_doctors"],
            "max_visits_per_month": plan_data["max_visits_per_month"],
        },
        usage={
            "users": len(users),
            "doctors": doctors_count,
        },
        users=[
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "phone": u.phone,
                "role": u.role.value,
                "is_active": u.is_active,
                "is_super_admin": bool(u.is_super_admin),
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        created_at=org.created_at,
    )


@router.patch("/organizations/{org_id}", response_model=OrganizationSummary)
def update_organization(
    org_id: str,
    payload: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if payload.name:
        org.name = payload.name.strip()

    if payload.slug:
        new_slug = payload.slug.strip().lower()
        existing = db.query(Organization).filter(
            Organization.slug == new_slug,
            Organization.id != org.id,
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Slug already taken")
        org.slug = new_slug

    settings = _load_settings(org)
    if payload.status:
        settings["status"] = payload.status
    if payload.plan:
        settings["plan"] = payload.plan
    if payload.settings:
        settings.update(payload.settings)

    _save_settings(org, settings)

    db.commit()
    db.refresh(org)
    return _org_to_summary(db, org)


@router.delete("/organizations/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if org.id == current_user.organization_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own organization")

    db.delete(org)
    db.commit()
    return None


# ============ Users ============

@router.patch("/users/{user_id}")
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.email is not None:
        new_email = payload.email.strip().lower()
        existing = db.query(User).filter(User.email == new_email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use")
        user.email = new_email
    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_super_admin is not None:
        if user.id == current_user.id and not payload.is_super_admin:
            raise HTTPException(status_code=400, detail="Cannot remove your own super admin status")
        user.is_super_admin = payload.is_super_admin

    db.commit()
    return {"ok": True}


@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: str,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.post("/users/{user_id}/impersonate")
def impersonate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User is not active")

    token = create_access_token(
        subject=user.id,
        additional_claims={
            "organization_id": user.organization_id,
            "role": user.role.value,
            "is_super_admin": bool(user.is_super_admin),
            "impersonated_by": current_user.id,
        },
    )

    return {
        "access_token": token,
        "user_email": user.email,
        "user_name": user.full_name,
        "user_role": user.role.value,
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    db.delete(user)
    db.commit()
    return None


# ============ Audit Logs ============

@router.get("/audit-logs")
def list_audit_logs(
    limit: int = Query(default=100, ge=1, le=500),
    action_filter: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    q = db.query(AuditLog)
    if action_filter:
        q = q.filter(AuditLog.action.ilike(f"%{action_filter}%"))

    logs = q.order_by(AuditLog.created_at.desc()).limit(limit).all()

    user_ids = list({log.actor_user_id for log in logs if log.actor_user_id})
    users = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}

    return [
        {
            "id": log.id,
            "action": log.action,
            "entity": log.entity,
            "entity_id": log.entity_id,
            "actor_name": users[log.actor_user_id].full_name if log.actor_user_id in users else "System",
            "actor_email": users[log.actor_user_id].email if log.actor_user_id in users else None,
            "metadata": log.metadata_json,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


# ============ Broadcast Notifications ============

@router.post("/broadcast")
def broadcast_notification(
    payload: BroadcastRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    try:
        ntype = NotificationType(payload.type)
    except ValueError:
        ntype = NotificationType.SYSTEM

    users = db.query(User).filter(User.is_active == True).all()

    if not users:
        return {"ok": True, "sent_to": 0}

    # Individual add() calls so Python-side UUID default is applied
    for u in users:
        n = Notification(
            user_id=u.id,
            title=payload.title,
            message=payload.message,
            type=ntype,
            is_read=False,
        )
        db.add(n)

    db.commit()

    return {"ok": True, "sent_to": len(users)}


# ============ Analytics ============

@router.get("/analytics/overview")
def platform_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    new_orgs_30d = db.query(func.count(Organization.id)).filter(
        Organization.created_at >= thirty_days_ago
    ).scalar() or 0

    new_orgs_7d = db.query(func.count(Organization.id)).filter(
        Organization.created_at >= seven_days_ago
    ).scalar() or 0

    new_users_30d = db.query(func.count(User.id)).filter(
        User.created_at >= thirty_days_ago
    ).scalar() or 0

    visits_30d = db.query(func.count(Visit.id)).filter(
        Visit.created_at >= thirty_days_ago
    ).scalar() or 0

    top_orgs_query = (
        db.query(
            Organization.id,
            Organization.name,
            Organization.slug,
            func.count(Visit.id).label("visits_count"),
        )
        .outerjoin(Visit, Visit.organization_id == Organization.id)
        .group_by(Organization.id)
        .order_by(func.count(Visit.id).desc())
        .limit(5)
        .all()
    )

    top_orgs = [
        {"id": oid, "name": name, "slug": slug, "visits": count}
        for oid, name, slug, count in top_orgs_query
    ]

    return {
        "new_orgs_30d": new_orgs_30d,
        "new_orgs_7d": new_orgs_7d,
        "new_users_30d": new_users_30d,
        "visits_30d": visits_30d,
        "top_organizations": top_orgs,
    }


# ============ System Health ============

@router.get("/system/health")
def system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    try:
        db.execute(func.now().select() if False else "SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "database": "ok" if db_ok else "error",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }