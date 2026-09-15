from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.enums import AssignmentStatus, PriorityLevel


class DoctorAssignmentCreateRequest(BaseModel):
    doctor_id: str
    medical_rep_id: str | None = None
    priority: PriorityLevel = PriorityLevel.MEDIUM
    notes: str | None = None
    follow_up_date: date | None = None
    visit_frequency_days: int | None = Field(default=None, ge=1, le=365)
    next_visit_at: datetime | None = None
    status: AssignmentStatus = AssignmentStatus.ACTIVE


class DoctorAssignmentUpdateRequest(BaseModel):
    priority: PriorityLevel | None = None
    notes: str | None = None
    follow_up_date: date | None = None
    visit_frequency_days: int | None = Field(default=None, ge=1, le=365)
    last_visit_at: datetime | None = None
    next_visit_at: datetime | None = None
    status: AssignmentStatus | None = None


class DoctorAssignmentResponse(BaseModel):
    id: str
    organization_id: str

    doctor_id: str
    doctor_name: str
    doctor_specialty: str | None

    medical_rep_id: str
    medical_rep_name: str

    priority: PriorityLevel
    notes: str | None
    follow_up_date: date | None
    visit_frequency_days: int | None
    last_visit_at: datetime | None
    next_visit_at: datetime | None
    status: AssignmentStatus

    created_at: datetime
    updated_at: datetime


class DoctorAssignmentListResponse(BaseModel):
    items: list[DoctorAssignmentResponse]
    total: int
    page: int
    page_size: int
