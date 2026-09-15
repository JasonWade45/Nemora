from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.core.deps import get_current_active_user
from app.services.route_optimizer import route_optimizer, Location, RoutingProvider

router = APIRouter(prefix="/routes", tags=["route-optimization"])


class LocationRequest(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    metadata: Optional[dict] = None


class OptimizeRouteRequest(BaseModel):
    locations: List[LocationRequest]
    start_location: Optional[LocationRequest] = None
    provider: str = "haversine"  # haversine, osrm


class RouteSegmentResponse(BaseModel):
    from_location: dict
    to_location: dict
    distance_meters: float
    duration_seconds: float
    geometry: Optional[str] = None


class OptimizedRouteResponse(BaseModel):
    segments: List[RouteSegmentResponse]
    total_distance_meters: float
    total_duration_seconds: float
    visit_order: List[str]


@router.post("/optimize", response_model=OptimizedRouteResponse)
async def optimize_route(
    request: OptimizeRouteRequest,
    current_user = Depends(get_current_active_user),
):
    """
    Optimize route through multiple locations.
    """
    # Convert to Location objects
    locations = [
        Location(
            id=loc.id,
            name=loc.name,
            latitude=loc.latitude,
            longitude=loc.longitude,
            metadata=loc.metadata or {},
        )
        for loc in request.locations
    ]

    start_location = None
    if request.start_location:
        start_location = Location(
            id=request.start_location.id,
            name=request.start_location.name,
            latitude=request.start_location.latitude,
            longitude=request.start_location.longitude,
            metadata=request.start_location.metadata or {},
        )

    # Parse provider
    try:
        provider = RoutingProvider(request.provider.lower())
    except ValueError:
        provider = RoutingProvider.HAVERSINE

    # Optimize route
    try:
        route = await route_optimizer.optimize_route(
            locations=locations,
            start_location=start_location,
            provider=provider,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route optimization failed: {str(e)}")

    return OptimizedRouteResponse(
        segments=[
            RouteSegmentResponse(
                from_location={
                    "id": seg.from_location.id,
                    "name": seg.from_location.name,
                    "latitude": seg.from_location.latitude,
                    "longitude": seg.from_location.longitude,
                },
                to_location={
                    "id": seg.to_location.id,
                    "name": seg.to_location.name,
                    "latitude": seg.to_location.latitude,
                    "longitude": seg.to_location.longitude,
                },
                distance_meters=seg.distance_meters,
                duration_seconds=seg.duration_seconds,
                geometry=seg.geometry,
            )
            for seg in route.segments
        ],
        total_distance_meters=route.total_distance_meters,
        total_duration_seconds=route.total_duration_seconds,
        visit_order=route.visit_order,
    )


@router.post("/distance-matrix")
async def get_distance_matrix(
    locations: List[LocationRequest],
    provider: str = Query("haversine"),
    current_user = Depends(get_current_active_user),
):
    """Get distance matrix between locations"""
    locs = [
        Location(
            id=loc.id,
            name=loc.name,
            latitude=loc.latitude,
            longitude=loc.longitude,
        )
        for loc in locations
    ]

    try:
        provider_enum = RoutingProvider(provider.lower())
    except ValueError:
        provider_enum = RoutingProvider.HAVERSINE

    matrix = await route_optimizer.get_distance_matrix(locs, provider_enum)
    return {"distance_matrix": matrix}


@router.post("/duration-matrix")
async def get_duration_matrix(
    locations: List[LocationRequest],
    provider: str = Query("haversine"),
    current_user = Depends(get_current_active_user),
):
    """Get duration matrix between locations"""
    locs = [
        Location(
            id=loc.id,
            name=loc.name,
            latitude=loc.latitude,
            longitude=loc.longitude,
        )
        for loc in locations
    ]

    try:
        provider_enum = RoutingProvider(provider.lower())
    except ValueError:
        provider_enum = RoutingProvider.HAVERSINE

    matrix = await route_optimizer.get_duration_matrix(locs, provider_enum)
    return {"duration_matrix": matrix}