from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, get_current_active_user, get_organization_id, get_current_rep
from app.models.target import Target
from app.models.user import User, UserRole
from app.schemas import TargetCreate, TargetUpdate, TargetResponse, PaginatedResponse

router = APIRouter(prefix="/targets", tags=["targets"])


@router.get("", response_model=PaginatedResponse)
async def list_targets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    rep_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """List targets with filters"""
    query = select(Target).where(Target.organization_id == org_id).options(
        selectinload(Target.rep)
    )

    # Role-based filtering
    if current_user.role.value == "MEDICAL_REP":
        query = query.where(Target.rep_id == current_user.id)
    elif rep_id and current_user.role.value in ["ADMIN", "MANAGER"]:
        query = query.where(Target.rep_id == rep_id)

    if month:
        query = query.where(Target.month == month)
    if year:
        query = query.where(Target.year == year)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Paginate
    query = query.order_by(Target.year.desc(), Target.month.desc()).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    targets = result.scalars().all()

    return PaginatedResponse(
        items=[TargetResponse.model_validate(t) for t in targets],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.get("/{target_id}", response_model=TargetResponse)
async def get_target(
    target_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Get target by ID"""
    result = await db.execute(
        select(Target)
        .where(and_(Target.id == target_id, Target.organization_id == org_id))
        .options(selectinload(Target.rep))
    )
    target = result.scalar_one_or_none()

    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    return target


@router.post("", response_model=TargetResponse, status_code=status.HTTP_201_CREATED)
async def create_target(
    target: TargetCreate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new target (Admin/Manager only)"""
    if current_user.role.value not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can create targets")

    # Verify rep exists and belongs to organization
    result = await db.execute(
        select(User).where(and_(User.id == target.rep_id, User.organization_id == org_id))
    )
    rep = result.scalar_one_or_none()
    if not rep:
        raise HTTPException(status_code=400, detail="Invalid rep for this organization")

    # Check if target already exists for this rep/month/year
    result = await db.execute(
        select(Target).where(
            and_(
                Target.rep_id == target.rep_id,
                Target.month == target.month,
                Target.year == target.year,
                Target.organization_id == org_id,
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Target already exists for this rep for {target.month}/{target.year}",
        )

    db_target = Target(**target.model_dump(), organization_id=org_id)
    db.add(db_target)
    await db.commit()
    await db.refresh(db_target)
    return db_target


@router.patch("/{target_id}", response_model=TargetResponse)
async def update_target(
    target_id: str,
    target_update: TargetUpdate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Update a target"""
    if current_user.role.value not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can update targets")

    result = await db.execute(
        select(Target).where(and_(Target.id == target_id, Target.organization_id == org_id))
    )
    db_target = result.scalar_one_or_none()

    if not db_target:
        raise HTTPException(status_code=404, detail="Target not found")

    update_data = target_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_target, field, value)

    await db.commit()
    await db.refresh(db_target)
    return db_target


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_target(
    target_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a target"""
    if current_user.role.value not in ["ADMIN", "MANAGER"]:
        raise HTTPException(status_code=403, detail="Only admins and managers can delete targets")

    result = await db.execute(
        select(Target).where(and_(Target.id == target_id, Target.organization_id == org_id))
    )
    db_target = result.scalar_one_or_none()

    if not db_target:
        raise HTTPException(status_code=404, detail="Target not found")

    await db.delete(db_target)
    await db.commit()


@router.get("/rep/{rep_id}/current", response_model=Optional[TargetResponse])
async def get_current_month_target(
    rep_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Get current month's target for a rep"""
    now = datetime.utcnow()
    result = await db.execute(
        select(Target)
        .where(
            and_(
                Target.rep_id == rep_id,
                Target.month == now.month,
                Target.year == now.year,
                Target.organization_id == org_id,
            )
        )
        .options(selectinload(Target.rep))
    )
    return result.scalar_one_or_none()