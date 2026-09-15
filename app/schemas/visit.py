from datetime import datetime

from pydantic import BaseModel, Field

from app.models.visit import DoctorResponse, VisitPurpose, VisitStatus


class VisitCreateRequest(BaseModel):
    doctor_id: str
    doctor_location_id: str | None = None
    visit_purpose: VisitPurpose = VisitPurpose.DETAILING
    planned_at: datetime | None = None
    notes: str | None = None


class VisitCheckInRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float | None = None


class VisitCheckOutRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: float | None = None
    notes: str | None = None
    doctor_response: DoctorResponse | None = None
    next_follow_up_date: datetime | None = None
    next_follow_up_type: str | None = None
    next_follow_up_notes: str | None = None
    feedback_positive: str | None = None
    feedback_objections: str | None = None
    feedback_next_steps: str | None = None
    feedback_overall: str | None = None
    send_to_admin: bool = True


class VisitUpdateRequest(BaseModel):
    visit_purpose: VisitPurpose | None = None
    planned_at: datetime | None = None
    notes: str | None = None


class VisitResponse(BaseModel):
    id: str
    organization_id: str
    rep_id: str
    doctor_id: str
    doctor_name: str | None = None
    doctor_specialty: str | None = None
    doctor_phone: str | None = None
    doctor_address: str | None = None
    doctor_latitude: float | None = None
    doctor_longitude: float | None = None
    visit_purpose: VisitPurpose
    status: VisitStatus
    planned_at: datetime | None
    checked_in_at: datetime | None
    checked_out_at: datetime | None
    duration_minutes: int | None
    checkin_latitude: float | None
    checkin_longitude: float | None
    checkout_latitude: float | None
    checkout_longitude: float | None
    distance_from_doctor: float | None
    is_verified: bool
    doctor_response: DoctorResponse | None
    notes: str | None
    next_follow_up_date: datetime | None
    next_follow_up_type: str | None
    next_follow_up_notes: str | None
    feedback_positive: str | None = None
    feedback_objections: str | None = None
    feedback_next_steps: str | None = None
    feedback_overall: str | None = None
    report_sent_to_admin_at: datetime | None = None
    report_forwarded_to_manager_at: datetime | None = None
    admin_notes: str | None = None
    rep_name: str | None = None
    products: list[dict] = []
    created_at: datetime
    updated_at: datetime


class VisitListResponse(BaseModel):
    items: list[VisitResponse]
    total: int