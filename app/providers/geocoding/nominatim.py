import httpx

from app.core.config import get_settings
from app.providers.geocoding.base import GeocodeResult, GeocodingProvider


class NominatimGeocodingProvider(GeocodingProvider):
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.nominatim_url.rstrip("/")
        self.timeout_seconds = settings.external_provider_timeout_seconds

    def reverse_geocode(self, *, lat: float, lng: float) -> GeocodeResult | None:
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.get(
                f"{self.base_url}/reverse",
                params={
                    "lat": lat,
                    "lon": lng,
                    "format": "jsonv2",
                    "addressdetails": 1,
                },
                headers={"User-Agent": "NEMORA/1.0 (healthcare-field-intelligence)"},
            )
            if response.status_code >= 400:
                return None

            payload = response.json()
            if not isinstance(payload, dict):
                return None

            address = payload.get("address") or {}
            return GeocodeResult(
                latitude=float(payload.get("lat", lat)),
                longitude=float(payload.get("lon", lng)),
                display_name=str(payload.get("display_name") or ""),
                city=address.get("city") or address.get("town") or address.get("village"),
                state=address.get("state"),
                zip_code=address.get("postcode"),
            )
