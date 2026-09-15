from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.daily_report import DailyReport
from app.models.location_ping import LocationPing
from app.models.shift import Shift, ShiftStatus
from app.models.user import User, UserRole
from app.modules.audit.service import create_audit_log
from app.modules.tracking.service import (
    compute_track_distance_km,
    get_active_shift,
    get_last_ping,
    is_user_online,
)
from app.schemas.daily_report import DailyReportListResponse, DailyReportResponse
from app.schemas.location import (
    HeatmapPoint,
    HeatmapResponse,
    LocationPingCreate,
    LocationPingResponse,
    TeamLocationItem,
    TeamLocationsResponse,
    TrackPoint,
    TrackResponse,
)
from app.schemas.shift import ShiftCurrentResponse, ShiftEndRequest, ShiftResponse, ShiftStartRequest

router = APIRouter(tags=["tracking"])


def _require_manager_or_admin(current_user: User) -> None:
    if current_user.role not in (UserRole.ADMIN, UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Insufficient permissions")


# ==================== SHIFTS ====================

@router.post("/shifts/start", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
def start_shift(
    payload: ShiftStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    active = get_active_shift(db, current_user.id)
    if active:
        raise HTTPException(status_code=409, detail="You already have an active shift")

    shift = Shift(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        status=ShiftStatus.ACTIVE,
        notes=payload.notes,
    )
    db.add(shift)
    db.flush()

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="SHIFT_STARTED",
        entity="Shift",
        entity_id=shift.id,
    )
    db.commit()
    db.refresh(shift)
    return shift


@router.post("/shifts/end", response_model=ShiftResponse)
def end_shift(
    payload: ShiftEndRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = get_active_shift(db, current_user.id)
    if not shift:
        raise HTTPException(status_code=404, detail="No active shift found")

    now = datetime.now(timezone.utc)
    shift.status = ShiftStatus.ENDED
    shift.ended_at = now
    if payload.notes:
        shift.notes = (shift.notes or "") + "\n" + payload.notes

    # Build the daily report for this user
    today = now.date()
    day_start = datetime.combine(today, datetime.min.time(), tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    pings = (
        db.query(LocationPing)
        .filter(
            LocationPing.user_id == current_user.id,
            LocationPing.recorded_at >= day_start,
            LocationPing.recorded_at < day_end,
        )
        .order_by(LocationPing.recorded_at)
        .all()
    )

    distance_km = compute_track_distance_km(pings)
    summary = (
        f"Shift started at {shift.started_at.isoformat()} and ended at {now.isoformat()}. "
        f"Total pings recorded: {len(pings)}. Distance covered: {distance_km} km."
    )

    report = DailyReport(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        manager_id=None,
        report_date=today,
        summary=summary,
        total_visits=0,
        completed_visits=0,
        doctors_visited=0,
        revenue=0.0,
        shift_started_at=shift.started_at,
        shift_ended_at=now,
        distance_km=distance_km,
        details=None,
    )
    db.add(report)

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="SHIFT_ENDED",
        entity="Shift",
        entity_id=shift.id,
    )
    db.commit()
    db.refresh(shift)
    return shift


@router.get("/shifts/current", response_model=ShiftCurrentResponse)
def current_shift(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = get_active_shift(db, current_user.id)
    if not shift:
        return ShiftCurrentResponse(active=False, shift=None)
    return ShiftCurrentResponse(
        active=True,
        shift=ShiftResponse(
            id=shift.id,
            user_id=shift.user_id,
            status=shift.status.value,
            started_at=shift.started_at,
            ended_at=shift.ended_at,
            notes=shift.notes,
        ),
    )


# ==================== LOCATION ====================

@router.post("/location/ping", response_model=LocationPingResponse, status_code=status.HTTP_201_CREATED)
def send_ping(
    payload: LocationPingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ping = LocationPing(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy=payload.accuracy,
    )
    db.add(ping)
    db.commit()
    db.refresh(ping)
    return ping


@router.get("/team/locations", response_model=TeamLocationsResponse)
def team_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)

    users = (
        db.query(User)
        .filter(User.organization_id == current_user.organization_id, User.is_active == True)
        .all()
    )

    items: list[TeamLocationItem] = []
    for u in users:
        last = get_last_ping(db, u.id, since_minutes=60 * 24)
        shift = get_active_shift(db, u.id)
        online = is_user_online(db, u.id)
        items.append(
            TeamLocationItem(
                user_id=u.id,
                full_name=u.full_name,
                email=u.email,
                role=u.role.value,
                latitude=last.latitude if last else None,
                longitude=last.longitude if last else None,
                accuracy=last.accuracy if last else None,
                last_seen=last.recorded_at if last else None,
                shift_status=shift.status.value if shift else None,
                shift_started_at=shift.started_at if shift else None,
                is_online=online,
            )
        )
    return TeamLocationsResponse(items=items)


@router.get("/team/track/{user_id}", response_model=TrackResponse)
def user_track(
    user_id: str,
    date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)

    try:
        day = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    target = (
        db.query(User)
        .filter(User.id == user_id, User.organization_id == current_user.organization_id)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    day_start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    pings = (
        db.query(LocationPing)
        .filter(
            LocationPing.user_id == user_id,
            LocationPing.recorded_at >= day_start,
            LocationPing.recorded_at < day_end,
        )
        .order_by(LocationPing.recorded_at)
        .all()
    )

    points = [TrackPoint(latitude=p.latitude, longitude=p.longitude, recorded_at=p.recorded_at) for p in pings]
    return TrackResponse(
        user_id=user_id,
        date=date,
        points=points,
        total_distance_km=compute_track_distance_km(pings),
    )


@router.get("/team/heatmap", response_model=HeatmapResponse)
def heatmap(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    pings = (
        db.query(LocationPing)
        .filter(
            LocationPing.organization_id == current_user.organization_id,
            LocationPing.recorded_at >= cutoff,
        )
        .all()
    )

    # Bucket by ~100m grid to reduce payload
    buckets: dict[tuple[float, float], int] = {}
    for p in pings:
        key = (round(p.latitude, 3), round(p.longitude, 3))
        buckets[key] = buckets.get(key, 0) + 1

    max_w = max(buckets.values()) if buckets else 1
    points = [
        HeatmapPoint(latitude=lat, longitude=lng, weight=round(count / max_w, 3))
        for (lat, lng), count in buckets.items()
    ]
    return HeatmapResponse(points=points)


# ==================== DAILY REPORTS ====================

@router.get("/daily-reports", response_model=DailyReportListResponse)
def list_daily_reports(
    user_id: str | None = Query(None),
    date: str | None = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(DailyReport).filter(DailyReport.organization_id == current_user.organization_id)

    if current_user.role == UserRole.MEDICAL_REP:
        q = q.filter(DailyReport.user_id == current_user.id)
    elif user_id:
        q = q.filter(DailyReport.user_id == user_id)

    if date:
        try:
            day = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
        q = q.filter(DailyReport.report_date == day)

    reports = q.order_by(desc(DailyReport.sent_at)).limit(200).all()

    user_map = {
        u.id: u.full_name
        for u in db.query(User).filter(User.organization_id == current_user.organization_id).all()
    }

    items = [
        DailyReportResponse(
            id=r.id,
            user_id=r.user_id,
            user_name=user_map.get(r.user_id),
            manager_id=r.manager_id,
            report_date=r.report_date,
            summary=r.summary,
            total_visits=r.total_visits,
            completed_visits=r.completed_visits,
            doctors_visited=r.doctors_visited,
            revenue=r.revenue,
            shift_started_at=r.shift_started_at,
            shift_ended_at=r.shift_ended_at,
            distance_km=r.distance_km,
            details=r.details,
            sent_at=r.sent_at,
        )
        for r in reports
    ]
    return DailyReportListResponse(items=items)