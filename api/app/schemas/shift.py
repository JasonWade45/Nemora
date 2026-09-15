from datetime import datetime

from pydantic import BaseModel


class ShiftStartRequest(BaseModel):
    notes: str | None = None


class ShiftEndRequest(BaseModel):
    notes: str | None = None


class ShiftResponse(BaseModel):
    id: str
    user_id: str
    status: str
    started_at: datetime
    ended_at: datetime | None
    notes: str | None

    model_config = {"from_attributes": True}


class ShiftCurrentResponse(BaseModel):
    active: bool
    shift: ShiftResponse | None = None