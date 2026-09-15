from datetime import datetime

from pydantic import BaseModel, Field


class OrganizationBootstrapRequest(BaseModel):
    organization_name: str = Field(min_length=2, max_length=255)
    organization_slug: str = Field(min_length=2, max_length=120)
    admin_email: str = Field(min_length=3, max_length=320)
    admin_password: str = Field(min_length=8)
    admin_full_name: str = Field(min_length=2, max_length=255)


class OrganizationUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    settings: dict | None = None


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    settings: dict = Field(default_factory=dict)
    created_at: datetime
