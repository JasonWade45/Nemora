from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.schemas.nearby import NearbyType


@dataclass(slots=True)
class ExternalPlace:
    source: str
    osm_id: str
    osm_type: str
    category: NearbyType
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
    raw_payload: str | None = None


class MapsProvider(ABC):
    @abstractmethod
    def search_healthcare_places(
        self,
        *,
        lat: float,
        lng: float,
        radius_meters: int,
        categories: list[NearbyType],
    ) -> list[ExternalPlace]:
        """Fetch nearby healthcare places from an external provider."""
