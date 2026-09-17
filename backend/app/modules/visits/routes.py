from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.core.rbac import Role
from app.core.visibility import get_visible_user_ids
from app.models.doctor import Doctor
from app.models.enums import DoctorStatus
from app.models.organization import Organization
from app.models.product import Product
from app.models.user import User, UserRole
from app.models.visit import DoctorResponse, Visit, VisitPurpose, VisitStatus
from app.models.visit_product import VisitProduct
from app.modules.audit.service import create_audit_log
from app.modules.tracking.service import get_active_shift
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
    sql = text("""
        SELECT ST_Distance(
            ST_SetSRID(ST_MakePoint(:lng1, :lat1), 4326)::geography,
            ST_SetSRID(ST_MakePoint(:lng2, :lat2), 4326)::geography
        )
    """)
    result = db.execute(sql, {"lat1": lat1, "lng1": lng1, "lat2": lat2, "lng2": lng2}).scalar()
    return float(result or 0)


def _visit_to_response(db: Session, visit: Visit) -> VisitResponse:
    vps = db.query(VisitProduct).filter(VisitProduct.visit_id == visit.id).all()
    product_ids = [vp.product_id for vp in vps]
    products_list = []
    if product_ids:
        prods = db.query(Product).filter(Product.id.in_(product_ids)).all()
        products_list = [{"id": p.id, "name": p.name, "category": p.category} for p in prods]

    doctor = db.query(Doctor).filter(Doctor.id == visit.doctor_id).first()
    rep = db.query(User).filter(User.id == visit.rep_id).first()

    return VisitResponse(
        id=visit.id,
        organization_id=visit.organization_id,
        rep_id=visit.rep_id,
        rep_name=rep.full_name if rep else None,
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
        feedback_positive=getattr(visit, "feedback_positive", None),
        feedback_objections=getattr(visit, "feedback_objections", None),
        feedback_next_steps=getattr(visit, "feedback_next_steps", None),
        feedback_overall=getattr(visit, "feedback_overall", None),
        report_sent_to_admin_at=getattr(visit, "report_sent_to_admin_at", None),
        report_forwarded_to_manager_at=getattr(visit, "report_forwarded_to_manager_at", None),
        admin_notes=getattr(visit, "admin_notes", None),
        products=products_list,
        created_at=visit.created_at,
        updated_at=visit.updated_at,
    )


