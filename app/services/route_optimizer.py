"""
Route Optimization Service

Provider-independent architecture for route planning.
Supports multiple routing engines (OSRM, Valhalla, etc.)
"""
import asyncio
import math
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from abc import ABC, abstractmethod

import httpx

from app.core.config import settings


class RoutingProvider(str, Enum):
    OSRM = "osrm"
    VALHALLA = "valhalla"
    HAVERSINE = "haversine"  # Simple straight-line fallback


@dataclass
class Location:
    """A location with latitude/longitude"""
    id: str
    name: str
    latitude: float
    longitude: float
    metadata: Dict[str, Any] = None


@dataclass
class RouteSegment:
    """A segment of a route"""
    from_location: Location
    to_location: Location
    distance_meters: float
    duration_seconds: float
    geometry: Optional[str] = None  # GeoJSON LineString


@dataclass
class OptimizedRoute:
    """Complete optimized route"""
    segments: List[RouteSegment]
    total_distance_meters: float
    total_duration_seconds: float
    visit_order: List[str]  # Location IDs in order


class RoutingEngine(ABC):
    """Abstract base class for routing engines"""

    @abstractmethod
    async def get_route(
        self,
        locations: List[Location],
        start_location: Optional[Location] = None,
    ) -> OptimizedRoute:
        """Get optimized route through all locations"""
        pass

    @abstractmethod
    async def get_distance_matrix(
        self,
        locations: List[Location],
    ) -> List[List[float]]:
        """Get distance matrix between all locations (meters)"""
        pass

    @abstractmethod
    async def get_duration_matrix(
        self,
        locations: List[Location],
    ) -> List[List[float]]:
        """Get duration matrix between all locations (seconds)"""
        pass


