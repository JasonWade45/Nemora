from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(slots=True)
class GeocodeResult:
    latitude: float
    longitude: float
    display_name: str
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None


class GeocodingProvider(ABC):
    @abstractmethod
    def reverse_geocode(self, *, lat: float, lng: float) -> GeocodeResult | None:
        """Translate coordinates to a normalized address object."""
