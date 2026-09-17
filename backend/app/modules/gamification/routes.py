"""Gamification: badges + points system. Pure SQL — no Alembic."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.models.user import User
from app.models.visit import Visit, VisitStatus
from app.models.sale import Sale

router = APIRouter(prefix="/gamification", tags=["gamification"])

BADGE_DEFINITIONS = {
    "first_visit": {"name": "أول زيارة", "description": "أكمل أول زيارة", "icon": "🎯", "points": 10},
    "ten_visits": {"name": "10 زيارات", "description": "أكمل 10 زيارات", "icon": "🔟", "points": 50},
    "fifty_visits": {"name": "50 زيارة", "description": "أكمل 50 زيارة", "icon": "🏆", "points": 200},
    "hundred_visits": {"name": "100 زيارة", "description": "أكمل 100 زيارة", "icon": "👑", "points": 500},
    "first_sale": {"name": "أول مبيعة", "description": " prawno أول مبيعة", "icon": "💰", "points": 10},
    "ten_sales": {"name": "10 مبيعات", "description": "حقق 10 مبيعات", "icon": "🔥", "points": 50},
    "early_bird": {"name": "بدرى", "description": "ابدأ شift قبل 8 صباحاً", "icon": "🌅", "points": 15},
    "consistent_week": {"name": "ملتزم أسبوعياً", "description": "أكمل 5 أيام عمل متتالية", "icon": "📅", "points": 100},
    "distance_master": {"name": "فارس المسافات", "description": "اذهب لأكثر من 5 أماكن مختلفة", "icon": "🗺️", "points": 75},
    "all_products": {"name": "بائع شامل", "description": "اكتب في 3 منتجات مختلفة", "icon": "📦", "points": 60},
}


class BadgeResponse(BaseModel):
    key: str
    name: str
    description: str
    icon: str
    points: int
    earned: bool
    earned_at: str | None = None


class LeaderboardEntry(BaseModel):
    user_id: str
    full_name: str
    total_points: int
    badges_count: int
    rank: int


def _get_user_earned_badges(db: Session, user_id: str) -> dict[str, str | None]:
    """Calculate earned badges from actual data."""
    earned: dict[str, str | None] = {}

    completed_visits = (
        db.query(func.count(Visit.id))
        .filter(Visit.rep_id == user_id, Visit.status == VisitStatus.COMPLETED)
        .scalar() or 0
    )

    if completed_visits >= 1:
        earned["first_visit"] = "earned"
    if completed_visits >= 10:
        earned["ten_visits"] = "earned"
    if completed_visits >= 50:
        earned["fifty_visits"] = "earned"
    if completed_visits >= 100:
        earned["hundred_visits"] = "earned"

    total_sales = (
        db.query(func.count(Sale.id))
        .filter(Sale.rep_id == user_id)
        .scalar() or 0
    )
    if total_sales >= 1:
        earned["first_sale"] = "earned"
    if total_sales >= 10:
        earned["ten_sales"] = "earned"

    # Early bird: any shift started before 8am
    from app.models.shift import Shift
    early_shifts = (
        db.query(func.count(Shift.id))
        .filter(Shift.user_id == user_id)
        .filter(func.extract("hour", Shift.started_at) < 8)
        .scalar() or 0
    )
    if early_shifts >= 1:
        earned["early_bird"] = "earned"

    # Consistent week: distinct working days in current week
    from datetime import timedelta
    now = datetime.utcnow()
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    working_days = (
        db.query(func.count(func.distinct(func.date(Visit.created_at))))
        .filter(Visit.rep_id == user_id, Visit.created_at >= week_start)
        .scalar() or 0
    )
    if working_days >= 5:
        earned["consistent_week"] = "earned"

    # Distance master: distinct doctors visited
    distinct_doctors = (
        db.query(func.count(func.distinct(Visit.doctor_id)))
        .filter(Visit.rep_id == user_id, Visit.status == VisitStatus.COMPLETED)
        .scalar() or 0
    )
    if distinct_doctors >= 5:
        earned["distance_master"] = "earned"

    # All products: distinct products in sales
    distinct_products = (
        db.query(func.count(func.distinct(Sale.product_id)))
        .filter(Sale.rep_id == user_id)
        .scalar() or 0
    )
    if distinct_products >= 3:
        earned["all_products"] = "earned"

    return earned


def _calculate_points(earned: dict[str, str | None]) -> int:
    return sum(BADGE_DEFINITIONS[k]["points"] for k in earned if k in BADGE_DEFINITIONS)


@router.get("/badges/{user_id}", response_model=list[BadgeResponse])
def get_user_badges(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    earned = _get_user_earned_badges(db, user_id)
    return [
        BadgeResponse(
            key=key,
            name=defn["name"],
            description=defn["description"],
            icon=defn["icon"],
            points=defn["points"],
            earned=key in earned,
            earned_at=None,
        )
        for key, defn in BADGE_DEFINITIONS.items()
    ]


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def get_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    from app.core.visibility import get_visible_user_ids
    visible = get_visible_user_ids(db, current_user)
    users = db.query(User).filter(User.id.in_(visible)).all()

    entries = []
    for u in users:
        earned = _get_user_earned_badges(db, u.id)
        entries.append({
            "user_id": u.id,
            "full_name": u.full_name,
            "total_points": _calculate_points(earned),
            "badges_count": len(earned),
        })

    entries.sort(key=lambda x: x["total_points"], reverse=True)
    for i, e in enumerate(entries):
        e["rank"] = i + 1

    return entries


@router.get("/my-stats")
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    earned = _get_user_earned_badges(db, current_user.id)
    points = _calculate_points(earned)

    completed_visits = (
        db.query(func.count(Visit.id))
        .filter(Visit.rep_id == current_user.id, Visit.status == VisitStatus.COMPLETED)
        .scalar() or 0
    )
    total_sales = (
        db.query(func.count(Sale.id))
        .filter(Sale.rep_id == current_user.id)
        .scalar() or 0
    )
    total_revenue = (
        db.query(func.coalesce(func.sum(Sale.total_price), 0))
        .filter(Sale.rep_id == current_user.id)
        .scalar() or 0
    )

    return {
        "points": points,
        "badges_count": len(earned),
        "total_badges": len(BADGE_DEFINITIONS),
        "completed_visits": completed_visits,
        "total_sales": total_sales,
        "total_revenue": total_revenue,
        "badges": [
            {"key": k, "name": BADGE_DEFINITIONS[k]["name"], "icon": BADGE_DEFINITIONS[k]["icon"]}
            for k in earned
        ],
    }
