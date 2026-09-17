from datetime import datetime

from pydantic import BaseModel, Field


class SaleCreateRequest(BaseModel):
    doctor_id: str
    product_id: str
    quantity: int = Field(ge=1, default=1)
    unit_price: float | None = None
    unit_cost: float | None = None
    visit_id: str | None = None
    notes: str | None = None
    status: str | None = None


class SaleUpdateRequest(BaseModel):
    quantity: int | None = Field(default=None, ge=1)
    unit_price: float | None = None
    unit_cost: float | None = None
    status: str | None = None
    notes: str | None = None


class SaleResponse(BaseModel):
    id: str
    organization_id: str
    rep_id: str
    rep_name: str | None = None
    doctor_id: str
    doctor_name: str | None = None
    doctor_specialty: str | None = None
    doctor_area: str | None = None
    product_id: str
    product_name: str | None = None
    product_category: str | None = None
    visit_id: str | None = None
    quantity: int
    unit_price: float
    unit_cost: float
    total_price: float
    total_cost: float
    profit: float
    status: str
    notes: str | None = None
    sold_at: datetime
    created_at: datetime


class SaleListResponse(BaseModel):
    items: list[SaleResponse]
    total: int
    total_revenue: float
    total_cost: float
    total_profit: float
