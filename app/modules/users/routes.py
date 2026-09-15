import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.core.security import hash_password
from app.core.visibility import get_visible_user_ids
from app.models.user import User, UserRole
from app.modules.audit.service import create_audit_log
from app.schemas.user import (
    UserCreateRequest,
    UserListResponse,
    UserResponse,
    UserUpdateRequest,
)

router = APIRouter(prefix="/users", tags=["users"])


def _safe_load_specialties(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        val = json.loads(raw)
        if isinstance(val, list):
            return [str(x) for x in val if str(x).strip()]
    except Exception:
        pass
    return []


def _user_to_response(db: Session, user: User) -> UserResponse:
    supervisor_name = None
    if user.supervisor_id:
        sup = db.query(User).filter(User.id == user.supervisor_id).first()
        if sup:
            supervisor_name = sup.full_name

    return UserResponse(
        id=user.id,
        organization_id=user.organization_id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role,
        is_active=user.is_active,
        specialties=_safe_load_specialties(user.specialties_json),
        supervisor_id=user.supervisor_id,
        supervisor_name=supervisor_name,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("", response_model=UserListResponse)
def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=500),
    role: UserRole | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    visible = get_visible_user_ids(db, current_user)
    q = db.query(User).filter(
        User.organization_id == current_user.organization_id,
        User.id.in_(visible),
    )
    if role:
        q = q.filter(User.role == role)

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return UserListResponse(
        items=[_user_to_response(db, u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/my-reps", response_model=list[UserResponse])
def list_my_reps(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
):
    """Returns reps under this admin, or all reps (for manager)."""
    q = db.query(User).filter(
        User.organization_id == current_user.organization_id,
        User.role == UserRole.MEDICAL_REP,
    )
    if current_user.role == UserRole.ADMIN:
        q = q.filter(User.supervisor_id == current_user.id)
    users = q.order_by(User.full_name.asc()).all()
    return [_user_to_response(db, u) for u in users]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
):
    # Only manager can create admins/managers
    if payload.role in (UserRole.ADMIN, UserRole.MANAGER):
        if current_user.role != UserRole.MANAGER:
            raise HTTPException(status_code=403, detail="Only managers can create admins/managers")

    # If creating a rep, admin must assign themselves as supervisor
    if payload.role == UserRole.MEDICAL_REP:
        if current_user.role == UserRole.ADMIN:
            supervisor_id = current_user.id
        else:
            supervisor_id = payload.supervisor_id
    else:
        supervisor_id = payload.supervisor_id

    # Validate supervisor
    if supervisor_id:
        sup = db.query(User).filter(
            User.id == supervisor_id,
            User.organization_id == current_user.organization_id,
        ).first()
        if not sup:
            raise HTTPException(status_code=404, detail="Supervisor not found")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")

    user = User(
        organization_id=current_user.organization_id,
        supervisor_id=supervisor_id,
        email=payload.email.strip().lower(),
        full_name=payload.full_name.strip(),
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
        specialties_json=json.dumps(payload.specialties or []),
    )
    db.add(user)
    db.flush()

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="USER_CREATED",
        entity="User",
        entity_id=user.id,
        metadata={"email": user.email, "role": user.role.value},
    )

    db.commit()
    db.refresh(user)
    return _user_to_response(db, user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    visible = get_visible_user_ids(db, current_user)
    if user_id not in visible:
        raise HTTPException(status_code=403, detail="Not allowed")

    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_user.organization_id,
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_response(db, user)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
):
    visible = get_visible_user_ids(db, current_user)
    if user_id not in visible:
        raise HTTPException(status_code=403, detail="Not allowed")

    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_user.organization_id,
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updates = payload.model_dump(exclude_unset=True)

    # Only manager can change roles
    if "role" in updates and current_user.role != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can change roles")

    if "specialties" in updates:
        user.specialties_json = json.dumps(updates.pop("specialties") or [])

    if "supervisor_id" in updates:
        sup_id = updates.pop("supervisor_id")
        if sup_id:
            sup = db.query(User).filter(
                User.id == sup_id,
                User.organization_id == current_user.organization_id,
            ).first()
            if not sup:
                raise HTTPException(status_code=404, detail="Supervisor not found")
        user.supervisor_id = sup_id

    for k, v in updates.items():
        setattr(user, k, v)

    db.commit()
    db.refresh(user)
    return _user_to_response(db, user)