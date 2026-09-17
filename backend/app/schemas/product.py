from datetime import datetime

from pydantic import BaseModel, Field


class ProductCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    generic_name: str | None = None
    category: str | None = None
    description: str | None = None
    dosage_info: str | None = None
    image_url: str | None = None
    unit_price: float | None = None
    unit_cost: float | None = None
    visible_to_all: bool = False
    assigned_to_user_id: str | None = None


class ProductUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    generic_name: str | None = None
    category: str | None = None
    description: str | None = None
    dosage_info: str | None = None
    image_url: str | None = None
    unit_price: float | None = None
    unit_cost: float | None = None
    visible_to_all: bool | None = None
    assigned_to_user_id: str | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: str
    organization_id: str
    owner_user_id: str
    owner_name: str | None = None
    assigned_to_user_id: str | None = None
    assigned_to_name: str | None = None
    visible_to_all: bool
    name: str
    generic_name: str | None = None
    category: str | None = None
    description: str | None = None
    dosage_info: str | None = None
    image_url: str | None = None
    unit_price: float | None = None
    unit_cost: float | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int