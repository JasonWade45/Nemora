from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_active_user, get_organization_id
from app.services.osm_service import osm_provider, OSMLocation
from app.services.route_optimizer import route_optimizer, Location, RoutingProvider
from app.schemas import PaginatedResponse

router = APIRouter(prefix="/osm", tags=["openstreetmap"])


@router.get("/search", response_model=List[dict])
async def search_medical_pois(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_meters: int = Query(5000, gt=0, le=50000),
    amenity_types: Optional[str] = Query(None, description="Comma-separated list of OSM amenity types"),
    current_user = Depends(get_current_active_user),
):
    """
    Search for medical POIs near a location using Overpass API.
    Returns raw OSM data for preview before import.
    """
    types = amenity_types.split(",") if amenity_types else None
    locations = await osm_provider.search_medical_pois(
        lat=latitude,
        lng=longitude,
        radius_meters=radius_meters,
        amenity_types=types,
    )
    return [
        {
            "osm_id": loc.osm_id,
            "name": loc.name,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "specialty": loc.specialty,
            "address": loc.address,
            "phone": loc.phone,
            "website": loc.website,
            "opening_hours": loc.opening_hours,
            "amenity_type": loc.amenity_type,
        }
        for loc in locations
    ]


@router.post("/import", response_model=dict)
async def import_osm_doctors(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_meters: int = Query(5000, gt=0, le=50000),
    amenity_types: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    org_id: str = Depends(get_organization_id),
    current_user = Depends(get_current_active_user),
):
    """
    Import medical POIs from OSM as doctors in the database.
    """
    if current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can import OSM data")

    types = amenity_types.split(",") if amenity_types else None
    locations = await osm_provider.search_medical_pois(
        lat=latitude,
        lng=longitude,
        radius_meters=radius_meters,
        amenity_types=types,
    )

    stats = await osm_provider.import_to_database(locations, org_id, db)
    return {
        "message": "Import completed",
        "stats": stats,
        "locations_found": len(locations),
    }


@router.get("/reverse-geocode")
async def reverse_geocode(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    current_user = Depends(get_current_active_user),
):
    """Reverse geocode coordinates to address"""
    result = await osm_provider.reverse_geocode(latitude, longitude)
    return result