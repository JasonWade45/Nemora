import pathlib

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")

# ============ 1) Fix visit.py — Base import + UUID default ============
visit_file = backend / "app" / "models" / "visit.py"
content = visit_file.read_text(encoding="utf-8")

content = content.replace(
    "from datetime import datetime\nfrom typing import Optional, List",
    "import uuid\nfrom datetime import datetime\nfrom typing import Optional, List"
)
content = content.replace(
    "from app.db.session import Base",
    "from app.models.base import Base"
)
content = content.replace(
    '    id: Mapped[str] = mapped_column(String(36), primary_key=True)',
    '    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))'
)

visit_file.write_text(content, encoding="utf-8")
print("OK - visit.py fixed")

# ============ 2) Check visit_product.py ============
vp_file = backend / "app" / "models" / "visit_product.py"
vp_content = vp_file.read_text(encoding="utf-8")
if "from app.db.session import Base" in vp_content:
    vp_content = vp_content.replace("from app.db.session import Base", "from app.models.base import Base")
    print("   also fixed visit_product.py Base import")
if "import uuid" not in vp_content and "default=lambda" not in vp_content:
    vp_content = vp_content.replace(
        "from datetime import datetime",
        "import uuid\nfrom datetime import datetime"
    )
    vp_content = vp_content.replace(
        '    id: Mapped[str] = mapped_column(String(36), primary_key=True)',
        '    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))'
    )
    print("   also added UUID to visit_product.py")
vp_file.write_text(vp_content, encoding="utf-8")

# ============ 3) Check models/__init__.py ============
init_file = backend / "app" / "models" / "__init__.py"
init_content = init_file.read_text(encoding="utf-8")

if "Visit" not in init_content:
    init_content += "\nfrom app.models.visit import Visit, VisitPurpose, VisitStatus, DoctorResponse\n"
    init_content += "from app.models.visit_product import VisitProduct\n"
    print("OK - models/__init__.py updated")

init_file.write_text(init_content, encoding="utf-8")

# ============ 4) Create visit schemas ============
schemas_dir = backend / "app" / "schemas"
visit_schema = schemas_dir / "visit.py"
visit_schema.write_text(r'''from datetime import datetime

from pydantic import BaseModel, Field

from app.models.visit import DoctorResponse, VisitPurpose, VisitStatus


class VisitCreateRequest(BaseModel):
    doctor_id: str
    doctor_location_id: str | None = None
    visit_purpose: VisitPurpose = VisitPurpose.DETAILING
    planned_at: datetime | None = None
    notes: str | None = None


class VisitCheckInRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float | None = None


class VisitCheckOutRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float | None = None
    notes: str | None = None
    doctor_response: DoctorResponse | None = None
    next_follow_up_date: datetime | None = None
    next_follow_up_type: str | None = None
    next_follow_up_notes: str | None = None


class VisitUpdateRequest(BaseModel):
    visit_purpose: VisitPurpose | None = None
    planned_at: datetime | None = None
    notes: str | None = None


class VisitResponse(BaseModel):
    id: str
    organization_id: str
    rep_id: str
    doctor_id: str
    doctor_name: str | None = None
    doctor_specialty: str | None = None
    doctor_phone: str | None = None
    doctor_address: str | None = None
    doctor_latitude: float | None = None
    doctor_longitude: float | None = None
    visit_purpose: VisitPurpose
    status: VisitStatus
    planned_at: datetime | None
    checked_in_at: datetime | None
    checked_out_at: datetime | None
    duration_minutes: int | None
    checkin_latitude: float | None
    checkin_longitude: float | None
    checkout_latitude: float | None
    checkout_longitude: float | None
    distance_from_doctor: float | None
    is_verified: bool
    doctor_response: DoctorResponse | None
    notes: str | None
    next_follow_up_date: datetime | None
    next_follow_up_type: str | None
    next_follow_up_notes: str | None
    created_at: datetime
    updated_at: datetime


class VisitListResponse(BaseModel):
    items: list[VisitResponse]
    total: int
''', encoding="utf-8")
print("OK - schemas/visit.py created")

# ============ 5) Create visit routes ============
routes_dir = backend / "app" / "modules" / "visits"
routes_dir.mkdir(parents=True, exist_ok=True)
(routes_dir / "__init__.py").write_text("", encoding="utf-8")

