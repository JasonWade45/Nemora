from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, get_current_active_user, get_organization_id, get_current_rep
from app.models.follow_up import FollowUp, FollowUpActionType, FollowUpStatus
from app.models.doctor import Doctor
from app.models.user import User
from app.schemas import FollowUpCreate, FollowUpUpdate, FollowUpResponse, PaginatedResponse

router = APIRouter(prefix="/follow-ups", tags=["follow-ups"])


@router.get("", response_model=PaginatedResponse)
async def list_follow_ups(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    doctor_id: Optional[str] = None,
    rep_id: Optional[str] = None,
    due_before: Optional[datetime] = None,
    due_after: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """List follow-ups with filters"""
    query = select(FollowUp).where(FollowUp.organization_id == org_id).options(
        selectinload(FollowUp.doctor).selectinload(Doctor.specialty),
        selectinload(FollowUp.rep),
        selectinload(FollowUp.visit),
    )

    # Role-based filtering
    if current_user.role.value == "MEDICAL_REP":
        query = query.where(FollowUp.rep_id == current_user.id)
    elif rep_id and current_user.role.value in ["ADMIN", "MANAGER"]:
        query = query.where(FollowUp.rep_id == rep_id)

    if status:
        query = query.where(FollowUp.status == FollowUpStatus(status))
    if doctor_id:
        query = query.where(FollowUp.doctor_id == doctor_id)
    if due_before:
        query = query.where(FollowUp.due_date <= due_before)
    if due_after:
        query = query.where(FollowUp.due_date >= due_after)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Paginate
    query = query.order_by(FollowUp.due_date).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    follow_ups = result.scalars().all()

    return PaginatedResponse(
        items=[FollowUpResponse.model_validate(f) for f in follow_ups],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.get("/overdue", response_model=List[FollowUpResponse])
async def get_overdue_follow_ups(
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """Get overdue follow-ups for current rep"""
    result = await db.execute(
        select(FollowUp)
        .where(
            and_(
                FollowUp.rep_id == current_user.id,
                FollowUp.organization_id == org_id,
                FollowUp.status == FollowUpStatus.PENDING,
                FollowUp.due_date < datetime.utcnow(),
            )
        )
        .options(
            selectinload(FollowUp.doctor).selectinload(Doctor.specialty),
        )
        .order_by(FollowUp.due_date)
    )
    return result.scalars().all()


@router.get("/{follow_up_id}", response_model=FollowUpResponse)
async def get_follow_up(
    follow_up_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Get follow-up by ID"""
    query = select(FollowUp).where(
        and_(FollowUp.id == follow_up_id, FollowUp.organization_id == org_id)
    ).options(
        selectinload(FollowUp.doctor).selectinload(Doctor.specialty),
        selectinload(FollowUp.rep),
        selectinload(FollowUp.visit),
    )

    result = await db.execute(query)
    follow_up = result.scalar_one_or_none()

    if not follow_up:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    if current_user.role.value == "MEDICAL_REP" and follow_up.rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this follow-up")

    return follow_up


@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
async def create_follow_up(
    follow_up: FollowUpCreate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """Create a new follow-up"""
    # Verify doctor exists and belongs to organization
    result = await db.execute(
        select(Doctor).where(and_(Doctor.id == follow_up.doctor_id, Doctor.organization_id == org_id))
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=400, detail="Doctor not found")

    # If rep_id not provided, use current user
    rep_id = follow_up.rep_id if current_user.role.value in ["ADMIN", "MANAGER"] else current_user.id

    # Verify rep belongs to organization
    result = await db.execute(
        select(User).where(and_(User.id == rep_id, User.organization_id == org_id))
    )
    rep = result.scalar_one_or_none()
    if not rep:
        raise HTTPException(status_code=400, detail="Invalid rep for this organization")

    db_follow_up = FollowUp(
        rep_id=rep_id,
        doctor_id=follow_up.doctor_id,
        visit_id=follow_up.visit_id,
        due_date=follow_up.due_date,
        action_type=FollowUpActionType(follow_up.action_type),
        notes=follow_up.notes,
        status=FollowUpStatus(follow_up.status),
        organization_id=org_id,
    )
    db.add(db_follow_up)
    await db.commit()
    await db.refresh(db_follow_up)
    return db_follow_up


@router.patch("/{follow_up_id}", response_model=FollowUpResponse)
async def update_follow_up(
    follow_up_id: str,
    follow_up_update: FollowUpUpdate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Update a follow-up"""
    result = await db.execute(
        select(FollowUp).where(and_(FollowUp.id == follow_up_id, FollowUp.organization_id == org_id))
    )
    db_follow_up = result.scalar_one_or_none()

    if not db_follow_up:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    if current_user.role.value == "MEDICAL_REP" and db_follow_up.rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this follow-up")

    update_data = follow_up_update.model_dump(exclude_unset=True)

    # Handle enum conversions
    if "action_type" in update_data:
        update_data["action_type"] = FollowUpActionType(update_data["action_type"])
    if "status" in update_data:
        update_data["status"] = FollowUpStatus(update_data["status"])

    # If marking completed, set completed_at
    if update_data.get("status") == FollowUpStatus.COMPLETED and db_follow_up.status != FollowUpStatus.COMPLETED:
        db_follow_up.completed_at = datetime.utcnow()

    for field, value in update_data.items():
        setattr(db_follow_up, field, value)

    await db.commit()
    await db.refresh(db_follow_up)
    return db_follow_up


@router.post("/{follow_up_id}/complete", response_model=FollowUpResponse)
async def complete_follow_up(
    follow_up_id: str,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_rep),
):
    """Mark follow-up as completed"""
    result = await db.execute(
        select(FollowUp).where(and_(FollowUp.id == follow_up_id, FollowUp.organization_id == org_id))
    )
    follow_up = result.scalar_one_or_none()

    if not follow_up:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    if current_user.role.value == "MEDICAL_REP" and follow_up.rep_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    follow_up.status = FollowUpStatus.COMPLETED
    follow_up.completed_at = datetime.utcnow()
    if notes:
        follow_up.notes = (follow_up.notes or "") + f"\n[Completed]: {notes}"

    await db.commit()
    await db.refresh(follow_up)
    return follow_up


@router.delete("/{follow_up_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_follow_up(
    follow_up_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a follow-up"""
    if current_user.role.value not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can delete follow-ups")

    result = await db.execute(
        select(FollowUp).where(and_(FollowUp.id == follow_up_id, FollowUp.organization_id == org_id))
    )
    follow_up = result.scalar_one_or_none()

    if not follow_up:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    await db.delete(follow_up)
    await db.commit()