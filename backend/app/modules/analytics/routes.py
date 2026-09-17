from datetime import datetime, timedelta, timezone
from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.core.visibility import get_visible_user_ids
from app.models.doctor import Doctor
from app.models.product import Product
from app.models.user import User
from app.models.visit import Visit, VisitStatus, DoctorResponse
from app.models.visit_product import VisitProduct

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
def analytics_overview(
    days: int = Query(default=30, ge=1, le=365),
    specialty: str | None = Query(default=None),
    area: str | None = Query(default=None),
    rep_id: str | None = Query(default=None),
    product_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
):
    visible = get_visible_user_ids(db, current_user)

    # Base query — completed visits
    q = db.query(Visit).filter(
        Visit.organization_id == current_user.organization_id,
        Visit.rep_id.in_(visible),
    )

    if days < 365:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        q = q.filter(Visit.checked_in_at >= cutoff)

    if rep_id and rep_id in visible:
        q = q.filter(Visit.rep_id == rep_id)

    if product_id:
        q = q.join(VisitProduct, VisitProduct.visit_id == Visit.id).filter(
            VisitProduct.product_id == product_id
        )

    if specialty or area:
        q = q.join(Doctor, Doctor.id == Visit.doctor_id)
        if specialty:
            q = q.filter(Doctor.specialty == specialty)
        if area:
            q = q.filter(Doctor.area == area)

    visits = q.all()
    visit_ids = [v.id for v in visits]

    # Load related data
    doctor_ids = list({v.doctor_id for v in visits})
    doctors = {
        d.id: d
        for d in db.query(Doctor).filter(Doctor.id.in_(doctor_ids)).all()
    } if doctor_ids else {}

    rep_ids_set = list({v.rep_id for v in visits})
    reps = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(rep_ids_set)).all()
    } if rep_ids_set else {}

    vps = db.query(VisitProduct).filter(VisitProduct.visit_id.in_(visit_ids)).all() if visit_ids else []
    product_ids_set = list({vp.product_id for vp in vps})
    products = {
        p.id: p
        for p in db.query(Product).filter(Product.id.in_(product_ids_set)).all()
    } if product_ids_set else {}

    # ===== Stats =====
    total_visits = len(visits)
    completed_visits = sum(1 for v in visits if v.status == VisitStatus.COMPLETED)
    unique_doctors = len({v.doctor_id for v in visits})
    unique_reps = len({v.rep_id for v in visits})

    # Conversion
    response_counts = Counter(v.doctor_response.value for v in visits if v.doctor_response)
    very_interested = response_counts.get("VERY_INTERESTED", 0)
    interested = response_counts.get("INTERESTED", 0)
    neutral = response_counts.get("NEUTRAL", 0)
    not_interested = response_counts.get("NOT_INTERESTED", 0)
    total_responses = very_interested + interested + neutral + not_interested
    conversion_rate = (
        round(((very_interested + interested) / total_responses) * 100, 1)
        if total_responses > 0 else 0
    )

    # Top products
    product_counter = Counter(vp.product_id for vp in vps)
    top_products = []
    for pid, cnt in product_counter.most_common(10):
        p = products.get(pid)
        if p:
            top_products.append({
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "count": cnt,
            })

    # Top reps
    rep_counter = Counter(v.rep_id for v in visits)
    top_reps = []
    for rid, cnt in rep_counter.most_common(10):
        u = reps.get(rid)
        if u:
            top_reps.append({
                "id": u.id,
                "name": u.full_name,
                "count": cnt,
            })

    # Top areas
    area_counter = Counter(
        doctors[v.doctor_id].area
        for v in visits
        if v.doctor_id in doctors and doctors[v.doctor_id].area
    )
    top_areas = [{"area": a, "count": c} for a, c in area_counter.most_common(15)]

    # Top specialties
    spec_counter = Counter(
        doctors[v.doctor_id].specialty
        for v in visits
        if v.doctor_id in doctors and doctors[v.doctor_id].specialty
    )
    top_specialties = [{"specialty": s, "count": c} for s, c in spec_counter.most_common(15)]

    # Visit trend (last N days)
    trend_days = min(days, 30) if days < 365 else 30
    trend_map = {}
    today = datetime.now(timezone.utc).date()
    for i in range(trend_days):
        d = today - timedelta(days=i)
        trend_map[d.isoformat()] = 0
    for v in visits:
        if v.checked_in_at:
            key = v.checked_in_at.date().isoformat()
            if key in trend_map:
                trend_map[key] += 1
    visit_trend = [
        {"date": d, "count": c}
        for d, c in sorted(trend_map.items())
    ]

    return {
        "totals": {
            "visits": total_visits,
            "completed": completed_visits,
            "unique_doctors": unique_doctors,
            "unique_reps": unique_reps,
            "conversion_rate": conversion_rate,
        },
        "responses": {
            "very_interested": very_interested,
            "interested": interested,
            "neutral": neutral,
            "not_interested": not_interested,
        },
        "top_products": top_products,
        "top_reps": top_reps,
        "top_areas": top_areas,
        "top_specialties": top_specialties,
        "visit_trend": visit_trend,
    }