routes_file = routes_dir / "routes.py"
routes_file.write_text(r'''from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.functions import ST_Distance, ST_GeogFromText, ST_MakePoint, ST_SetSRID
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.core.rbac import Role
from app.models.doctor import Doctor
from app.models.enums import DoctorStatus
from app.models.organization import Organization
from app.models.user import User
from app.models.visit import DoctorResponse, Visit, VisitPurpose, VisitStatus
from app.modules.audit.service import create_audit_log
from app.schemas.visit import (
    VisitCheckInRequest,
    VisitCheckOutRequest,
    VisitCreateRequest,
    VisitListResponse,
    VisitResponse,
    VisitUpdateRequest,
)

router = APIRouter(prefix="/visits", tags=["visits"])


def _get_org_setting(db: Session, org_id: str, key: str, default):
    import json
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org or not org.settings:
        return default
    try:
        s = json.loads(org.settings)
        return s.get(key, default)
    except Exception:
        return default


def _distance_meters(db: Session, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Server-side distance calculation using PostGIS."""
    sql = text("""
        SELECT ST_Distance(
            ST_SetSRID(ST_MakePoint(:lng1, :lat1), 4326)::geography,
            ST_SetSRID(ST_MakePoint(:lng2, :lat2), 4326)::geography
        )
    """)
    result = db.execute(sql, {"lat1": lat1, "lng1": lng1, "lat2": lat2, "lng2": lng2}).scalar()
    return float(result or 0)


def _visit_to_response(db: Session, visit: Visit) -> VisitResponse:
    doctor = db.query(Doctor).filter(Doctor.id == visit.doctor_id).first()
    return VisitResponse(
        id=visit.id,
        organization_id=visit.organization_id,
        rep_id=visit.rep_id,
        doctor_id=visit.doctor_id,
        doctor_name=doctor.full_name if doctor else None,
        doctor_specialty=doctor.specialty if doctor else None,
        doctor_phone=doctor.phone if doctor else None,
        doctor_address=doctor.address if doctor else None,
        doctor_latitude=doctor.latitude if doctor else None,
        doctor_longitude=doctor.longitude if doctor else None,
        visit_purpose=visit.visit_purpose,
        status=visit.status,
        planned_at=visit.planned_at,
        checked_in_at=visit.checked_in_at,
        checked_out_at=visit.checked_out_at,
        duration_minutes=visit.duration_minutes,
        checkin_latitude=visit.checkin_latitude,
        checkin_longitude=visit.checkin_longitude,
        checkout_latitude=visit.checkout_latitude,
        checkout_longitude=visit.checkout_longitude,
        distance_from_doctor=visit.distance_from_doctor,
        is_verified=visit.is_verified,
        doctor_response=visit.doctor_response,
        notes=visit.notes,
        next_follow_up_date=visit.next_follow_up_date,
        next_follow_up_type=visit.next_follow_up_type,
        next_follow_up_notes=visit.next_follow_up_notes,
        created_at=visit.created_at,
        updated_at=visit.updated_at,
    )


@router.get("", response_model=VisitListResponse)
def list_visits(
    status_filter: VisitStatus | None = Query(default=None, alias="status"),
    doctor_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    q = db.query(Visit).filter(Visit.organization_id == current_user.organization_id)

    if current_user.role.value == Role.MEDICAL_REP.value:
        q = q.filter(Visit.rep_id == current_user.id)
    if status_filter:
        q = q.filter(Visit.status == status_filter)
    if doctor_id:
        q = q.filter(Visit.doctor_id == doctor_id)

    total = q.count()
    visits = q.order_by(Visit.created_at.desc()).limit(limit).all()

    return VisitListResponse(
        items=[_visit_to_response(db, v) for v in visits],
        total=total,
    )


@router.get("/active", response_model=VisitResponse | None)
def get_active_visit(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
):
    visit = (
        db.query(Visit)
        .filter(
            Visit.rep_id == current_user.id,
            Visit.status == VisitStatus.CHECKED_IN,
        )
        .order_by(Visit.checked_in_at.desc())
        .first()
    )
    if not visit:
        return None
    return _visit_to_response(db, visit)


@router.post("", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
def create_visit(
    payload: VisitCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP, Role.MANAGER, Role.ADMIN)),
):
    doctor = (
        db.query(Doctor)
        .filter(Doctor.id == payload.doctor_id, Doctor.organization_id == current_user.organization_id)
        .first()
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    visit = Visit(
        organization_id=current_user.organization_id,
        rep_id=current_user.id,
        doctor_id=payload.doctor_id,
        doctor_location_id=payload.doctor_location_id,
        visit_purpose=payload.visit_purpose,
        status=VisitStatus.PLANNED,
        planned_at=payload.planned_at,
        notes=payload.notes,
    )
    db.add(visit)
    db.flush()

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="VISIT_CREATED",
        entity="Visit",
        entity_id=visit.id,
        metadata={"doctor_name": doctor.full_name},
    )

    db.commit()
    db.refresh(visit)
    return _visit_to_response(db, visit)


@router.get("/{visit_id}", response_model=VisitResponse)
def get_visit(
    visit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    visit = (
        db.query(Visit)
        .filter(Visit.id == visit_id, Visit.organization_id == current_user.organization_id)
        .first()
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if current_user.role.value == Role.MEDICAL_REP.value and visit.rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your visit")
    return _visit_to_response(db, visit)


@router.post("/{visit_id}/check-in", response_model=VisitResponse)
def check_in(
    visit_id: str,
    payload: VisitCheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
):
    visit = (
        db.query(Visit)
        .filter(
            Visit.id == visit_id,
            Visit.rep_id == current_user.id,
            Visit.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit.status != VisitStatus.PLANNED:
        raise HTTPException(status_code=409, detail=f"Visit status is {visit.status.value}, expected PLANNED")

    doctor = db.query(Doctor).filter(Doctor.id == visit.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Calculate distance server-side
    distance = None
    verified = False
    if doctor.latitude is not None and doctor.longitude is not None:
        distance = _distance_meters(db, payload.latitude, payload.longitude, doctor.latitude, doctor.longitude)
        radius = _get_org_setting(db, current_user.organization_id, "check_in_radius_meters", 100)
        verified = distance <= radius
    else:
        # No doctor coordinates — allow check-in without verification
        verified = False

    visit.status = VisitStatus.CHECKED_IN
    visit.checked_in_at = datetime.now(timezone.utc)
    visit.checkin_latitude = payload.latitude
    visit.checkin_longitude = payload.longitude
    visit.distance_from_doctor = distance
    visit.is_verified = verified

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="VISIT_CHECKED_IN",
        entity="Visit",
        entity_id=visit.id,
        metadata={
            "doctor": doctor.full_name,
            "distance_meters": round(distance, 2) if distance is not None else None,
            "verified": verified,
        },
    )

    db.commit()
    db.refresh(visit)
    return _visit_to_response(db, visit)


@router.post("/{visit_id}/check-out", response_model=VisitResponse)
def check_out(
    visit_id: str,
    payload: VisitCheckOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
):
    visit = (
        db.query(Visit)
        .filter(
            Visit.id == visit_id,
            Visit.rep_id == current_user.id,
            Visit.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit.status != VisitStatus.CHECKED_IN:
        raise HTTPException(status_code=409, detail=f"Visit status is {visit.status.value}, expected CHECKED_IN")

    now = datetime.now(timezone.utc)
    visit.status = VisitStatus.COMPLETED
    visit.checked_out_at = now
    visit.checkout_latitude = payload.latitude
    visit.checkout_longitude = payload.longitude
    if visit.checked_in_at:
        delta = now - visit.checked_in_at
        visit.duration_minutes = max(0, int(delta.total_seconds() / 60))

    if payload.notes:
        visit.notes = (visit.notes or "") + "\n\n[Check-out] " + payload.notes
    if payload.doctor_response:
        visit.doctor_response = payload.doctor_response
    if payload.next_follow_up_date:
        visit.next_follow_up_date = payload.next_follow_up_date
    if payload.next_follow_up_type:
        visit.next_follow_up_type = payload.next_follow_up_type
    if payload.next_follow_up_notes:
        visit.next_follow_up_notes = payload.next_follow_up_notes

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="VISIT_CHECKED_OUT",
        entity="Visit",
        entity_id=visit.id,
        metadata={"duration_minutes": visit.duration_minutes},
    )

    db.commit()
    db.refresh(visit)
    return _visit_to_response(db, visit)


@router.patch("/{visit_id}", response_model=VisitResponse)
def update_visit(
    visit_id: str,
    payload: VisitUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP, Role.MANAGER, Role.ADMIN)),
):
    visit = (
        db.query(Visit)
        .filter(Visit.id == visit_id, Visit.organization_id == current_user.organization_id)
        .first()
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if current_user.role.value == Role.MEDICAL_REP.value and visit.rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your visit")

    updates = payload.model_dump(exclude_none=True)
    for k, v in updates.items():
        setattr(visit, k, v)

    db.commit()
    db.refresh(visit)
    return _visit_to_response(db, visit)
''', encoding="utf-8")
print("OK - modules/visits/routes.py created")

# ============ 6) Register in main.py ============
main_file = backend / "app" / "main.py"
main_content = main_file.read_text(encoding="utf-8")

if "visits.routes" not in main_content:
    main_content = main_content.replace(
        "from app.modules.tracking.routes import router as tracking_router",
        "from app.modules.tracking.routes import router as tracking_router\nfrom app.modules.visits.routes import router as visits_router"
    )
    main_content = main_content.replace(
        "    app.include_router(tracking_router, prefix=api_prefix)",
        "    app.include_router(tracking_router, prefix=api_prefix)\n    app.include_router(visits_router, prefix=api_prefix)"
    )
    main_file.write_text(main_content, encoding="utf-8")
    print("OK - main.py registered visits router")

print("\nDone! Now restart backend.")