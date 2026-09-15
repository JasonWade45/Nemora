from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.models.product import Product
from app.models.user import User
from app.modules.audit.service import create_audit_log
from app.schemas.product import (
    ProductCreateRequest,
    ProductListResponse,
    ProductResponse,
    ProductUpdateRequest,
)

router = APIRouter(prefix="/products", tags=["products"])


def _product_to_response(db: Session, product: Product) -> ProductResponse:
    owner = db.query(User).filter(User.id == product.owner_user_id).first()
    assigned = None
    if product.assigned_to_user_id:
        assigned = db.query(User).filter(User.id == product.assigned_to_user_id).first()

    return ProductResponse(
        id=product.id,
        organization_id=product.organization_id,
        owner_user_id=product.owner_user_id,
        owner_name=owner.full_name if owner else None,
        assigned_to_user_id=product.assigned_to_user_id,
        assigned_to_name=assigned.full_name if assigned else None,
        visible_to_all=product.visible_to_all,
        name=product.name,
        generic_name=product.generic_name,
        category=product.category,
        description=product.description,
        dosage_info=product.dosage_info,
        image_url=product.image_url,
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.get("", response_model=ProductListResponse)
def list_products(
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    only_active: bool = Query(default=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    q = db.query(Product).filter(Product.organization_id == current_user.organization_id)

    if current_user.role.value == Role.MEDICAL_REP.value:
        q = q.filter(
            or_(
                Product.owner_user_id == current_user.id,
                Product.visible_to_all == True,
                Product.assigned_to_user_id == current_user.id,
            )
        )

    if only_active:
        q = q.filter(Product.is_active == True)

    if category:
        q = q.filter(Product.category == category)

    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Product.name.ilike(term),
                Product.generic_name.ilike(term),
                Product.category.ilike(term),
            )
        )

    products = q.order_by(Product.created_at.desc()).all()
    return ProductListResponse(
        items=[_product_to_response(db, p) for p in products],
        total=len(products),
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    # Reps can only create for themselves
    if current_user.role.value == Role.MEDICAL_REP.value:
        if payload.visible_to_all or payload.assigned_to_user_id:
            raise HTTPException(
                status_code=403,
                detail="Medical reps can only create personal products",
            )
        visible_to_all = False
        assigned_to_user_id = None
    else:
        visible_to_all = payload.visible_to_all
        assigned_to_user_id = payload.assigned_to_user_id
        # If assigned to someone, verify they exist in same org
        if assigned_to_user_id:
            target = db.query(User).filter(
                User.id == assigned_to_user_id,
                User.organization_id == current_user.organization_id,
            ).first()
            if not target:
                raise HTTPException(status_code=404, detail="Target user not found")

    product = Product(
        organization_id=current_user.organization_id,
        owner_user_id=current_user.id,
        assigned_to_user_id=assigned_to_user_id,
        visible_to_all=visible_to_all,
        name=payload.name.strip(),
        generic_name=payload.generic_name,
        category=payload.category,
        description=payload.description,
        dosage_info=payload.dosage_info,
        image_url=payload.image_url,is_active=True,
    )
    db.add(product)
    db.flush()

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="PRODUCT_CREATED",
        entity="Product",
        entity_id=product.id,
        metadata={"name": product.name, "visible_to_all": visible_to_all},
    )

    db.commit()
    db.refresh(product)
    return _product_to_response(db, product)


@router.get("/categories", response_model=list[str])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    q = db.query(Product.category).filter(
        Product.organization_id == current_user.organization_id,
        Product.category.isnot(None),
    )
    if current_user.role.value == Role.MEDICAL_REP.value:
        q = q.filter(
            or_(
                Product.owner_user_id == current_user.id,
                Product.visible_to_all == True,
                Product.assigned_to_user_id == current_user.id,
            )
        )
    rows = q.distinct().all()
    return sorted([r[0] for r in rows if r[0]])


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == current_user.organization_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if current_user.role.value == Role.MEDICAL_REP.value:
        if not (
            product.owner_user_id == current_user.id
            or product.visible_to_all
            or product.assigned_to_user_id == current_user.id
        ):
            raise HTTPException(status_code=403, detail="Not allowed")

    return _product_to_response(db, product)


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    payload: ProductUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == current_user.organization_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if current_user.role.value == Role.MEDICAL_REP.value:
        if product.owner_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Can only edit your own products")

    updates = payload.model_dump(exclude_none=True)
    for k, v in updates.items():
        setattr(product, k, v)

    db.commit()
    db.refresh(product)
    return _product_to_response(db, product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == current_user.organization_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if current_user.role.value == Role.MEDICAL_REP.value:
        if product.owner_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Can only delete your own products")

    product.is_active = False
    db.commit()
    return None