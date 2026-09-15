from datetime import date, datetime

from pydantic import BaseModel


class DailyReportResponse(BaseModel):
    id: str
    user_id: str
    user_name: str | None = None
    manager_id: str | None
    report_date: date
    summary: str | None
    total_visits: int
    completed_visits: int
    doctors_visited: int
    revenue: float
    shift_started_at: datetime | None
    shift_ended_at: datetime | None
    distance_km: float
    details: str | None
    sent_at: datetime

    model_config = {"from_attributes": True}


class DailyReportListResponse(BaseModel):
    items: list[DailyReportResponse]