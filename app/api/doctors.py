from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from geoalchemy2 import functions as geofunc
from geoalchemy2.shape import to_shape

from app.core.deps import get_db, get_current_active_user, get_organization_id
from app.models.doctor import Doctor, DoctorPriority
from app.models.doctor_specialty import DoctorSpecialty
from app.models.doctor_location import DoctorLocation
from app.models.user import User, UserRole
from app.schemas import (
    DoctorCreate,
    DoctorUpdate,
    DoctorResponse,
    DoctorWithDistance,
    DoctorSpecialtyCreate,
    DoctorSpecialtyResponse,
    DoctorLocationCreate,
    DoctorLocationResponse,
    NearbyDoctorsParams,
    PaginatedResponse,
    PageParams,
)

router = APIRouter(prefix="/doctors", tags=["doctors"])


# Specialty endpoints
@router.post("/specialties", response_model=DoctorSpecialtyResponse)
async def create_specialty(
    specialty: DoctorSpecialtyCreate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new doctor specialty"""
    db_specialty = DoctorSpecialty(name=specialty.name, organization_id=org_id)
    db.add(db_specialty)
    await db.commit()
    await db.refresh(db_specialty)
    return db_specialty


@router.get("/specialties", response_model=List[DoctorSpecialtyResponse])
async def list_specialties(
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """List all specialties for organization"""
    result = await db.execute(
        select(DoctorSpecialty).where(DoctorSpecialty.organization_id == org_id)
    )
    return result.scalars().all()


@router.get("/nearby", response_model=PaginatedResponse)
async def find_nearby_doctors(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_meters: float = Query(50000, gt=0, le=100000),
    specialty_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """
    Find nearby doctors using PostGIS ST_DWithin
    Returns doctors sorted by distance
    """
    # Build base query with PostGIS distance calculation
    point = f"POINT({longitude} {latitude})"

    # Use ST_DWithin for efficient spatial filtering
    query = select(
        Doctor,
        geofunc.ST_Distance(
            Doctor.location,
            func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)::geography
        ).label("distance_meters")
    ).where(
        and_(
            Doctor.organization_id == org_id,
            Doctor.location.is_not(None),
            geofunc.ST_DWithin(
                Doctor.location,
                func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)::geography,
                radius_meters
            )
        )
    ).options(selectinload(Doctor.specialty))

    if specialty_id:
        query = query.where(Doctor.specialty_id == specialty_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Paginate and order by distance
    query = query.order_by("distance_meters").offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rows = result.all()

    doctors = []
    for doctor, distance in rows:
        doctor_dict = {
            "id": doctor.id,
            "name": doctor.name,
            "phone": doctor.phone,
            "email": doctor.email,
            "specialty_id": doctor.specialty_id,
            "sub_specialty": doctor.sub_specialty,
            "gender": doctor.gender,
            "clinic_name": doctor.clinic_name,
            "address": doctor.address,
            "governorate": doctor.governorate,
            "city": doctor.city,
            "latitude": doctor.latitude,
            "longitude": doctor.longitude,
            "priority": doctor.priority.value,
            "organization_id": doctor.organization_id,
            "created_at": doctor.created_at,
            "updated_at": doctor.updated_at,
            "specialty": doctor.specialty,
            "distance_meters": float(distance) if distance else 0,
        }
        doctors.append(DoctorWithDistance(**doctor_dict))

    return PaginatedResponse(
        items=doctors,
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.get("", response_model=PaginatedResponse)
async def list_doctors(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    specialty_id: Optional[str] = None,
    governorate: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """List doctors with filters and pagination"""
    query = select(Doctor).where(Doctor.organization_id == org_id).options(
        selectinload(Doctor.specialty)
    )

    if specialty_id:
        query = query.where(Doctor.specialty_id == specialty_id)
    if governorate:
        query = query.where(Doctor.governorate.ilike(f"%{governorate}%"))
    if priority:
        query = query.where(Doctor.priority == DoctorPriority(priority))
    if search:
        query = query.where(
            or_(
                Doctor.name.ilike(f"%{search}%"),
                Doctor.clinic_name.ilike(f"%{search}%"),
                Doctor.email.ilike(f"%{search}%"),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Paginate
    query = query.order_by(Doctor.name).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    doctors = result.scalars().all()

    return PaginatedResponse(
        items=[DoctorResponse.model_validate(d) for d in doctors],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Get doctor by ID"""
    result = await db.execute(
        select(Doctor)
        .where(and_(Doctor.id == doctor_id, Doctor.organization_id == org_id))
        .options(selectinload(Doctor.specialty), selectinload(Doctor.locations))
    )
    doctor = result.scalar_one_or_none()

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return doctor


@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor(
    doctor: DoctorCreate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new doctor"""
    # Verify specialty belongs to organization
    result = await db.execute(
        select(DoctorSpecialty).where(
            and_(DoctorSpecialty.id == doctor.specialty_id, DoctorSpecialty.organization_id == org_id)
        )
    )
    specialty = result.scalar_one_or_none()
    if not specialty:
        raise HTTPException(status_code=400, detail="Invalid specialty for this organization")

    # Create location point if lat/lng provided
    location = None
    if doctor.latitude is not None and doctor.longitude is not None:
        location = func.ST_SetSRID(func.ST_MakePoint(doctor.longitude, doctor.latitude), 4326)::geography

    db_doctor = Doctor(
        **doctor.model_dump(exclude={"latitude", "longitude"}),
        organization_id=org_id,
        location=location,
    )
    db.add(db_doctor)
    await db.commit()
    await db.refresh(db_doctor)
    return db_doctor


@router.patch("/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: str,
    doctor_update: DoctorUpdate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Update a doctor"""
    result = await db.execute(
        select(Doctor).where(and_(Doctor.id == doctor_id, Doctor.organization_id == org_id))
    )
    db_doctor = result.scalar_one_or_none()

    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    update_data = doctor_update.model_dump(exclude_unset=True, exclude={"latitude", "longitude"})

    # Handle location update
    if doctor_update.latitude is not None and doctor_update.longitude is not None:
        db_doctor.location = func.ST_SetSRID(
            func.ST_MakePoint(doctor_update.longitude, doctor_update.latitude), 4326
        )::geography
        db_doctor.latitude = doctor_update.latitude
        db_doctor.longitude = doctor_update.longitude

    for field, value in update_data.items():
        setattr(db_doctor, field, value)

    await db.commit()
    await db.refresh(db_doctor)
    return db_doctor


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_doctor(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a doctor"""
    result = await db.execute(
        select(Doctor).where(and_(Doctor.id == doctor_id, Doctor.organization_id == org_id))
    )
    db_doctor = result.scalar_one_or_none()

    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    await db.delete(db_doctor)
    await db.commit()


# Doctor Locations
@router.post("/{doctor_id}/locations", response_model=DoctorLocationResponse)
async def add_doctor_location(
    doctor_id: str,
    location: DoctorLocationCreate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Add a location for a doctor"""
    # Verify doctor belongs to organization
    result = await db.execute(
        select(Doctor).where(and_(Doctor.id == doctor_id, Doctor.organization_id == org_id))
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # If this is primary, unset other primary locations
    if location.is_primary:
        await db.execute(
            DoctorLocation.__table__.update()
            .where(and_(DoctorLocation.doctor_id == doctor_id, DoctorLocation.is_primary == True))
            .values(is_primary=False)
        )

    loc = DoctorLocation(
        doctor_id=doctor_id,
        name=location.name,
        address=location.address,
        latitude=location.latitude,
        longitude=location.longitude,
        is_primary=location.is_primary,
    )
    if location.latitude is not None and location.longitude is not None:
        loc.location = func.ST_SetSRID(
            func.ST_MakePoint(location.longitude, location.latitude), 4326
        )::geography

    db.add(loc)
    await db.commit()
    await db.refresh(loc)
    return loc


@router.get("/{doctor_id}/locations", response_model=List[DoctorLocationResponse])
async def list_doctor_locations(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """List all locations for a doctor"""
    result = await db.execute(
        select(DoctorLocation).where(DoctorLocation.doctor_id == doctor_id)
    )
    return result.scalars().all()