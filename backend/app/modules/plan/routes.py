"""Plan My Day — smart visit ordering for reps."""
import json
import math
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.models.doctor import Doctor
from app.models.doctor_assignment import DoctorAssignment
from app.models.shift import Shift, ShiftStatus
from app.models.user import User
from app.models.visit import Visit, VisitStatus, VisitPurpose
from app.modules.audit.service import create_audit_log

router = APIRouter(prefix="/plan", tags=["plan"])


# ============ Schemas ============

class PlanItem(BaseModel):
    doctor_id: str
    doctor_name: str
    specialty: str | None = None
    area: str | None = None
    address: str | None = None
    phone: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    priority: str | None = None
    last_visit_at: str | None = None
    days_since_visit: int | None = None
    reason: str
    score: float


class PlanResponse(BaseModel):
    items: list[PlanItem]
    generated_at: str
    total: int


class PlanDoctorItem(BaseModel):
    doctor_id: str
    doctor_name: str
    specialty: str | None = None
    area: str | None = None
    address: str | None = None
    phone: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    priority: str | None = None
    days_since_visit: int | None = None
    last_visit_at: str | None = None
    score: float
    selected: bool = False


class PlanBuildResponse(BaseModel):
    doctors: list[PlanDoctorItem]
    areas: list[str]
    specialties: list[str]
    total: int


class VisitSelection(BaseModel):
    doctor_id: str
    visit_purpose: str


class PlanConfirmRequest(BaseModel):
    selections: list[VisitSelection]


class PlannedVisitResponse(BaseModel):
    visit_id: str
    doctor_id: str
    doctor_name: str
    visit_purpose: str
    order: int
    latitude: float | None = None
    longitude: float | None = None


class PlanConfirmResponse(BaseModel):
    shift_id: str
    visits: list[PlannedVisitResponse]
    total_distance_km: float | None = None
    message: str


# ============ Helpers ============

