import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from app.models.location_ping import LocationPing
from app.models.shift import Shift, ShiftStatus


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def get_active_shift(db: Session, user_id: str) -> Shift | None:
    return (
        db.query(Shift)
        .filter(Shift.user_id == user_id, Shift.status == ShiftStatus.ACTIVE)
        .order_by(desc(Shift.started_at))
        .first()
    )


def get_last_ping(db: Session, user_id: str, since_minutes: int = 60) -> LocationPing | None:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=since_minutes)
    return (
        db.query(LocationPing)
        .filter(LocationPing.user_id == user_id, LocationPing.recorded_at >= cutoff)
        .order_by(desc(LocationPing.recorded_at))
        .first()
    )


def is_user_online(db: Session, user_id: str, online_window_minutes: int = 15) -> bool:
    shift = get_active_shift(db, user_id)
    if not shift:
        return False
    ping = get_last_ping(db, user_id, since_minutes=online_window_minutes)
    return ping is not None


def compute_track_distance_km(points: list) -> float:
    if len(points) < 2:
        return 0.0
    total = 0.0
    for i in range(1, len(points)):
        total += haversine_km(
            points[i - 1].latitude, points[i - 1].longitude,
            points[i].latitude, points[i].longitude,
        )
    return round(total, 3)