@router.get("/filters")
def analytics_filters(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
):
    """Returns options available for filtering."""
    visible = get_visible_user_ids(db, current_user)

    # Specialties + Areas (from doctors)
    doctors = db.query(Doctor).filter(
        Doctor.organization_id == current_user.organization_id
    ).all()
    specialties = sorted({d.specialty for d in doctors if d.specialty})
    areas = sorted({d.area for d in doctors if d.area})

    # Products
    products = db.query(Product).filter(
        Product.organization_id == current_user.organization_id,
        Product.is_active == True,
    ).all()
    products_list = [{"id": p.id, "name": p.name} for p in products]

    # Reps (scoped)
    reps = db.query(User).filter(
        User.organization_id == current_user.organization_id,
        User.id.in_(visible),
        User.role == "MEDICAL_REP" if False else User.role.in_(["MEDICAL_REP", "ADMIN", "MANAGER"]),
    ).all()
    reps_list = [{"id": u.id, "name": u.full_name, "role": u.role.value} for u in reps]

    return {
        "specialties": specialties,
        "areas": areas,
        "products": products_list,
        "reps": reps_list,
    }


@router.get("/details")
def analytics_details(
    type: str = Query(...),  # visits | completed | doctors | reps | responses
    response_type: str | None = Query(default=None),  # for responses type
    days: int = Query(default=30, ge=1, le=365),
    specialty: str | None = Query(default=None),
    area: str | None = Query(default=None),
    rep_id: str | None = Query(default=None),
    product_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
):
    """Return detailed list behind a specific stat."""
    visible = get_visible_user_ids(db, current_user)

    q = db.query(Visit).filter(
        Visit.organization_id == current_user.organization_id,
        Visit.rep_id.in_(visible),
    )

    if days < 365:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        q = q.filter(Visit.checked_in_at >= cutoff)

    if rep_id and rep_id in visible:
        q = q.filter(Visit.rep_id == rep_id)

    if product_id:
        q = q.join(VisitProduct, VisitProduct.visit_id == Visit.id).filter(
            VisitProduct.product_id == product_id
        )

    if specialty or area:
        q = q.join(Doctor, Doctor.id == Visit.doctor_id)
        if specialty:
            q = q.filter(Doctor.specialty == specialty)
        if area:
            q = q.filter(Doctor.area == area)

    if type == "completed":
        q = q.filter(Visit.status == VisitStatus.COMPLETED)

    if type == "responses" and response_type:
        q = q.filter(Visit.doctor_response == response_type)

    visits = q.order_by(Visit.checked_in_at.desc()).all()

    # Get doctor/rep names
    doctor_ids = list({v.doctor_id for v in visits})
    rep_ids = list({v.rep_id for v in visits})
    doctors = {d.id: d for d in db.query(Doctor).filter(Doctor.id.in_(doctor_ids)).all()} if doctor_ids else {}
    reps = {u.id: u for u in db.query(User).filter(User.id.in_(rep_ids)).all()} if rep_ids else {}

    if type in ("visits", "completed", "responses"):
        items = []
        for v in visits:
            d = doctors.get(v.doctor_id)
            r = reps.get(v.rep_id)
            items.append({
                "id": v.id,
                "doctor_name": d.full_name if d else "—",
                "doctor_specialty": d.specialty if d else None,
                "doctor_area": d.area if d else None,
                "rep_name": r.full_name if r else "—",
                "status": v.status.value,
                "checked_in_at": v.checked_in_at.isoformat() if v.checked_in_at else None,
                "doctor_response": v.doctor_response.value if v.doctor_response else None,
                "duration_minutes": v.duration_minutes,
            })
        return {"type": type, "items": items, "total": len(items)}

    if type == "doctors":
        # Unique doctors with visit counts
        doctor_counter = {}
        for v in visits:
            d = doctors.get(v.doctor_id)
            if not d:
                continue
            key = v.doctor_id
            if key not in doctor_counter:
                doctor_counter[key] = {
                    "id": d.id,
                    "name": d.full_name,
                    "specialty": d.specialty,
                    "area": d.area,
                    "phone": d.phone,
                    "count": 0,
                }
            doctor_counter[key]["count"] += 1
        items = sorted(doctor_counter.values(), key=lambda x: -x["count"])
        return {"type": "doctors", "items": items, "total": len(items)}

    if type == "reps":
        rep_counter = {}
        for v in visits:
            r = reps.get(v.rep_id)
            if not r:
                continue
            key = v.rep_id
            if key not in rep_counter:
                rep_counter[key] = {
                    "id": r.id,
                    "name": r.full_name,
                    "email": r.email,
                    "role": r.role.value,
                    "count": 0,
                }
            rep_counter[key]["count"] += 1
        items = sorted(rep_counter.values(), key=lambda x: -x["count"])
        return {"type": "reps", "items": items, "total": len(items)}

    return {"type": type, "items": [], "total": 0}


