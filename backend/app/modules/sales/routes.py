from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.core.visibility import get_visible_user_ids
from app.models.doctor import Doctor
from app.models.product import Product
from app.models.sale import Sale, SaleStatus
from app.models.user import User
from app.modules.audit.service import create_audit_log
from app.schemas.sale import (
    SaleCreateRequest,
    SaleListResponse,
    SaleResponse,
    SaleUpdateRequest,
)

router = APIRouter(prefix="/sales", tags=["sales"])


def _sale_to_response(db: Session, sale: Sale) -> SaleResponse:
    rep = db.query(User).filter(User.id == sale.rep_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == sale.doctor_id).first()
    product = db.query(Product).filter(Product.id == sale.product_id).first()

    return SaleResponse(
        id=sale.id,
        organization_id=sale.organization_id,
        rep_id=sale.rep_id,
        rep_name=rep.full_name if rep else None,
        doctor_id=sale.doctor_id,
        doctor_name=doctor.full_name if doctor else None,
        doctor_specialty=doctor.specialty if doctor else None,
        doctor_area=doctor.area if doctor else None,
        product_id=sale.product_id,
        product_name=product.name if product else None,
        product_category=product.category if product else None,
        visit_id=sale.visit_id,
        quantity=sale.quantity,
        unit_price=sale.unit_price,
        unit_cost=sale.unit_cost,
        total_price=sale.total_price,
        total_cost=sale.total_cost,
        profit=sale.profit,
        status=sale.status.value if hasattr(sale.status, "value") else sale.status,
        notes=sale.notes,
        sold_at=sale.sold_at,
        created_at=sale.created_at,
    )