def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371000
    toRad = math.radians
    dLat = toRad(lat2 - lat1)
    dLng = toRad(lng2 - lng1)
    a = (
        math.sin(dLat / 2) ** 2
        + math.cos(toRad(lat1)) * math.cos(toRad(lat2)) * math.sin(dLng / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(a))


def _priority_weight(priority: str | None) -> float:
    p = (priority or "").upper()
    if p in ("A", "HIGH", "URGENT"):
        return 1.0
    if p in ("B", "MEDIUM"):
        return 0.6
    if p in ("C", "LOW"):
        return 0.3
    return 0.5


def _load_rep_doctors(db: Session, user: User) -> list[Doctor]:
    rep_specialties = []
    try:
        rep_specialties = [
            str(x) for x in json.loads(user.specialties_json or "[]") if str(x).strip()
        ]
    except Exception:
        rep_specialties = []

    if rep_specialties:
        return (
            db.query(Doctor)
            .filter(
                Doctor.organization_id == user.organization_id,
                Doctor.specialty.in_(rep_specialties),
            )
            .all()
        )
    else:
        return (
            db.query(Doctor)
            .join(DoctorAssignment, DoctorAssignment.doctor_id == Doctor.id)
            .filter(
                DoctorAssignment.organization_id == user.organization_id,
                DoctorAssignment.medical_rep_id == user.id,
            )
            .all()
        )


def _get_last_visits(db: Session, user_id: str, doctor_ids: list[str]) -> dict:
    rows = (
        db.query(Visit.doctor_id, func.max(Visit.checked_in_at))
        .filter(
            Visit.rep_id == user_id,
            Visit.doctor_id.in_(doctor_ids),
            Visit.status == VisitStatus.COMPLETED,
        )
        .group_by(Visit.doctor_id)
        .all()
    )
    return dict(rows)


def _get_visited_today(db: Session, user_id: str, doctor_ids: list[str]) -> set:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return {
        row[0]
        for row in db.query(Visit.doctor_id)
        .filter(
            Visit.rep_id == user_id,
            Visit.checked_in_at >= today_start,
            Visit.doctor_id.in_(doctor_ids),
        )
        .all()
    }


def _score_doctors(
    doctors: list[Doctor],
    user: User,
    last_visits: dict,
    visited_today: set,
    lat: float | None = None,
    lng: float | None = None,
) -> list[PlanDoctorItem]:
    now = datetime.now(timezone.utc)
    scored = []

    for d in doctors:
        if d.id in visited_today:
            continue

        last_visit_dt = last_visits.get(d.id)
        days_since = None
        if last_visit_dt:
            if last_visit_dt.tzinfo is None:
                last_visit_dt = last_visit_dt.replace(tzinfo=timezone.utc)
            days_since = (now - last_visit_dt).days

        priority_score = _priority_weight(d.priority) * 40

        if days_since is None:
            recency_score = 30
        elif days_since > 60:
            recency_score = 35
        elif days_since > 30:
            recency_score = 25
        elif days_since > 14:
            recency_score = 18
        elif days_since > 7:
            recency_score = 12
        else:
            recency_score = 5

        proximity_score = 0
        distance_m = None
        if lat is not None and lng is not None and d.latitude is not None and d.longitude is not None:
            distance_m = _haversine_meters(lat, lng, d.latitude, d.longitude)
            if distance_m < 500:
                proximity_score = 30
            elif distance_m < 1000:
                proximity_score = 25
            elif distance_m < 2000:
                proximity_score = 18
            elif distance_m < 5000:
                proximity_score = 10
            elif distance_m < 10000:
                proximity_score = 5

        total_score = priority_score + recency_score + proximity_score

        reasons = []
        if (d.priority or "").upper() in ("A", "HIGH", "URGENT"):
            reasons.append("أولوية عالية")
        if days_since is None:
            reasons.append("لم تتم زيارته")
        elif days_since > 30:
            reasons.append(f"منذ {days_since} يوم")
        if distance_m is not None and distance_m < 2000:
            reasons.append(f"قريب ({round(distance_m)}م)")
        if not reasons:
            reasons.append("جدولة دورية")

        scored.append(PlanDoctorItem(
            doctor_id=d.id,
            doctor_name=d.full_name,
            specialty=d.specialty,
            area=d.area,
            address=d.address,
            phone=d.phone,
            latitude=d.latitude,
            longitude=d.longitude,
            priority=(d.priority.value if hasattr(d.priority, "value") else d.priority),
            days_since_visit=days_since,
            last_visit_at=last_visit_dt.isoformat() if last_visit_dt else None,
            score=round(total_score, 1),
        ))

    scored.sort(key=lambda x: x.score, reverse=True)
    return scored


def _optimize_route(items: list[PlannedVisitResponse], doctors_map: dict[str, Doctor]) -> list[PlannedVisitResponse]:
    """Nearest-neighbor TSP heuristic to optimize visit order."""
    if len(items) <= 2:
        return items

    visited = set()
    ordered = []
    remaining = {v.doctor_id: v for v in items}

    current_lat, current_lng = None, None
    first_id = items[0].doctor_id
    first_doc = doctors_map.get(first_id)
    if first_doc and first_doc.latitude and first_doc.longitude:
        current_lat, current_lng = first_doc.latitude, first_doc.longitude

    while remaining:
        best_id = None
        best_dist = float("inf")
        for doc_id, item in remaining.items():
            doc = doctors_map.get(doc_id)
            if doc and doc.latitude and doc.longitude and current_lat is not None:
                dist = _haversine_meters(current_lat, current_lng, doc.latitude, doc.longitude)
            else:
                dist = 0
            if dist < best_dist:
                best_dist = dist
                best_id = doc_id

        if best_id is None:
            best_id = next(iter(remaining))

        ordered.append(remaining.pop(best_id))
        visited.add(best_id)

        doc = doctors_map.get(best_id)
        if doc and doc.latitude and doc.longitude:
            current_lat, current_lng = doc.latitude, doc.longitude

    for i, item in enumerate(ordered):
        item.order = i + 1

    return ordered


# ============ Routes ============

@router.get("/today", response_model=PlanResponse)
def plan_today(
    limit: int = Query(default=10, ge=1, le=30),
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
):
    """Returns the rep's doctors ranked for today's visit priority."""
    doctors = _load_rep_doctors(db, current_user)
    if not doctors:
        return PlanResponse(items=[], generated_at=datetime.now(timezone.utc).isoformat(), total=0)

    doctor_ids = [d.id for d in doctors]
    last_visits = _get_last_visits(db, current_user.id, doctor_ids)
    visited_today = _get_visited_today(db, current_user.id, doctor_ids)

    scored = _score_doctors(doctors, current_user, last_visits, visited_today, lat, lng)
    top = scored[:limit]

    return PlanResponse(
        items=[PlanItem(
            doctor_id=d.doctor_id,
            doctor_name=d.doctor_name,
            specialty=d.specialty,
            area=d.area,
            address=d.address,
            phone=d.phone,
            latitude=d.latitude,
            longitude=d.longitude,
            priority=d.priority,
            last_visit_at=d.last_visit_at,
            days_since_visit=d.days_since_visit,
            reason="",
            score=d.score,
        ) for d in top],
        generated_at=datetime.now(timezone.utc).isoformat(),
        total=len(top),
    )


@router.get("/build", response_model=PlanBuildResponse)
def plan_build(
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
):
    """Build the plan: returns all available doctors ranked, plus filter options."""
    doctors = _load_rep_doctors(db, current_user)
    if not doctors:
        return PlanBuildResponse(doctors=[], areas=[], specialties=[], total=0)

    doctor_ids = [d.id for d in doctors]
    last_visits = _get_last_visits(db, current_user.id, doctor_ids)
    visited_today = _get_visited_today(db, current_user.id, doctor_ids)

    scored = _score_doctors(doctors, current_user, last_visits, visited_today, lat, lng)

    areas = sorted({d.area for d in doctors if d.area})
    specialties = sorted({d.specialty for d in doctors if d.specialty})

    return PlanBuildResponse(
        doctors=scored,
        areas=areas,
        specialties=specialties,
        total=len(scored),
    )


@router.post("/confirm", response_model=PlanConfirmResponse, status_code=status.HTTP_201_CREATED)
def plan_confirm(
    payload: PlanConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
):
    """Confirm plan: start shift + create planned visits + optimize route."""
    if not payload.selections:
        raise HTTPException(status_code=400, detail="يجب اختيار دكتور واحد على الأقل")

    # Check for existing active shift
    active = db.query(Shift).filter(
        Shift.user_id == current_user.id,
        Shift.status == ShiftStatus.ACTIVE,
    ).first()
    if active:
        raise HTTPException(status_code=409, detail="يوجد شيفت نشط بالفعل")

    # Validate visit purposes
    valid_purposes = {p.value for p in VisitPurpose}
    for sel in payload.selections:
        if sel.visit_purpose not in valid_purposes:
            raise HTTPException(status_code=400, detail=f"غرض زيارة غير صحيح: {sel.visit_purpose}")

    # Load doctors
    doctor_ids = [s.doctor_id for s in payload.selections]
    doctors = (
        db.query(Doctor)
        .filter(Doctor.id.in_(doctor_ids), Doctor.organization_id == current_user.organization_id)
        .all()
    )
    doctors_map = {d.id: d for d in doctors}

    if len(doctors) != len(doctor_ids):
        found_ids = {d.id for d in doctors}
        missing = [did for did in doctor_ids if did not in found_ids]
        raise HTTPException(status_code=404, detail=f"أطباء غير موجودين: {', '.join(missing)}")

    # Create shift
    shift = Shift(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        status=ShiftStatus.ACTIVE,
    )
    db.add(shift)
    db.flush()

    # Create planned visits
    now = datetime.now(timezone.utc)
    visits = []
    for i, sel in enumerate(payload.selections):
        visit = Visit(
            rep_id=current_user.id,
            doctor_id=sel.doctor_id,
            organization_id=current_user.organization_id,
            visit_purpose=VisitPurpose(sel.visit_purpose),
            status=VisitStatus.PLANNED,
            planned_at=now + timedelta(minutes=i * 30),
        )
        db.add(visit)
        db.flush()
        visits.append(PlannedVisitResponse(
            visit_id=visit.id,
            doctor_id=sel.doctor_id,
            doctor_name=doctors_map[sel.doctor_id].full_name,
            visit_purpose=sel.visit_purpose,
            order=i + 1,
            latitude=doctors_map[sel.doctor_id].latitude,
            longitude=doctors_map[sel.doctor_id].longitude,
        ))

    # Optimize route
    visits = _optimize_route(visits, doctors_map)

    # Update planned_at based on optimized order
    for i, v in enumerate(visits):
        visit_row = db.query(Visit).filter(Visit.id == v.visit_id).first()
        if visit_row:
            visit_row.planned_at = now + timedelta(minutes=i * 30)

    # Calculate total distance
    total_dist = 0.0
    for i in range(len(visits) - 1):
        d1 = doctors_map.get(visits[i].doctor_id)
        d2 = doctors_map.get(visits[i + 1].doctor_id)
        if d1 and d2 and d1.latitude and d1.longitude and d2.latitude and d2.longitude:
            total_dist += _haversine_meters(d1.latitude, d1.longitude, d2.latitude, d2.longitude)

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="PLAN_CREATED",
        entity="Shift",
        entity_id=shift.id,
        metadata={
            "doctors_count": len(visits),
            "total_distance_km": round(total_dist / 1000, 2),
        },
    )

    db.commit()
    db.refresh(shift)

    return PlanConfirmResponse(
        shift_id=shift.id,
        visits=visits,
        total_distance_km=round(total_dist / 1000, 2),
        message=f"تم إنشاء خطة زيارة {len(visits)} أطباء بنجاح",
    )
