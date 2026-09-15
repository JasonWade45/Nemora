from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, get_current_active_user, get_organization_id, get_current_rep
from app.models.rep_doctor import RepDoctor, InterestLevel
from app.models.doctor import Doctor
from app.models.doctor_specialty import DoctorSpecialty
from app.models.user import User
from app.schemas import (
    DoctorResponse,
    PaginatedResponse,
    RepDoctor as RepDoctorSchema,
)

router = APIRouter(prefix="/my-doctors", tags=["my-doctors"])


@router.get("", response_model=PaginatedResponse)
async def list_my_doctors(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    interest_level: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """List doctors assigned to current rep"""
    query = select(RepDoctor).where(
        and_(RepDoctor.rep_id == current_user.id)
    ).options(
        selectinload(RepDoctor.doctor).selectinload(Doctor.specialty)
    )

    if interest_level:
        query = query.where(RepDoctor.interest_level == InterestLevel(interest_level))

    if search:
        query = query.join(Doctor).where(
            or_(
                Doctor.name.ilike(f"%{search}%"),
                Doctor.clinic_name.ilike(f"%{search}%"),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Paginate
    query = query.order_by(RepDoctor.created_at.desc()).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    rep_doctors = result.scalars().all()

    # Transform to include doctor data with interest level
    items = []
    for rd in rep_doctors:
        doctor_dict = DoctorResponse.model_validate(rd.doctor).model_dump()
        doctor_dict["interest_level"] = rd.interest_level.value
        doctor_dict["rep_notes"] = rd.notes
        items.append(doctor_dict)

    return PaginatedResponse(
        items=items,
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.post("/{doctor_id}", status_code=status.HTTP_201_CREATED)
async def add_to_my_doctors(
    doctor_id: str,
    interest_level: str = "MEDIUM",
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """Add a doctor to my doctors list"""
    # Verify doctor exists and belongs to organization
    result = await db.execute(
        select(Doctor).where(and_(Doctor.id == doctor_id, Doctor.organization_id == org_id))
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Check if already assigned
    result = await db.execute(
        select(RepDoctor).where(
            and_(RepDoctor.rep_id == current_user.id, RepDoctor.doctor_id == doctor_id)
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Doctor already in your list")

    rep_doctor = RepDoctor(
        rep_id=current_user.id,
        doctor_id=doctor_id,
        interest_level=InterestLevel(interest_level),
        notes=notes,
    )
    db.add(rep_doctor)
    await db.commit()
    return {"message": "Doctor added to your list", "doctor_id": doctor_id}


@router.patch("/{doctor_id}")
async def update_my_doctor(
    doctor_id: str,
    interest_level: Optional[str] = None,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """Update my doctor assignment"""
    result = await db.execute(
        select(RepDoctor).where(
            and_(RepDoctor.rep_id == current_user.id, RepDoctor.doctor_id == doctor_id)
        )
    )
    rep_doctor = result.scalar_one_or_none()
    if not rep_doctor:
        raise HTTPException(status_code=404, detail="Doctor not in your list")

    if interest_level:
        rep_doctor.interest_level = InterestLevel(interest_level)
    if notes is not None:
        rep_doctor.notes = notes

    await db.commit()
    return {"message": "Updated successfully"}


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_my_doctors(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """Remove a doctor from my doctors list"""
    result = await db.execute(
        select(RepDoctor).where(
            and_(RepDoctor.rep_id == current_user.id, RepDoctor.doctor_id == doctor_id)
        )
    )
    rep_doctor = result.scalar_one_or_none()
    if not rep_doctor:
        raise HTTPException(status_code=404, detail="Doctor not in your list")

    await db.delete(rep_doctor)
    await db.commit()