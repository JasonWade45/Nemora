from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.models.doctor import Doctor
from app.models.doctor_workplace import DoctorWorkplace
from app.models.enums import FacilityType
from app.models.user import User
from app.models.workplace import Workplace
from app.modules.audit.service import create_audit_log
from app.schemas.workplace import (
    DoctorWorkplaceLinkRequest,
    WorkplaceCreateRequest,
    WorkplaceListResponse,
    WorkplaceResponse,
    WorkplaceUpdateRequest,
)

router = APIRouter(prefix="/workplaces", tags=["workplaces"])


def _to_workplace_response(workplace: Workplace) -> WorkplaceResponse:
    return WorkplaceResponse(
        id=workplace.id,
        organization_id=workplace.organization_id,
        name=workplace.name,
        facility_type=workplace.facility_type,
        address=workplace.address,
        city=workplace.city,
        state=workplace.state,
        zip_code=workplace.zip_code,
        latitude=workplace.latitude,
        longitude=workplace.longitude,
        phone=workplace.phone,
        website=workplace.website,
        opening_hours=workplace.opening_hours,
        notes=workplace.notes,
        status=workplace.status,
        created_at=workplace.created_at,
        updated_at=workplace.updated_at,
    )


@router.get("", response_model=WorkplaceListResponse)
def list_workplaces(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    city: str | None = Query(default=None),
    facility_type: FacilityType | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> WorkplaceListResponse:
    query = db.query(Workplace).filter(Workplace.organization_id == current_user.organization_id)

    if search:
        query = query.filter(Workplace.name.ilike(f"%{search.strip()}%"))

    if city:
        query = query.filter(Workplace.city.ilike(f"%{city.strip()}%"))

    if facility_type:
        query = query.filter(Workplace.facility_type == facility_type)

    total = query.count()
    workplaces = (
        query.order_by(Workplace.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return WorkplaceListResponse(
        items=[_to_workplace_response(item) for item in workplaces],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=WorkplaceResponse, status_code=status.HTTP_201_CREATED)
def create_workplace(
    payload: WorkplaceCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
) -> WorkplaceResponse:
    workplace = Workplace(
        organization_id=current_user.organization_id,
        name=payload.name,
        facility_type=payload.facility_type,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        zip_code=payload.zip_code,
        latitude=payload.latitude,
        longitude=payload.longitude,
        phone=payload.phone,
        website=payload.website,
        opening_hours=payload.opening_hours,
        notes=payload.notes,
        status=payload.status,
    )

    db.add(workplace)
    db.flush()

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="WORKPLACE_CREATED",
        entity="Workplace",
        entity_id=workplace.id,
        metadata={"workplace_name": workplace.name},
    )

    db.commit()
    db.refresh(workplace)

    return _to_workplace_response(workplace)


@router.get("/{workplace_id}", response_model=WorkplaceResponse)
def get_workplace(
    workplace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> WorkplaceResponse:
    workplace = (
        db.query(Workplace)
        .filter(Workplace.id == workplace_id, Workplace.organization_id == current_user.organization_id)
        .first()
    )
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")

    return _to_workplace_response(workplace)


@router.patch("/{workplace_id}", response_model=WorkplaceResponse)
def update_workplace(
    workplace_id: str,
    payload: WorkplaceUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
) -> WorkplaceResponse:
    workplace = (
        db.query(Workplace)
        .filter(Workplace.id == workplace_id, Workplace.organization_id == current_user.organization_id)
        .first()
    )
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")

    updates = payload.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(workplace, field, value)

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="WORKPLACE_UPDATED",
        entity="Workplace",
        entity_id=workplace.id,
        metadata={"updated_fields": list(updates.keys())},
    )

    db.commit()
    db.refresh(workplace)

    return _to_workplace_response(workplace)


@router.post("/{workplace_id}/doctors/{doctor_id}", status_code=status.HTTP_201_CREATED)
def link_doctor_to_workplace(
    workplace_id: str,
    doctor_id: str,
    payload: DoctorWorkplaceLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
) -> dict[str, str | bool]:
    workplace = (
        db.query(Workplace)
        .filter(Workplace.id == workplace_id, Workplace.organization_id == current_user.organization_id)
        .first()
    )
    if not workplace:
        raise HTTPException(status_code=404, detail="Workplace not found")

    doctor = (
        db.query(Doctor)
        .filter(Doctor.id == doctor_id, Doctor.organization_id == current_user.organization_id)
        .first()
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    existing = (
        db.query(DoctorWorkplace)
        .filter(
            DoctorWorkplace.organization_id == current_user.organization_id,
            DoctorWorkplace.doctor_id == doctor_id,
            DoctorWorkplace.workplace_id == workplace_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(status_code=409, detail="Doctor is already linked to this workplace")

    if payload.is_primary:
        db.query(DoctorWorkplace).filter(
            DoctorWorkplace.organization_id == current_user.organization_id,
            DoctorWorkplace.doctor_id == doctor_id,
            DoctorWorkplace.is_primary.is_(True),
        ).update({"is_primary": False})

    link = DoctorWorkplace(
        organization_id=current_user.organization_id,
        doctor_id=doctor_id,
        workplace_id=workplace_id,
        is_primary=payload.is_primary,
    )
    db.add(link)
    db.flush()

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="DOCTOR_WORKPLACE_LINKED",
        entity="DoctorWorkplace",
        entity_id=link.id,
        metadata={"doctor_id": doctor_id, "workplace_id": workplace_id, "is_primary": payload.is_primary},
    )

    db.commit()

    return {"id": link.id, "linked": True, "is_primary": link.is_primary}


@router.delete("/{workplace_id}/doctors/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_doctor_from_workplace(
    workplace_id: str,
    doctor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
) -> None:
    link = (
        db.query(DoctorWorkplace)
        .filter(
            DoctorWorkplace.organization_id == current_user.organization_id,
            DoctorWorkplace.doctor_id == doctor_id,
            DoctorWorkplace.workplace_id == workplace_id,
        )
        .first()
    )

    if not link:
        raise HTTPException(status_code=404, detail="Doctor-workplace link not found")

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="DOCTOR_WORKPLACE_UNLINKED",
        entity="DoctorWorkplace",
        entity_id=link.id,
        metadata={"doctor_id": doctor_id, "workplace_id": workplace_id},
    )

    db.delete(link)
    db.commit()
