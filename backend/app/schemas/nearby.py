from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class NearbyType(str, Enum):
    DOCTOR = "doctor"
    CLINIC = "clinic"
    HOSPITAL = "hospital"
    PHARMACY = "pharmacy"
    DENTIST = "dentist"
    MEDICAL_CENTER = "medical_center"


class NearbySource(str, Enum):
    INTERNAL = "internal"
    OSM = "osm"


class NearbyItem(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    phone: str | None = None
    website: str | None = None
    opening_hours: str | None = None

    distance_meters: float

    category: NearbyType
    source: NearbySource

    specialty: str | None = None
    priority: str | None = None

    osm_id: str | None = None
    osm_type: str | None = None


class NearbySearchResponse(BaseModel):
    items: list[NearbyItem]
    total: int
    center_lat: float
    center_lng: float
    radius_meters: int
    generated_at: datetime


class OSMImportRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_meters: int = Field(default=5000, ge=100, le=50000)
    categories: list[NearbyType] = Field(default_factory=lambda: [
        NearbyType.CLINIC,
        NearbyType.HOSPITAL,
        NearbyType.PHARMACY,
        NearbyType.DENTIST,
        NearbyType.MEDICAL_CENTER,
    ])


class OSMImportResponse(BaseModel):
    imported: int
    updated: int
    skipped: int
    total_received: int
