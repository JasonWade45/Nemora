from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import FacilityType, WorkplaceStatus


class WorkplaceCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    facility_type: FacilityType = FacilityType.CLINIC

    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    zip_code: str | None = Field(default=None, max_length=20)

    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    phone: str | None = Field(default=None, max_length=50)
    website: str | None = Field(default=None, max_length=255)
    opening_hours: str | None = Field(default=None, max_length=255)
    notes: str | None = None

    status: WorkplaceStatus = WorkplaceStatus.ACTIVE


class WorkplaceUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    facility_type: FacilityType | None = None

    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    zip_code: str | None = Field(default=None, max_length=20)

    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    phone: str | None = Field(default=None, max_length=50)
    website: str | None = Field(default=None, max_length=255)
    opening_hours: str | None = Field(default=None, max_length=255)
    notes: str | None = None

    status: WorkplaceStatus | None = None


class WorkplaceResponse(BaseModel):
    id: str
    organization_id: str

    name: str
    facility_type: FacilityType

    address: str | None
    city: str | None
    state: str | None
    zip_code: str | None

    latitude: float | None
    longitude: float | None

    phone: str | None
    website: str | None
    opening_hours: str | None
    notes: str | None

    status: WorkplaceStatus
    created_at: datetime
    updated_at: datetime


class WorkplaceListResponse(BaseModel):
    items: list[WorkplaceResponse]
    total: int
    page: int
    page_size: int


class DoctorWorkplaceLinkRequest(BaseModel):
    is_primary: bool = False
