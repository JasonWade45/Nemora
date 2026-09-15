from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, get_current_active_user, get_organization_id
from app.models.product import Product
from app.schemas import ProductCreate, ProductUpdate, ProductResponse, PaginatedResponse

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=PaginatedResponse)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """List products with filters"""
    query = select(Product).where(Product.organization_id == org_id)

    if category:
        query = query.where(Product.category == category)
    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    if search:
        query = query.where(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.generic_name.ilike(f"%{search}%"),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Paginate
    query = query.order_by(Product.name).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    products = result.scalars().all()

    return PaginatedResponse(
        items=[ProductResponse.model_validate(p) for p in products],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size if total else 0,
    )


@router.get("/categories", response_model=List[str])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """List all unique product categories"""
    result = await db.execute(
        select(Product.category)
        .where(and_(Product.organization_id == org_id, Product.category.is_not(None)))
        .distinct()
    )
    return [c for c in result.scalars().all() if c]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Get product by ID"""
    result = await db.execute(
        select(Product).where(and_(Product.id == product_id, Product.organization_id == org_id))
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new product (Admin only)"""
    if current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can create products")

    db_product = Product(**product.model_dump(), organization_id=org_id)
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    return db_product


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Update a product"""
    if current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can update products")

    result = await db.execute(
        select(Product).where(and_(Product.id == product_id, Product.organization_id == org_id))
    )
    db_product = result.scalar_one_or_none()

    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)

    await db.commit()
    await db.refresh(db_product)
    return db_product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a product (soft delete - set inactive)"""
    if current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can delete products")

    result = await db.execute(
        select(Product).where(and_(Product.id == product_id, Product.organization_id == org_id))
    )
    db_product = result.scalar_one_or_none()

    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    db_product.is_active = False
    await db.commit()