@router.get("", response_model=SaleListResponse)
def list_sales(
    days: int | None = Query(default=None, ge=1, le=365),
    doctor_id: str | None = Query(default=None),
    product_id: str | None = Query(default=None),
    rep_id: str | None = Query(default=None),
    sale_status: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    visible = get_visible_user_ids(db, current_user)
    q = db.query(Sale).filter(
        Sale.organization_id == current_user.organization_id,
        Sale.rep_id.in_(visible),
    )

    if days:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        q = q.filter(Sale.sold_at >= since)
    if doctor_id:
        q = q.filter(Sale.doctor_id == doctor_id)
    if product_id:
        q = q.filter(Sale.product_id == product_id)
    if rep_id:
        q = q.filter(Sale.rep_id == rep_id)
    if sale_status:
        try:
            status_enum = SaleStatus(sale_status)
            q = q.filter(Sale.status == status_enum)
        except ValueError:
            pass

    sales = q.order_by(Sale.sold_at.desc()).limit(limit).all()
    total = q.count()

    total_revenue = sum(s.total_price for s in sales)
    total_cost = sum(s.total_cost for s in sales)
    total_profit = sum(s.profit for s in sales)

    return SaleListResponse(
        items=[_sale_to_response(db, s) for s in sales],
        total=total,
        total_revenue=round(total_revenue, 2),
        total_cost=round(total_cost, 2),
        total_profit=round(total_profit, 2),
    )


@router.get("/analytics/overview")
def sales_analytics(
    days: int | None = Query(default=None, ge=1, le=365),
    specialty: str | None = Query(default=None),
    area: str | None = Query(default=None),
    rep_id: str | None = Query(default=None),
    product_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    visible = get_visible_user_ids(db, current_user)
    q = db.query(Sale).filter(
        Sale.organization_id == current_user.organization_id,
        Sale.rep_id.in_(visible),
    )

    if days:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        q = q.filter(Sale.sold_at >= since)
    if rep_id:
        q = q.filter(Sale.rep_id == rep_id)
    if product_id:
        q = q.filter(Sale.product_id == product_id)

    sales = q.all()
    if not sales:
        return {
            "total_revenue": 0,
            "total_cost": 0,
            "total_profit": 0,
            "total_sales": 0,
            "avg_sale_value": 0,
            "top_products": [],
            "top_reps": [],
            "top_doctors": [],
            "revenue_trend": [],
        }

    # Filter by doctor specialty/area if needed
    sale_ids = [s.id for s in sales]
    doctor_ids = list({s.doctor_id for s in sales})
    product_ids = list({s.product_id for s in sales})
    rep_ids = list({s.rep_id for s in sales})

    doctors_map = {d.id: d for d in db.query(Doctor).filter(Doctor.id.in_(doctor_ids)).all()}
    products_map = {p.id: p for p in db.query(Product).filter(Product.id.in_(product_ids)).all()}
    reps_map = {u.id: u for u in db.query(User).filter(User.id.in_(rep_ids)).all()}

    # Apply specialty/area filters
    if specialty or area:
        filtered_sales = []
        for s in sales:
            doc = doctors_map.get(s.doctor_id)
            if not doc:
                continue
            if specialty and doc.specialty != specialty:
                continue
            if area and doc.area != area:
                continue
            filtered_sales.append(s)
        sales = filtered_sales

    total_revenue = sum(s.total_price for s in sales)
    total_cost = sum(s.total_cost for s in sales)
    total_profit = sum(s.profit for s in sales)
    total_sales = len(sales)
    avg_sale_value = total_revenue / total_sales if total_sales > 0 else 0

    # Top products
    product_stats: dict[str, dict] = {}
    for s in sales:
        pid = s.product_id
        if pid not in product_stats:
            p = products_map.get(pid)
            product_stats[pid] = {
                "id": pid,
                "name": p.name if p else "Unknown",
                "category": p.category if p else None,
                "quantity": 0,
                "revenue": 0,
            }
        product_stats[pid]["quantity"] += s.quantity
        product_stats[pid]["revenue"] += s.total_price
    top_products = sorted(product_stats.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    for item in top_products:
        item["revenue"] = round(item["revenue"], 2)

    # Top reps
    rep_stats: dict[str, dict] = {}
    for s in sales:
        rid = s.rep_id
        if rid not in rep_stats:
            u = reps_map.get(rid)
            rep_stats[rid] = {
                "id": rid,
                "name": u.full_name if u else "Unknown",
                "sales_count": 0,
                "revenue": 0,
            }
        rep_stats[rid]["sales_count"] += 1
        rep_stats[rid]["revenue"] += s.total_price
    top_reps = sorted(rep_stats.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    for item in top_reps:
        item["revenue"] = round(item["revenue"], 2)

    # Top doctors
    doctor_stats: dict[str, dict] = {}
    for s in sales:
        did = s.doctor_id
        if did not in doctor_stats:
            d = doctors_map.get(did)
            doctor_stats[did] = {
                "id": did,
                "name": d.full_name if d else "Unknown",
                "specialty": d.specialty if d else None,
                "area": d.area if d else None,
                "sales_count": 0,
                "revenue": 0,
            }
        doctor_stats[did]["sales_count"] += 1
        doctor_stats[did]["revenue"] += s.total_price
    top_doctors = sorted(doctor_stats.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    for item in top_doctors:
        item["revenue"] = round(item["revenue"], 2)

    # Revenue trend (last 14 days)
    trend: dict[str, dict] = {}
    for s in sales:
        day = s.sold_at.strftime("%Y-%m-%d") if s.sold_at else "unknown"
        if day not in trend:
            trend[day] = {"date": day, "revenue": 0, "profit": 0, "count": 0}
        trend[day]["revenue"] += s.total_price
        trend[day]["profit"] += s.profit
        trend[day]["count"] += 1
    revenue_trend = sorted(trend.values(), key=lambda x: x["date"])
    for item in revenue_trend:
        item["revenue"] = round(item["revenue"], 2)
        item["profit"] = round(item["profit"], 2)

    return {
        "total_revenue": round(total_revenue, 2),
        "total_cost": round(total_cost, 2),
        "total_profit": round(total_profit, 2),
        "total_sales": total_sales,
        "avg_sale_value": round(avg_sale_value, 2),
        "top_products": top_products,
        "top_reps": top_reps,
        "top_doctors": top_doctors,
        "revenue_trend": revenue_trend,
    }


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(
    sale_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.organization_id == current_user.organization_id,
    ).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    visible = get_visible_user_ids(db, current_user)
    if sale.rep_id not in visible:
        raise HTTPException(status_code=403, detail="Not allowed")

    return _sale_to_response(db, sale)


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    doctor = db.query(Doctor).filter(
        Doctor.id == payload.doctor_id,
        Doctor.organization_id == current_user.organization_id,
    ).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    product = db.query(Product).filter(
        Product.id == payload.product_id,
        Product.organization_id == current_user.organization_id,
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    unit_price = payload.unit_price if payload.unit_price is not None else (product.unit_price or 0)
    unit_cost = payload.unit_cost if payload.unit_cost is not None else (product.unit_cost or 0)
    quantity = payload.quantity

    total_price = round(unit_price * quantity, 2)
    total_cost = round(unit_cost * quantity, 2)
    profit = round(total_price - total_cost, 2)

    sale_status = SaleStatus.CONFIRMED
    if payload.status:
        try:
            sale_status = SaleStatus(payload.status)
        except ValueError:
            pass

    sale = Sale(
        organization_id=current_user.organization_id,
        rep_id=current_user.id,
        doctor_id=payload.doctor_id,
        product_id=payload.product_id,
        visit_id=payload.visit_id,
        quantity=quantity,
        unit_price=unit_price,
        unit_cost=unit_cost,
        total_price=total_price,
        total_cost=total_cost,
        profit=profit,
        status=sale_status,
        notes=payload.notes,
    )
    db.add(sale)
    db.flush()

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="SALE_CREATED",
        entity="Sale",
        entity_id=sale.id,
        metadata={
            "doctor_name": doctor.full_name,
            "product_name": product.name,
            "quantity": quantity,
            "total_price": total_price,
        },
    )

    db.commit()
    db.refresh(sale)
    return _sale_to_response(db, sale)


@router.patch("/{sale_id}", response_model=SaleResponse)
def update_sale(
    sale_id: str,
    payload: SaleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.organization_id == current_user.organization_id,
    ).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    visible = get_visible_user_ids(db, current_user)
    if sale.rep_id not in visible:
        raise HTTPException(status_code=403, detail="Not allowed")

    updates = payload.model_dump(exclude_none=True)

    if "status" in updates:
        try:
            updates["status"] = SaleStatus(updates["status"])
        except ValueError:
            del updates["status"]

    for k, v in updates.items():
        setattr(sale, k, v)

    # Recalculate totals
    quantity = sale.quantity
    unit_price = sale.unit_price
    unit_cost = sale.unit_cost
    sale.total_price = round(unit_price * quantity, 2)
    sale.total_cost = round(unit_cost * quantity, 2)
    sale.profit = round(sale.total_price - sale.total_cost, 2)

    db.commit()
    db.refresh(sale)
    return _sale_to_response(db, sale)


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sale(
    sale_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.organization_id == current_user.organization_id,
    ).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    visible = get_visible_user_ids(db, current_user)
    if sale.rep_id not in visible:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(sale)
    db.commit()
    return None
