from datetime import datetime

from pydantic import BaseModel, Field

from app.models.user import UserRole


class UserCreateRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8)
    role: UserRole
    phone: str | None = None
    specialties: list[str] = []
    supervisor_id: str | None = None


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    specialties: list[str] | None = None
    supervisor_id: str | None = None


class UserResponse(BaseModel):
    id: str
    organization_id: str
    email: str
    full_name: str
    phone: str | None = None
    role: UserRole
    is_active: bool
    specialties: list[str] = []
    supervisor_id: str | None = None
    supervisor_name: str | None = None
    created_at: datetime
    updated_at: datetime | None = None


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    page_size: int