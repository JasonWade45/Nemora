"""Plan My Day — smart visit ordering for reps."""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.models.doctor import Doctor
from app.models.doctor_assignment import DoctorAssignment
from app.models.user import User
from app.models.visit import Visit, VisitStatus

router = APIRouter(prefix="/plan", tags=["plan"])


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


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    import math
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
    if p == "B" or p == "MEDIUM":
        return 0.6
    if p == "C" or p == "LOW":
        return 0.3
    return 0.5


@router.get("/today", response_model=PlanResponse)
def plan_today(
    limit: int = Query(default=10, ge=1, le=30),
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
):
    """Returns the rep's doctors ranked for today's visit priority."""
    import json

    # Load rep's assigned doctors (via specialty or explicit assignment)
    rep_specialties = []
    try:
        rep_specialties = [
            str(x) for x in json.loads(current_user.specialties_json or "[]") if str(x).strip()
        ]
    except Exception:
        rep_specialties = []

    if rep_specialties:
        doctors = (
            db.query(Doctor)
            .filter(
                Doctor.organization_id == current_user.organization_id,
                Doctor.specialty.in_(rep_specialties),
            )
            .all()
        )
    else:
        doctors = (
            db.query(Doctor)
            .join(DoctorAssignment, DoctorAssignment.doctor_id == Doctor.id)
            .filter(
                DoctorAssignment.organization_id == current_user.organization_id,
                DoctorAssignment.medical_rep_id == current_user.id,
            )
            .all()
        )

    if not doctors:
        return PlanResponse(items=[], generated_at=datetime.now(timezone.utc).isoformat(), total=0)

    doctor_ids = [d.id for d in doctors]

    # Get last visit per doctor
    last_visits = dict(
        db.query(Visit.doctor_id, func.max(Visit.checked_in_at))
        .filter(
            Visit.rep_id == current_user.id,
            Visit.doctor_id.in_(doctor_ids),
            Visit.status == VisitStatus.COMPLETED,
        )
        .group_by(Visit.doctor_id)
        .all()
    )

    # Skip doctors already visited today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    visited_today = {
        row[0]
        for row in db.query(Visit.doctor_id)
        .filter(
            Visit.rep_id == current_user.id,
            Visit.checked_in_at >= today_start,
            Visit.doctor_id.in_(doctor_ids),
        )
        .all()
    }

    now = datetime.now(timezone.utc)
    scored: list[PlanItem] = []

    for d in doctors:
        if d.id in visited_today:
            continue

        last_visit_dt = last_visits.get(d.id)
        days_since = None
        if last_visit_dt:
            if last_visit_dt.tzinfo is None:
                last_visit_dt = last_visit_dt.replace(tzinfo=timezone.utc)
            days_since = (now - last_visit_dt).days

        # Priority score
        priority_score = _priority_weight(d.priority) * 40

        # Recency score (older = better)
        if days_since is None:
            recency_score = 30  # Never visited = high priority
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

        # Proximity score (if rep location given)
        proximity_score = 0
        distance_m = None
        if lat is not None and lng is not None and d.latitude is not None and d.longitude is not None:
            distance_m = _haversine_meters(lat, lng, d.latitude, d.longitude)
            # Closer = more points, up to 30
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
            else:
                proximity_score = 0

        total_score = priority_score + recency_score + proximity_score

        # Build reason
        reasons = []
        if (d.priority or "").upper() in ("A", "HIGH", "URGENT"):
            reasons.append("أولوية عالية")
        if days_since is None:
            reasons.append("لم تتم زيارته")
        elif days_since > 30:
            reasons.append(f"منذ {days_since} يوم")
        elif days_since > 14:
            reasons.append(f"منذ {days_since} يوم")
        if distance_m is not None and distance_m < 2000:
            reasons.append(f"قريب ({round(distance_m)}م)")
        if not reasons:
            reasons.append("جدولة دورية")

        scored.append(
            PlanItem(
                doctor_id=d.id,
                doctor_name=d.full_name,
                specialty=d.specialty,
                area=d.area,
                address=d.address,
                phone=d.phone,
                latitude=d.latitude,
                longitude=d.longitude,
                priority=(d.priority.value if hasattr(d.priority, "value") else d.priority),
                last_visit_at=last_visit_dt.isoformat() if last_visit_dt else None,
                days_since_visit=days_since,
                reason=" · ".join(reasons),
                score=round(total_score, 1),
            )
        )

    scored.sort(key=lambda x: x.score, reverse=True)
    top = scored[:limit]

    return PlanResponse(
        items=top,
        generated_at=now.isoformat(),
        total=len(top),
    )