@router.get("", response_model=VisitListResponse)
def list_visits(
    status_filter: VisitStatus | None = Query(default=None, alias="status"),
    doctor_id: str | None = Query(default=None),
    rep_id: str | None = Query(default=None),
    date_from: str | None = Query(default=None, description="YYYY-MM-DD"),
    date_to: str | None = Query(default=None, description="YYYY-MM-DD"),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    visible = get_visible_user_ids(db, current_user)
    q = db.query(Visit).filter(
        Visit.organization_id == current_user.organization_id,
        Visit.rep_id.in_(visible),
    )

    if status_filter:
        q = q.filter(Visit.status == status_filter)
    if doctor_id:
        q = q.filter(Visit.doctor_id == doctor_id)
    if rep_id:
        q = q.filter(Visit.rep_id == rep_id)
    if date_from:
        try:
            d = datetime.strptime(date_from, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            q = q.filter(Visit.created_at >= d)
        except ValueError:
            pass
    if date_to:
        try:
            d = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            q = q.filter(Visit.created_at <= d)
        except ValueError:
            pass

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
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
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

    visible = get_visible_user_ids(db, current_user)
    if visit.rep_id not in visible:
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

    # Check for active shift
    shift = get_active_shift(db, current_user.id)
    if not shift:
        raise HTTPException(status_code=400, detail="يجب بدء الشفت أولاً قبل تسجيل أي زيارة")

    doctor = db.query(Doctor).filter(Doctor.id == visit.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    distance = None
    verified = False
    if doctor.latitude is not None and doctor.longitude is not None:
        distance = _distance_meters(db, payload.latitude, payload.longitude, doctor.latitude, doctor.longitude)
        radius = _get_org_setting(db, current_user.organization_id, "check_in_radius_meters", 100)
        verified = distance <= radius

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
    if payload.feedback_positive:
        visit.feedback_positive = payload.feedback_positive
    if payload.feedback_objections:
        visit.feedback_objections = payload.feedback_objections
    if payload.feedback_next_steps:
        visit.feedback_next_steps = payload.feedback_next_steps
    if payload.feedback_overall:
        visit.feedback_overall = payload.feedback_overall

    # Auto-send report to admin on completion
    if payload.send_to_admin:
        visit.report_sent_to_admin_at = now

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="VISIT_CHECKED_OUT",
        entity="Visit",
        entity_id=visit.id,
        metadata={"duration_minutes": visit.duration_minutes, "sent_to_admin": payload.send_to_admin},
    )

    db.commit()
    db.refresh(visit)
    return _visit_to_response(db, visit)


@router.post("/{visit_id}/send-to-admin", response_model=VisitResponse)
def send_to_admin(
    visit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
):
    visit = db.query(Visit).filter(
        Visit.id == visit_id,
        Visit.rep_id == current_user.id,
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit.status != VisitStatus.COMPLETED:
        raise HTTPException(status_code=409, detail="Visit not completed")

    visit.report_sent_to_admin_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(visit)
    return _visit_to_response(db, visit)


@router.post("/{visit_id}/forward-to-manager", response_model=VisitResponse)
def forward_to_manager(
    visit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
):
    visit = db.query(Visit).filter(
        Visit.id == visit_id,
        Visit.organization_id == current_user.organization_id,
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    visible = get_visible_user_ids(db, current_user)
    if visit.rep_id not in visible:
        raise HTTPException(status_code=403, detail="Not allowed")

    if not visit.report_sent_to_admin_at and current_user.role == UserRole.ADMIN:
        raise HTTPException(status_code=409, detail="Report not sent by rep yet")

    visit.report_forwarded_to_manager_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(visit)
    return _visit_to_response(db, visit)


@router.patch("/{visit_id}/admin-notes", response_model=VisitResponse)
def update_admin_notes(
    visit_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
):
    visit = db.query(Visit).filter(
        Visit.id == visit_id,
        Visit.organization_id == current_user.organization_id,
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    visible = get_visible_user_ids(db, current_user)
    if visit.rep_id not in visible:
        raise HTTPException(status_code=403, detail="Not allowed")

    visit.admin_notes = payload.get("admin_notes") or ""
    db.commit()
    db.refresh(visit)
    return _visit_to_response(db, visit)


@router.patch("/{visit_id}", response_model=VisitResponse)
def update_visit(
    visit_id: str,
    payload: VisitUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
):
    visit = (
        db.query(Visit)
        .filter(Visit.id == visit_id, Visit.organization_id == current_user.organization_id)
        .first()
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit.rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your visit")

    updates = payload.model_dump(exclude_none=True)
    for k, v in updates.items():
        setattr(visit, k, v)

    db.commit()
    db.refresh(visit)
    return _visit_to_response(db, visit)


@router.post("/{visit_id}/products/{product_id}", response_model=VisitResponse)
def add_product_to_visit(
    visit_id: str,
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
):
    visit = db.query(Visit).filter(
        Visit.id == visit_id,
        Visit.rep_id == current_user.id,
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == current_user.organization_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.query(VisitProduct).filter(
        VisitProduct.visit_id == visit_id,
        VisitProduct.product_id == product_id,
    ).first()
    if not existing:
        vp = VisitProduct(visit_id=visit_id, product_id=product_id)
        db.add(vp)
        db.commit()

    db.refresh(visit)
    return _visit_to_response(db, visit)


@router.delete("/{visit_id}/products/{product_id}", response_model=VisitResponse)
def remove_product_from_visit(
    visit_id: str,
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.MEDICAL_REP)),
):
    visit = db.query(Visit).filter(
        Visit.id == visit_id,
        Visit.rep_id == current_user.id,
    ).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    vp = db.query(VisitProduct).filter(
        VisitProduct.visit_id == visit_id,
        VisitProduct.product_id == product_id,
    ).first()
    if vp:
        db.delete(vp)
        db.commit()

    db.refresh(visit)
    return _visit_to_response(db, visit)