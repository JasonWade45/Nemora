from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import DoctorStatus, PriorityLevel


class DoctorCreateRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    full_name: str | None = Field(default=None, min_length=2, max_length=255)

    specialty: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=320)

    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    zip_code: str | None = Field(default=None, max_length=20)
    area: str | None = Field(default=None, max_length=100)

    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    notes: str | None = None
    status: DoctorStatus = DoctorStatus.ACTIVE
    priority: PriorityLevel = PriorityLevel.MEDIUM
    tags: list[str] = Field(default_factory=list)
    working_hours: dict[str, str | None] | None = None


class DoctorUpdateRequest(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    full_name: str | None = Field(default=None, min_length=2, max_length=255)

    specialty: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=320)

    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    zip_code: str | None = Field(default=None, max_length=20)
    area: str | None = Field(default=None, max_length=100)

    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    notes: str | None = None
    status: DoctorStatus | None = None
    priority: PriorityLevel | None = None
    tags: list[str] | None = None
    working_hours: dict[str, str | None] | None = None


class DoctorResponse(BaseModel):
    id: str
    organization_id: str

    first_name: str
    last_name: str
    full_name: str

    specialty: str | None
    phone: str | None
    email: str | None

    address: str | None
    city: str | None
    state: str | None
    zip_code: str | None
    area: str | None = None

    latitude: float | None
    longitude: float | None

    notes: str | None
    status: DoctorStatus
    priority: PriorityLevel
    tags: list[str]
    working_hours: dict[str, str | None]

    created_at: datetime
    updated_at: datetime


class DoctorListResponse(BaseModel):
    items: list[DoctorResponse]
    total: int
    page: int
    page_size: int