from datetime import datetime

from pydantic import BaseModel, Field


class LocationPingCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    accuracy: float | None = None


class LocationPingResponse(BaseModel):
    id: str
    user_id: str
    latitude: float
    longitude: float
    accuracy: float | None
    recorded_at: datetime

    model_config = {"from_attributes": True}


class TeamLocationItem(BaseModel):
    user_id: str
    full_name: str
    email: str
    role: str
    latitude: float | None = None
    longitude: float | None = None
    accuracy: float | None = None
    last_seen: datetime | None = None
    shift_status: str | None = None
    shift_started_at: datetime | None = None
    is_online: bool = False


class TeamLocationsResponse(BaseModel):
    items: list[TeamLocationItem]


class TrackPoint(BaseModel):
    latitude: float
    longitude: float
    recorded_at: datetime


class TrackResponse(BaseModel):
    user_id: str
    date: str
    points: list[TrackPoint]
    total_distance_km: float


class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    weight: float


class HeatmapResponse(BaseModel):
    points: list[HeatmapPoint]