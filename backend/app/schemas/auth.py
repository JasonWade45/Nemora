from datetime import datetime

from pydantic import BaseModel, Field

from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


class MeResponse(BaseModel):
    id: str
    organization_id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    is_super_admin: bool = False
    phone: str | None = None
    created_at: datetime


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class SignupRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    organization_slug: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9-]+$")
    admin_full_name: str = Field(min_length=2, max_length=255)
    admin_email: str = Field(min_length=3, max_length=320)
    admin_password: str = Field(min_length=8)


class SignupResponse(BaseModel):
    organization_id: str
    organization_name: str
    admin_user_id: str
    admin_email: str
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int