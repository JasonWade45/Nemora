from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from geoalchemy2 import functions as geofunc

from app.core.deps import get_db, get_current_active_user, get_organization_id, get_current_rep
from app.models.visit import Visit, VisitPurpose, VisitStatus, DoctorResponse
from app.models.visit_product import VisitProduct
from app.models.doctor import Doctor
from app.models.doctor_location import DoctorLocation
from app.models.product import Product
from app.models.user import User
from app.schemas import (
    VisitCreate,
    VisitUpdate,
    VisitResponse,
    VisitCheckIn,
    VisitCheckOut,
    VisitProductCreate,
    VisitProductResponse,
    PaginatedResponse,
    PageParams,
)

router = APIRouter(prefix="/visits", tags=["visits"])


@router.get("", response_model=PaginatedResponse)
async def list_visits(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    doctor_id: Optional[str] = None,
    rep_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """List visits with filters"""
    query = select(Visit).where(Visit.organization_id == org_id).options(
        selectinload(Visit.doctor).selectinload(Doctor.specialty),
        selectinload(Visit.rep),
        selectinload(Visit.doctor_location),
        selectinload(Visit.visit_products).selectinload(VisitProduct.product),
    )

    # Role-based filtering
    if current_user.role.value == "MEDICAL_REP":
        query = query.where(Visit.rep_id == current_user.id)
    elif rep_id and current_user.role.value in ["ADMIN", "MANAGER"]:
        query = query.where(Visit.rep_id == rep_id)

    if status:
        query = query.where(Visit.status == VisitStatus(status))
    if doctor_id:
        query = query.where(Visit.doctor_id == doctor_id)
    if start_date:
        query = query.where(Visit.created_at >= start_date)
    if end_date:
        query = query.where(Visit.created_at <= end_date)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Paginate
    query = query.order_by(Visit.created_at.desc()).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    visits = result.scalars().all()

    return PaginatedResponse(
        items=[VisitResponse.model_validate(v) for v in visits],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.get("/{visit_id}", response_model=VisitResponse)
async def get_visit(
    visit_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Get visit by ID"""
    query = select(Visit).where(
        and_(Visit.id == visit_id, Visit.organization_id == org_id)
    ).options(
        selectinload(Visit.doctor).selectinload(Doctor.specialty),
        selectinload(Visit.rep),
        selectinload(Visit.doctor_location),
        selectinload(Visit.visit_products).selectinload(VisitProduct.product),
    )

    result = await db.execute(query)
    visit = result.scalar_one_or_none()

    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    # Check permissions
    if current_user.role.value == "MEDICAL_REP" and visit.rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this visit")

    return visit


@router.post("", response_model=VisitResponse, status_code=status.HTTP_201_CREATED)
async def create_visit(
    visit: VisitCreate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """Create a new visit (planned)"""
    # Verify doctor belongs to organization
    result = await db.execute(
        select(Doctor).where(and_(Doctor.id == visit.doctor_id, Doctor.organization_id == org_id))
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=400, detail="Doctor not found")

    # If rep_id not provided, use current user
    rep_id = visit.rep_id if current_user.role.value in ["ADMIN", "MANAGER"] else current_user.id

    # Verify rep belongs to organization
    result = await db.execute(
        select(User).where(and_(User.id == rep_id, User.organization_id == org_id))
    )
    rep = result.scalar_one_or_none()
    if not rep:
        raise HTTPException(status_code=400, detail="Invalid rep for this organization")

    db_visit = Visit(
        rep_id=rep_id,
        doctor_id=visit.doctor_id,
        doctor_location_id=visit.doctor_location_id,
        visit_purpose=VisitPurpose(visit.visit_purpose),
        status=VisitStatus(visit.status),
        planned_at=visit.planned_at,
        notes=visit.notes,
        next_follow_up_date=visit.next_follow_up_date,
        next_follow_up_type=visit.next_follow_up_type,
        next_follow_up_notes=visit.next_follow_up_notes,
        organization_id=org_id,
    )
    db.add(db_visit)
    await db.commit()
    await db.refresh(db_visit)
    return db_visit


@router.patch("/{visit_id}", response_model=VisitResponse)
async def update_visit(
    visit_id: str,
    visit_update: VisitUpdate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Update a visit"""
    result = await db.execute(
        select(Visit).where(and_(Visit.id == visit_id, Visit.organization_id == org_id))
    )
    db_visit = result.scalar_one_or_none()

    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    # Check permissions
    if current_user.role.value == "MEDICAL_REP" and db_visit.rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this visit")

    update_data = visit_update.model_dump(exclude_unset=True)

    # Handle enum conversions
    if "visit_purpose" in update_data:
        update_data["visit_purpose"] = VisitPurpose(update_data["visit_purpose"])
    if "status" in update_data:
        update_data["status"] = VisitStatus(update_data["status"])
    if "doctor_response" in update_data:
        update_data["doctor_response"] = DoctorResponse(update_data["doctor_response"])

    for field, value in update_data.items():
        setattr(db_visit, field, value)

    await db.commit()
    await db.refresh(db_visit)
    return db_visit


@router.post("/{visit_id}/check-in", response_model=VisitResponse)
async def check_in(
    visit_id: str,
    check_in: VisitCheckIn,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """
    GPS-verified check-in for a visit.
    Validates that the rep is within the allowed radius of the doctor's location.
    """
    result = await db.execute(
        select(Visit)
        .where(and_(Visit.id == visit_id, Visit.organization_id == org_id))
        .options(selectinload(Visit.doctor).selectinload(Doctor.locations))
    )
    visit = result.scalar_one_or_none()

    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    # Check permissions
    if current_user.role.value == "MEDICAL_REP" and visit.rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this visit")

    if visit.status not in [VisitStatus.PLANNED, VisitStatus.CHECKED_IN]:
        raise HTTPException(status_code=400, detail="Visit cannot be checked in")

    # Get doctor's primary location or first location
    doctor_location = None
    if visit.doctor_location_id:
        result = await db.execute(
            select(DoctorLocation).where(DoctorLocation.id == visit.doctor_location_id)
        )
        doctor_location = result.scalar_one_or_none()
    else:
        # Use primary location
        for loc in visit.doctor.locations:
            if loc.is_primary:
                doctor_location = loc
                break
        if not doctor_location and visit.doctor.locations:
            doctor_location = visit.doctor.locations[0]

    if not doctor_location or not doctor_location.location:
        raise HTTPException(
            status_code=400,
            detail="Doctor location not available for GPS verification",
        )

    # Calculate distance using PostGIS
    rep_point = func.ST_SetSRID(
        func.ST_MakePoint(check_in.longitude, check_in.latitude), 4326
    )::geography

    distance_query = select(
        geofunc.ST_Distance(doctor_location.location, rep_point)
    )
    distance_result = await db.execute(distance_query)
    distance_meters = distance_result.scalar()

    if distance_meters is None:
        raise HTTPException(status_code=500, detail="Failed to calculate distance")

    # Get allowed radius from organization settings (default 200m)
    allowed_radius = 200  # meters - could be fetched from organization settings

    is_verified = distance_meters <= allowed_radius

    # Update visit
    visit.status = VisitStatus.CHECKED_IN
    visit.checked_in_at = datetime.utcnow()
    visit.checkin_latitude = check_in.latitude
    visit.checkin_longitude = check_in.longitude
    visit.distance_from_doctor = float(distance_meters)
    visit.is_verified = is_verified
    visit.doctor_location_id = doctor_location.id

    await db.commit()
    await db.refresh(visit)

    # Log audit
    from app.models.audit_log import AuditLog
    audit = AuditLog(
        user_id=current_user.id,
        action="VISIT_CHECK_IN",
        entity="visit",
        entity_id=visit.id,
        metadata={
            "distance_meters": float(distance_meters),
            "is_verified": is_verified,
            "allowed_radius": allowed_radius,
            "doctor_location_id": doctor_location.id,
        },
        organization_id=org_id,
    )
    db.add(audit)
    await db.commit()

    return visit


@router.post("/{visit_id}/check-out", response_model=VisitResponse)
async def check_out(
    visit_id: str,
    check_out: VisitCheckOut,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """Check out from a visit with GPS verification"""
    result = await db.execute(
        select(Visit).where(and_(Visit.id == visit_id, Visit.organization_id == org_id))
    )
    visit = result.scalar_one_or_none()

    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    if current_user.role.value == "MEDICAL_REP" and visit.rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this visit")

    if visit.status != VisitStatus.CHECKED_IN:
        raise HTTPException(status_code=400, detail="Visit must be checked in first")

    # Calculate distance from doctor location
    if visit.doctor_location_id:
        result = await db.execute(
            select(DoctorLocation).where(DoctorLocation.id == visit.doctor_location_id)
        )
        doctor_location = result.scalar_one_or_none()

        if doctor_location and doctor_location.location:
            rep_point = func.ST_SetSRID(
                func.ST_MakePoint(check_out.longitude, check_out.latitude), 4326
            )::geography

            distance_query = select(
                geofunc.ST_Distance(doctor_location.location, rep_point)
            )
            distance_result = await db.execute(distance_query)
            distance_meters = distance_result.scalar()

            # Use check-in distance if available, otherwise calculate
            if distance_meters is not None:
                visit.distance_from_doctor = float(distance_meters)

    # Update visit
    visit.status = VisitStatus.COMPLETED
    visit.checked_out_at = datetime.utcnow()
    visit.checkout_latitude = check_out.latitude
    visit.checkout_longitude = check_out.longitude
    visit.duration_minutes = int(
        (visit.checked_out_at - visit.checked_in_at).total_seconds() / 60
    ) if visit.checked_in_at else None
    visit.notes = check_out.notes
    visit.doctor_response = DoctorResponse(check_out.doctor_response) if check_out.doctor_response else None
    visit.next_follow_up_date = check_out.next_follow_up_date
    visit.next_follow_up_type = check_out.next_follow_up_type
    visit.next_follow_up_notes = check_out.next_follow_up_notes

    await db.commit()
    await db.refresh(visit)

    # Log audit
    from app.models.audit_log import AuditLog
    audit = AuditLog(
        user_id=current_user.id,
        action="VISIT_CHECK_OUT",
        entity="visit",
        entity_id=visit.id,
        metadata={
            "duration_minutes": visit.duration_minutes,
            "doctor_response": check_out.doctor_response,
        },
        organization_id=org_id,
    )
    db.add(audit)
    await db.commit()

    return visit


@router.post("/{visit_id}/products", response_model=VisitProductResponse)
async def add_visit_product(
    visit_id: str,
    product: VisitProductCreate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """Add a product discussed during visit"""
    result = await db.execute(
        select(Visit).where(and_(Visit.id == visit_id, Visit.organization_id == org_id))
    )
    visit = result.scalar_one_or_none()

    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    if current_user.role.value == "MEDICAL_REP" and visit.rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this visit")

    # Verify product exists and belongs to organization
    result = await db.execute(
        select(Product).where(and_(Product.id == product.product_id, Product.organization_id == org_id))
    )
    db_product = result.scalar_one_or_none()
    if not db_product:
        raise HTTPException(status_code=400, detail="Product not found")

    # Check if already added
    result = await db.execute(
        select(VisitProduct).where(
            and_(VisitProduct.visit_id == visit_id, VisitProduct.product_id == product.product_id)
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Product already added to visit")

    visit_product = VisitProduct(visit_id=visit_id, product_id=product.product_id)
    db.add(visit_product)
    await db.commit()
    await db.refresh(visit_product)
    return visit_product


@router.delete("/{visit_id}/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_visit_product(
    visit_id: str,
    product_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """Remove a product from visit"""
    result = await db.execute(
        select(VisitProduct).where(
            and_(VisitProduct.visit_id == visit_id, VisitProduct.product_id == product_id)
        )
    )
    visit_product = result.scalar_one_or_none()

    if not visit_product:
        raise HTTPException(status_code=404, detail="Product not found in visit")

    await db.delete(visit_product)
    await db.commit()