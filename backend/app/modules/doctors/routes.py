import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.core.plans import check_limit
from app.models.doctor import Doctor
from app.models.doctor_assignment import DoctorAssignment
from app.models.doctor_workplace import DoctorWorkplace
from app.models.enums import DoctorStatus, PriorityLevel
from app.models.organization import Organization
from app.models.user import User
from app.models.workplace import Workplace
from app.modules.audit.service import create_audit_log
from app.schemas.doctor import DoctorCreateRequest, DoctorListResponse, DoctorResponse, DoctorUpdateRequest
from app.schemas.workplace import WorkplaceResponse

router = APIRouter(prefix="/doctors", tags=["doctors"])

REP_EDITABLE_FIELDS = {"phone", "address", "notes", "working_hours", "city"}


def _normalize_full_name(first_name: str, last_name: str, full_name: str | None) -> str:
    if full_name and full_name.strip():
        return full_name.strip()
    return f"{first_name.strip()} {last_name.strip()}".strip()


def _safe_load_json_dict(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        value = json.loads(raw)
        if isinstance(value, dict):
            return value
    except (json.JSONDecodeError, TypeError):
        pass
    return {}


def _safe_load_tags(raw: str) -> list[str]:
    try:
        value = json.loads(raw)
        if isinstance(value, list):
            return [str(item) for item in value]
    except (json.JSONDecodeError, TypeError):
        pass
    return []


def _safe_load_specialties(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        value = json.loads(raw)
        if isinstance(value, list):
            return [str(item) for item in value if str(item).strip()]
    except (json.JSONDecodeError, TypeError):
        pass
    return []


def _get_plan_key(db: Session, org_id: str) -> str:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        return "basic"
    try:
        settings = json.loads(org.settings or "{}")
        return settings.get("plan", "basic")
    except Exception:
        return "basic"


def _doctor_to_response(doctor: Doctor) -> DoctorResponse:
    return DoctorResponse(
        id=doctor.id,
        organization_id=doctor.organization_id,
        first_name=doctor.first_name,
        last_name=doctor.last_name,
        full_name=doctor.full_name,
        specialty=doctor.specialty,
        phone=doctor.phone,
        email=doctor.email,
        address=doctor.address,
        city=doctor.city,
        state=doctor.state,
        zip_code=doctor.zip_code,
        area=doctor.area,
        latitude=doctor.latitude,
        longitude=doctor.longitude,
        notes=doctor.notes,
        status=doctor.status,
        priority=doctor.priority,
        tags=_safe_load_tags(doctor.tags_json),
        working_hours=_safe_load_json_dict(doctor.working_hours_json),
        created_at=doctor.created_at,
        updated_at=doctor.updated_at,
    )


@router.get("", response_model=DoctorListResponse)
def list_doctors(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    specialty: str | None = Query(default=None),
    city: str | None = Query(default=None),
    zip_code: str | None = Query(default=None),
    status_filter: DoctorStatus | None = Query(default=None, alias="status"),
    priority_filter: PriorityLevel | None = Query(default=None, alias="priority"),
    assigned_rep_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> DoctorListResponse:
    query = db.query(Doctor).filter(Doctor.organization_id == current_user.organization_id)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Doctor.full_name.ilike(term),
                Doctor.specialty.ilike(term),
                Doctor.city.ilike(term),
                Doctor.phone.ilike(term),
            )
        )

    if specialty:
        query = query.filter(Doctor.specialty.ilike(f"%{specialty.strip()}%"))

    if city:
        query = query.filter(Doctor.city.ilike(f"%{city.strip()}%"))

    if zip_code:
        query = query.filter(Doctor.zip_code == zip_code.strip())

    if status_filter:
        query = query.filter(Doctor.status == status_filter)

    if priority_filter:
        query = query.filter(Doctor.priority == priority_filter)

    if current_user.role.value == Role.MEDICAL_REP.value:
        rep_specialties = _safe_load_specialties(current_user.specialties_json)
        if rep_specialties:
            query = query.filter(Doctor.specialty.in_(rep_specialties))
        else:
            query = query.join(DoctorAssignment, DoctorAssignment.doctor_id == Doctor.id).filter(
                DoctorAssignment.organization_id == current_user.organization_id,
                DoctorAssignment.medical_rep_id == current_user.id,
            )

    elif assigned_rep_id:
        query = query.join(DoctorAssignment, DoctorAssignment.doctor_id == Doctor.id).filter(
            DoctorAssignment.organization_id == current_user.organization_id,
            DoctorAssignment.medical_rep_id == assigned_rep_id,
        )

    total = query.count()
    doctors = (
        query.order_by(Doctor.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return DoctorListResponse(
        items=[_doctor_to_response(doctor) for doctor in doctors],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(
    payload: DoctorCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> DoctorResponse:
    # Plan limit check
    plan_key = _get_plan_key(db, current_user.organization_id)
    current_doctors = db.query(Doctor).filter(
        Doctor.organization_id == current_user.organization_id
    ).count()
    if not check_limit(plan_key, "doctors", current_doctors):
        raise HTTPException(
            status_code=402,
            detail=f"وصلت للحد الأقصى للأطباء في خطة {plan_key}. رقّي الخطة للمزيد.",
        )

    # Medical rep can only add doctors within their own specialties
    if current_user.role.value == Role.MEDICAL_REP.value:
        rep_specialties = _safe_load_specialties(current_user.specialties_json)
        if payload.specialty and rep_specialties and payload.specialty not in rep_specialties:
            raise HTTPException(
                status_code=403,
                detail="You can only add doctors within your assigned specialties",
            )

    if payload.email:
        existing = (
            db.query(Doctor)
            .filter(
                Doctor.organization_id == current_user.organization_id,
                Doctor.email == payload.email,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Doctor email already exists in your organization")

    doctor = Doctor(
        organization_id=current_user.organization_id,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        full_name=_normalize_full_name(payload.first_name, payload.last_name, payload.full_name),
        specialty=payload.specialty,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        zip_code=payload.zip_code,
        latitude=payload.latitude,
        longitude=payload.longitude,
        notes=payload.notes,
        status=payload.status,
        priority=payload.priority,
        tags_json=json.dumps(payload.tags),
        working_hours_json=json.dumps(payload.working_hours or {}),
    )

    db.add(doctor)
    db.flush()

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="DOCTOR_CREATED",
        entity="Doctor",
        entity_id=doctor.id,
        metadata={"doctor_name": doctor.full_name, "created_by_role": current_user.role.value},
    )

    db.commit()
    db.refresh(doctor)

    return _doctor_to_response(doctor)


@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(
    doctor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> DoctorResponse:
    doctor = (
        db.query(Doctor)
        .filter(Doctor.id == doctor_id, Doctor.organization_id == current_user.organization_id)
        .first()
    )

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return _doctor_to_response(doctor)


@router.patch("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(
    doctor_id: str,
    payload: DoctorUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> DoctorResponse:
    doctor = (
        db.query(Doctor)
        .filter(Doctor.id == doctor_id, Doctor.organization_id == current_user.organization_id)
        .first()
    )

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    updates = payload.model_dump(exclude_none=True)

    if current_user.role.value == Role.MEDICAL_REP.value:
        forbidden = set(updates.keys()) - REP_EDITABLE_FIELDS
        if forbidden:
            raise HTTPException(
                status_code=403,
                detail=f"Medical reps cannot modify: {', '.join(sorted(forbidden))}",
            )

    if "tags" in updates:
        doctor.tags_json = json.dumps(updates.pop("tags"))

    if "working_hours" in updates:
        doctor.working_hours_json = json.dumps(updates.pop("working_hours") or {})

    for field, value in updates.items():
        setattr(doctor, field, value)

    if "full_name" not in updates and ("first_name" in updates or "last_name" in updates):
        doctor.full_name = _normalize_full_name(doctor.first_name, doctor.last_name, doctor.full_name)

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="DOCTOR_UPDATED",
        entity="Doctor",
        entity_id=doctor.id,
        metadata={
            "updated_fields": list(payload.model_dump(exclude_none=True).keys()),
            "updated_by_role": current_user.role.value,
        },
    )

    db.commit()
    db.refresh(doctor)

    return _doctor_to_response(doctor)


@router.get("/{doctor_id}/workplaces", response_model=list[WorkplaceResponse])
def list_doctor_workplaces(
    doctor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> list[WorkplaceResponse]:
    doctor = (
        db.query(Doctor)
        .filter(Doctor.id == doctor_id, Doctor.organization_id == current_user.organization_id)
        .first()
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    workplaces = (
        db.query(Workplace)
        .join(DoctorWorkplace, DoctorWorkplace.workplace_id == Workplace.id)
        .filter(
            DoctorWorkplace.organization_id == current_user.organization_id,
            DoctorWorkplace.doctor_id == doctor_id,
        )
        .order_by(Workplace.name.asc())
        .all()
    )

    return [
        WorkplaceResponse(
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
        for workplace in workplaces
    ]


@router.get("/areas/list", response_model=list[dict])
def list_areas(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    from sqlalchemy import func as sqlfunc
    rows = db.query(
        Doctor.area,
        sqlfunc.count(Doctor.id).label("cnt"),
    ).filter(
        Doctor.organization_id == current_user.organization_id,
    ).group_by(Doctor.area).all()

    result = []
    for (area, cnt) in rows:
        result.append({
            "area": area if area else None,
            "label": area if area else "غير محدد",
            "count": cnt,
        })
    result.sort(key=lambda x: (x["area"] is None, -x["count"]))
    return result