class HaversineRoutingEngine(RoutingEngine):
    """
    Simple straight-line distance routing engine.
    Used as fallback when no external routing service is available.
    """

    EARTH_RADIUS = 6371000  # meters
    AVG_SPEED_KMH = 30  # km/h in urban areas

    def _haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate Haversine distance between two points in meters"""
        lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return self.EARTH_RADIUS * c

    async def get_distance_matrix(
        self,
        locations: List[Location],
    ) -> List[List[float]]:
        n = len(locations)
        matrix = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i != j:
                    matrix[i][j] = self._haversine_distance(
                        locations[i].latitude, locations[i].longitude,
                        locations[j].latitude, locations[j].longitude
                    )
        return matrix

    async def get_duration_matrix(
        self,
        locations: List[Location],
    ) -> List[List[float]]:
        distance_matrix = await self.get_distance_matrix(locations)
        # Convert distance to duration using average speed
        speed_mps = self.AVG_SPEED_KMH * 1000 / 3600
        return [[d / speed_mps for d in row] for row in distance_matrix]

    async def get_route(
        self,
        locations: List[Location],
        start_location: Optional[Location] = None,
    ) -> OptimizedRoute:
        """Simple nearest-neighbor route optimization"""
        if not locations:
            return OptimizedRoute(segments=[], total_distance_meters=0, total_duration_seconds=0, visit_order=[])

        # Use nearest neighbor heuristic
        unvisited = locations.copy()
        route_order = []

        if start_location:
            current = start_location
        else:
            current = unvisited.pop(0)
            route_order.append(current.id)

        while unvisited:
            # Find nearest unvisited location
            nearest = min(
                unvisited,
                key=lambda loc: self._haversine_distance(
                    current.latitude, current.longitude,
                    loc.latitude, loc.longitude
                )
            )
            route_order.append(nearest.id)
            current = nearest
            unvisited.remove(nearest)

        # Build segments
        segments = []
        total_distance = 0.0
        total_duration = 0.0

        for i in range(len(route_order) - 1):
            from_loc = next(l for l in locations if l.id == route_order[i])
            to_loc = next(l for l in locations if l.id == route_order[i + 1])
            distance = self._haversine_distance(
                from_loc.latitude, from_loc.longitude,
                to_loc.latitude, to_loc.longitude
            )
            duration = distance / (self.AVG_SPEED_KMH * 1000 / 3600)

            segments.append(RouteSegment(
                from_location=from_loc,
                to_location=to_loc,
                distance_meters=distance,
                duration_seconds=duration,
            ))
            total_distance += distance
            total_duration += duration

        return OptimizedRoute(
            segments=segments,
            total_distance_meters=total_distance,
            total_duration_seconds=total_duration,
            visit_order=route_order,
        )


class OSRMRoutingEngine(RoutingEngine):
    """
    OSRM (Open Source Routing Machine) routing engine.
    Uses public OSRM instance or self-hosted.
    """

    def __init__(self, base_url: str = "https://router.project-osrm.org"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    def _build_coordinates_string(self, locations: List[Location]) -> str:
        """Build coordinate string for OSRM API"""
        return ";".join([f"{loc.longitude},{loc.latitude}" for loc in locations])

    async def get_distance_matrix(
        self,
        locations: List[Location],
    ) -> List[List[float]]:
        if len(locations) < 2:
            return [[0.0]]

        coords = self._build_coordinates_string(locations)
        url = f"{self.base_url}/table/v1/driving/{coords}"

        try:
            response = await self.client.get(
                url,
                params={"annotations": "distance"},
            )
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                raise Exception(f"OSRM error: {data.get('message', 'Unknown error')}")

            return data.get("distances", [])

        except httpx.HTTPError as e:
            raise Exception(f"OSRM distance matrix error: {str(e)}")

    async def get_duration_matrix(
        self,
        locations: List[Location],
    ) -> List[List[float]]:
        if len(locations) < 2:
            return [[0.0]]

        coords = self._build_coordinates_string(locations)
        url = f"{self.base_url}/table/v1/driving/{coords}"

        try:
            response = await self.client.get(
                url,
                params={"annotations": "duration"},
            )
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                raise Exception(f"OSRM error: {data.get('message', 'Unknown error')}")

            return data.get("durations", [])

        except httpx.HTTPError as e:
            raise Exception(f"OSRM duration matrix error: {str(e)}")

    async def get_route(
        self,
        locations: List[Location],
        start_location: Optional[Location] = None,
    ) -> OptimizedRoute:
        """Get optimized route using OSRM"""
        if not locations:
            return OptimizedRoute(segments=[], total_distance_meters=0, total_duration_seconds=0, visit_order=[])

        # For full route geometry, we need to get the actual route
        # First get distance matrix for optimization
        distance_matrix = await self.get_distance_matrix(locations)
        duration_matrix = await self.get_duration_matrix(locations)

        # Simple nearest-neighbor optimization using matrix
        n = len(locations)
        unvisited = set(range(n))
        route_order = []

        # Start from first location or start_location
        current_idx = 0
        if start_location:
            # Find closest location to start
            min_dist = float('inf')
            for i, loc in enumerate(locations):
                if i in unvisited:
                    # Approximate with haversine
                    pass
        else:
            current_idx = 0

        unvisited.remove(current_idx)
        route_order.append(locations[current_idx].id)

        while unvisited:
            nearest_idx = min(
                unvisited,
                key=lambda i: distance_matrix[current_idx][i]
            )
            route_order.append(locations[nearest_idx].id)
            current_idx = nearest_idx
            unvisited.remove(nearest_idx)

        # Get full route geometry from OSRM
        route_locations = [locations[route_order.index(loc_id)] for loc_id in route_order]
        coords = self._build_coordinates_string(route_locations)

        try:
            response = await self.client.get(
                f"{self.base_url}/route/v1/driving/{coords}",
                params={
                    "overview": "full",
                    "geometries": "geojson",
                    "steps": "true",
                },
            )
            response.raise_for_status()
            data = response.json()

            if data.get("code") != "Ok":
                raise Exception(f"OSRM route error: {data.get('message', 'Unknown error')}")

            route_data = data["routes"][0]
            geometry = route_data.get("geometry")
            total_distance = route_data.get("distance", 0)
            total_duration = route_data.get("duration", 0)

            # Build segments from route legs
            segments = []
            legs = route_data.get("legs", [])

            for i, leg in enumerate(legs):
                if i < len(route_order) - 1:
                    from_loc = next(l for l in route_locations if l.id == route_order[i])
                    to_loc = next(l for l in route_locations if l.id == route_order[i + 1])
                    segments.append(RouteSegment(
                        from_location=from_loc,
                        to_location=to_loc,
                        distance_meters=leg.get("distance", 0),
                        duration_seconds=leg.get("duration", 0),
                        geometry=None,  # Could extract from steps
                    ))

            return OptimizedRoute(
                segments=segments,
                total_distance_meters=total_distance,
                total_duration_seconds=total_duration,
                visit_order=route_order,
            )

        except httpx.HTTPError as e:
            # Fallback to simple routing
            raise Exception(f"OSRM route error: {str(e)}")


class RouteOptimizer:
    """
    High-level route optimization service.
    Automatically selects best available routing provider.
    """

    def __init__(self):
        self.engines: Dict[RoutingProvider, RoutingEngine] = {
            RoutingProvider.HAVERSINE: HaversineRoutingEngine(),
        }
        self._osrm_engine: Optional[OSRMRoutingEngine] = None

    def add_osrm(self, base_url: str = "https://router.project-osrm.org"):
        """Add OSRM routing engine"""
        self._osrm_engine = OSRMRoutingEngine(base_url)
        self.engines[RoutingProvider.OSRM] = self._osrm_engine

    def get_engine(self, provider: RoutingProvider = RoutingProvider.HAVERSINE) -> RoutingEngine:
        """Get routing engine by provider"""
        if provider not in self.engines:
            # Fallback to haversine
            return self.engines[RoutingProvider.HAVERSINE]
        return self.engines[provider]

    async def optimize_route(
        self,
        locations: List[Location],
        start_location: Optional[Location] = None,
        provider: RoutingProvider = RoutingProvider.HAVERSINE,
    ) -> OptimizedRoute:
        """
        Optimize route through all locations.
        
        Args:
            locations: List of locations to visit
            start_location: Optional starting location
            provider: Routing provider to use
            
        Returns:
            OptimizedRoute with visit order and segments
        """
        engine = self.get_engine(provider)
        return await engine.get_route(locations, start_location)

    async def get_distance_matrix(
        self,
        locations: List[Location],
        provider: RoutingProvider = RoutingProvider.HAVERSINE,
    ) -> List[List[float]]:
        engine = self.get_engine(provider)
        return await engine.get_distance_matrix(locations)

    async def close(self):
        if self._osrm_engine:
            await self._osrm_engine.close()


# Global optimizer instance
route_optimizer = RouteOptimizer()