@router.get("/advanced")
def advanced_analytics(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
):
    visible = get_visible_user_ids(db, current_user)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    visits = (
        db.query(Visit)
        .filter(Visit.organization_id == current_user.organization_id, Visit.rep_id.in_(visible), Visit.checked_in_at >= cutoff)
        .all()
    )

    total = len(visits)
    completed = [v for v in visits if v.status == VisitStatus.COMPLETED]
    missed = [v for v in visits if v.status == VisitStatus.MISSED]
    conversion_rate = len(completed) / total * 100 if total > 0 else 0

    # Average duration
    durations = [v.duration_minutes for v in completed if v.duration_minutes is not None]
    avg_duration = sum(durations) / len(durations) if durations else 0

    # Response breakdown
    response_counts: dict[str, int] = {}
    for v in completed:
        resp = v.doctor_response.value if v.doctor_response else "لم يتم التقييم"
        response_counts[resp] = response_counts.get(resp, 0) + 1

    # Peak hours
    hour_counts: dict[int, int] = {}
    for v in visits:
        if v.checked_in_at:
            hour_counts[v.checked_in_at.hour] = hour_counts.get(v.checked_in_at.hour, 0) + 1

    peak_hours = sorted(hour_counts.items(), key=lambda x: -x[1])[:5]

    # Rep performance comparison
    rep_stats: dict[str, dict] = {}
    for v in visits:
        rid = v.rep_id
        if rid not in rep_stats:
            rep_stats[rid] = {"id": rid, "total": 0, "completed": 0, "missed": 0, "avg_duration": 0, "durations": []}
        rep_stats[rid]["total"] += 1
        if v.status == VisitStatus.COMPLETED:
            rep_stats[rid]["completed"] += 1
            if v.duration_minutes:
                rep_stats[rid]["durations"].append(v.duration_minutes)
        elif v.status == VisitStatus.MISSED:
            rep_stats[rid]["missed"] += 1

    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(list(rep_stats.keys()))).all()}

    rep_comparison = []
    for rid, s in rep_stats.items():
        u = users_map.get(rid)
        durs = s["durations"]
        rep_comparison.append({
            "id": rid,
            "name": u.full_name if u else "—",
            "total_visits": s["total"],
            "completed": s["completed"],
            "missed": s["missed"],
            "conversion_rate": round(s["completed"] / s["total"] * 100, 1) if s["total"] > 0 else 0,
            "avg_duration": round(sum(durs) / len(durs), 1) if durs else 0,
        })

    rep_comparison.sort(key=lambda x: -x["conversion_rate"])

    # Day of week distribution
    dow_counts: dict[str, int] = {d: 0 for d in ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]}
    dow_names = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
    for v in visits:
        if v.checked_in_at:
            dow_counts[dow_names[v.checked_in_at.weekday()]] += 1

    return {
        "total_visits": total,
        "completed": len(completed),
        "missed": len(missed),
        "conversion_rate": round(conversion_rate, 1),
        "avg_duration_minutes": round(avg_duration, 1),
        "response_breakdown": response_counts,
        "peak_hours": [{"hour": h, "count": c} for h, c in peak_hours],
        "rep_comparison": rep_comparison,
        "day_of_week_distribution": [{"day": d, "count": c} for d, c in dow_counts.items()],
    }