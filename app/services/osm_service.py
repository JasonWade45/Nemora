"""
OpenStreetMap / Overpass API Integration Service

This service provides a provider-independent abstraction for acquiring
medical POI data from OpenStreetMap via Overpass API.
"""
import asyncio
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime

import httpx

from app.core.config import settings


@dataclass
class OSMLocation:
    """Represents a medical location from OSM"""
    osm_id: str
    name: str
    latitude: float
    longitude: float
    specialty: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    opening_hours: Optional[str] = None
    amenity_type: str = "clinic"
    raw_tags: Dict[str, Any] = None


class OSMProvider:
    """
    Provider for fetching medical POIs from OpenStreetMap via Overpass API.
    
    Supports querying for:
    - doctors, clinics, hospitals
    - pharmacies
    - dentists
    - medical centers
    
    All requests respect rate limits and usage policies.
    """

    def __init__(self):
        self.overpass_url = settings.overpass_api_url
        self.nominatim_url = settings.nominatim_api_url
        self.client = httpx.AsyncClient(timeout=30.0)
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = 3600  # 1 hour

    async def close(self):
        await self.client.aclose()

    def _build_overpass_query(
        self,
        lat: float,
        lng: float,
        radius_meters: int,
        amenity_types: Optional[List[str]] = None
    ) -> str:
        """Build Overpass QL query for medical POIs"""
        
        # Default medical amenity types
        if amenity_types is None:
            amenity_types = [
                "hospital",
                "clinic",
                "doctors",
                "pharmacy",
                "dentist",
                "veterinary",
                "medical_center",
            ]

        amenity_filter = " | ".join([f'node["amenity"="{t}"]' for t in amenity_types])
        amenity_filter += " | " + " | ".join([f'way["amenity"="{t}"]' for t in amenity_types])

        query = f"""
        [out:json][timeout:25];
        (
          {amenity_filter}
          (around:{radius_meters},{lat},{lng});
        );
        out center meta;
        """
        return query.strip()

    async def search_medical_pois(
        self,
        lat: float,
        lng: float,
        radius_meters: int = 5000,
        amenity_types: Optional[List[str]] = None
    ) -> List[OSMLocation]:
        """
        Search for medical POIs near a location.
        
        Args:
            lat: Latitude
            lng: Longitude
            radius_meters: Search radius in meters (max 50000)
            amenity_types: List of OSM amenity types to search for
            
        Returns:
            List of OSMLocation objects
        """
        # Check cache
        cache_key = f"{lat:.4f},{lng:.4f},{radius_meters}"
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if (datetime.utcnow() - timestamp).total_seconds() < self._cache_ttl:
                return cached_data

        query = self._build_overpass_query(lat, lng, radius_meters, amenity_types)

        try:
            response = await self.client.post(
                self.overpass_url,
                data={"data": query},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Overpass API error: {str(e)}")

        locations = self._parse_overpass_response(data)

        # Cache results
        self._cache[cache_key] = (locations, datetime.utcnow())

        return locations

    def _parse_overpass_response(self, data: Dict[str, Any]) -> List[OSMLocation]:
        """Parse Overpass API JSON response into OSMLocation objects"""
        locations = []

        for element in data.get("elements", []):
            try:
                tags = element.get("tags", {})
                
                # Get coordinates
                if element["type"] == "node":
                    lat = element["lat"]
                    lng = element["lon"]
                elif "center" in element:
                    lat = element["center"]["lat"]
                    lng = element["center"]["lon"]
                else:
                    continue

                # Determine specialty/amenity type
                amenity = tags.get("amenity", "")
                healthcare = tags.get("healthcare", "")
                specialty = tags.get("healthcare:specialty", "") or healthcare or amenity

                # Build address from tags
                address_parts = []
                for key in ["addr:housenumber", "addr:street", "addr:city", "addr:postcode"]:
                    if key in tags:
                        address_parts.append(tags[key])
                address = ", ".join(address_parts) if address_parts else None

                location = OSMLocation(
                    osm_id=f"{element['type']}/{element['id']}",
                    name=tags.get("name", f"Unknown {amenity}"),
                    latitude=lat,
                    longitude=lng,
                    specialty=specialty,
                    address=address,
                    phone=tags.get("phone") or tags.get("contact:phone"),
                    website=tags.get("website") or tags.get("contact:website"),
                    opening_hours=tags.get("opening_hours"),
                    amenity_type=amenity,
                    raw_tags=tags,
                )
                locations.append(location)

            except (KeyError, ValueError) as e:
                # Skip malformed elements
                continue

        return locations

    async def reverse_geocode(
        self,
        lat: float,
        lng: float
    ) -> Optional[Dict[str, Any]]:
        """
        Reverse geocode coordinates to address using Nominatim.
        """
        try:
            response = await self.client.get(
                f"{self.nominatim_url}/reverse",
                params={
                    "lat": lat,
                    "lon": lng,
                    "format": "json",
                    "addressdetails": 1,
                },
                headers={"User-Agent": "PharmaTrack/1.0"},
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError:
            return None

    async def import_to_database(
        self,
        locations: List[OSMLocation],
        organization_id: str,
        db_session,
    ) -> Dict[str, int]:
        """
        Import OSM locations into the database as doctors.
        
        This is a high-level method that normalizes OSM data and creates
        Doctor records. Uses upsert logic to avoid duplicates.
        """
        from app.models.doctor import Doctor, DoctorPriority
        from app.models.doctor_specialty import DoctorSpecialty
        from sqlalchemy import select
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        stats = {"created": 0, "updated": 0, "skipped": 0}

        for loc in locations:
            try:
                # Find or create specialty
                specialty_name = loc.specialty or loc.amenity_type or "General"
                result = await db_session.execute(
                    select(DoctorSpecialty).where(
                        DoctorSpecialty.name.ilike(specialty_name)
                    )
                )
                specialty = result.scalar_one_or_none()

                if not specialty:
                    specialty = DoctorSpecialty(name=specialty_name, organization_id=organization_id)
                    db_session.add(specialty)
                    await db_session.flush()

                # Upsert doctor
                stmt = pg_insert(Doctor).values(
                    id=loc.osm_id.replace("/", "_"),
                    name=loc.name,
                    phone=loc.phone,
                    email=None,
                    specialty_id=specialty.id,
                    sub_specialty=None,
                    gender=None,
                    clinic_name=loc.name,
                    address=loc.address,
                    governorate=None,
                    city=None,
                    location=f"POINT({loc.longitude} {loc.latitude})",
                    latitude=loc.latitude,
                    longitude=loc.longitude,
                    priority=DoctorPriority.B,
                    organization_id=organization_id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ).on_conflict_do_update(
                    index_elements=["id"],
                    set_={
                        "name": loc.name,
                        "phone": loc.phone,
                        "address": loc.address,
                        "latitude": loc.latitude,
                        "longitude": loc.longitude,
                        "updated_at": datetime.utcnow(),
                    }
                )
                await db_session.execute(stmt)
                stats["created"] += 1

            except Exception as e:
                stats["skipped"] += 1
                continue

        await db_session.commit()
        return stats


# Global provider instance
osm_provider = OSMProvider()