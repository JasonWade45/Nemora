import json
from collections.abc import Iterable

import httpx

from app.core.config import get_settings
from app.providers.maps.base import ExternalPlace, MapsProvider
from app.schemas.nearby import NearbyType


_CATEGORY_TAGS: dict[NearbyType, list[tuple[str, str]]] = {
    NearbyType.DOCTOR: [("amenity", "doctors")],
    NearbyType.CLINIC: [("amenity", "clinic")],
    NearbyType.HOSPITAL: [("amenity", "hospital")],
    NearbyType.PHARMACY: [("amenity", "pharmacy")],
    NearbyType.DENTIST: [("amenity", "dentist")],
    NearbyType.MEDICAL_CENTER: [("healthcare", "centre"), ("healthcare", "medical_center")],
}


class OverpassMapsProvider(MapsProvider):
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.overpass_url
        self.timeout_seconds = settings.external_provider_timeout_seconds

    def search_healthcare_places(
        self,
        *,
        lat: float,
        lng: float,
        radius_meters: int,
        categories: list[NearbyType],
    ) -> list[ExternalPlace]:
        selected = categories or [
            NearbyType.CLINIC,
            NearbyType.HOSPITAL,
            NearbyType.PHARMACY,
            NearbyType.DENTIST,
            NearbyType.MEDICAL_CENTER,
        ]

        query = self._build_query(lat=lat, lng=lng, radius_meters=radius_meters, categories=selected)

        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(
                self.base_url,
                data={"data": query},
                headers={"User-Agent": "NEMORA/1.0 (healthcare-field-intelligence)"},
            )
            response.raise_for_status()
            payload = response.json()

        return self._normalize_elements(payload.get("elements", []), selected)

    def _build_query(self, *, lat: float, lng: float, radius_meters: int, categories: list[NearbyType]) -> str:
        fragments: list[str] = []
        for category in categories:
            tag_filters = _CATEGORY_TAGS.get(category, [])
            for tag_key, tag_value in tag_filters:
                fragments.append(
                    f"node[\"{tag_key}\"=\"{tag_value}\"](around:{radius_meters},{lat},{lng});"
                )
                fragments.append(
                    f"way[\"{tag_key}\"=\"{tag_value}\"](around:{radius_meters},{lat},{lng});"
                )
                fragments.append(
                    f"relation[\"{tag_key}\"=\"{tag_value}\"](around:{radius_meters},{lat},{lng});"
                )

        body = "\n  ".join(fragments)
        return (
            "[out:json][timeout:25];\n"
            "(\n"
            f"  {body}\n"
            ");\n"
            "out center tags;"
        )

    def _normalize_elements(self, elements: Iterable[dict], requested_categories: list[NearbyType]) -> list[ExternalPlace]:
        seen: set[tuple[str, str]] = set()
        items: list[ExternalPlace] = []

        for element in elements:
            osm_id = str(element.get("id", "")).strip()
            osm_type = str(element.get("type", "")).strip()
            if not osm_id or not osm_type:
                continue

            dedupe_key = (osm_type, osm_id)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            tags = element.get("tags") or {}
            category = self._detect_category(tags, requested_categories)
            if category is None:
                continue

            lat = element.get("lat")
            lng = element.get("lon")
            if lat is None or lng is None:
                center = element.get("center") or {}
                lat = center.get("lat")
                lng = center.get("lon")

            if lat is None or lng is None:
                continue

            name = tags.get("name") or f"{category.value.title()} ({osm_type} {osm_id})"

            items.append(
                ExternalPlace(
                    source="OSM",
                    osm_id=osm_id,
                    osm_type=osm_type,
                    category=category,
                    name=name,
                    latitude=float(lat),
                    longitude=float(lng),
                    address=tags.get("addr:full") or tags.get("addr:street"),
                    city=tags.get("addr:city"),
                    state=tags.get("addr:state"),
                    zip_code=tags.get("addr:postcode"),
                    phone=tags.get("phone") or tags.get("contact:phone"),
                    website=tags.get("website") or tags.get("contact:website"),
                    opening_hours=tags.get("opening_hours"),
                    raw_payload=json.dumps(element, ensure_ascii=False),
                )
            )

        return items

    def _detect_category(self, tags: dict, requested_categories: list[NearbyType]) -> NearbyType | None:
        amenity = str(tags.get("amenity", "")).lower()
        healthcare = str(tags.get("healthcare", "")).lower()

        detected: NearbyType | None = None
        if amenity == "doctors":
            detected = NearbyType.DOCTOR
        elif amenity == "clinic":
            detected = NearbyType.CLINIC
        elif amenity == "hospital":
            detected = NearbyType.HOSPITAL
        elif amenity == "pharmacy":
            detected = NearbyType.PHARMACY
        elif amenity == "dentist":
            detected = NearbyType.DENTIST
        elif healthcare in {"centre", "medical_center"}:
            detected = NearbyType.MEDICAL_CENTER

        if detected and detected in requested_categories:
            return detected
        return None
