from __future__ import annotations

import math
from datetime import UTC, datetime

from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.models.doctor_workplace import DoctorWorkplace
from app.models.osm_place_cache import OSMPlaceCache
from app.models.enums import WorkplaceStatus
from app.models.workplace import Workplace
from app.providers.maps.base import ExternalPlace, MapsProvider
from app.schemas.nearby import NearbyItem, NearbySource, NearbyType


_FACILITY_TO_NEARBY_TYPE: dict[str, NearbyType] = {
    "DOCTOR_OFFICE": NearbyType.DOCTOR,
    "CLINIC": NearbyType.CLINIC,
    "HOSPITAL": NearbyType.HOSPITAL,
    "PHARMACY": NearbyType.PHARMACY,
    "DENTAL_CENTER": NearbyType.DENTIST,
    "MEDICAL_CENTER": NearbyType.MEDICAL_CENTER,
}

_NEARBY_TYPE_TO_FACILITY: dict[NearbyType, list[str]] = {
    NearbyType.CLINIC: ["CLINIC"],
    NearbyType.HOSPITAL: ["HOSPITAL"],
    NearbyType.PHARMACY: ["PHARMACY"],
    NearbyType.DENTIST: ["DENTAL_CENTER"],
    NearbyType.MEDICAL_CENTER: ["MEDICAL_CENTER"],
}


class NearbySearchService:
    def __init__(self, db: Session):
        self.db = db
        bind = db.get_bind()
        self.dialect = bind.dialect.name if bind is not None else "unknown"

    def search(
        self,
        *,
        organization_id: str,
        lat: float,
        lng: float,
        radius_meters: int,
        nearby_type: NearbyType,
        limit: int,
        specialty: str | None,
        priority: str | None,
        include_external: bool,
    ) -> list[NearbyItem]:
        if nearby_type == NearbyType.DOCTOR:
            internal_items = self._search_doctors(
                organization_id=organization_id,
                lat=lat,
                lng=lng,
                radius_meters=radius_meters,
                limit=limit,
                specialty=specialty,
                priority=priority,
            )
        else:
            internal_items = self._search_workplaces(
                organization_id=organization_id,
                lat=lat,
                lng=lng,
                radius_meters=radius_meters,
                limit=limit,
                nearby_type=nearby_type,
            )

        if include_external:
            external_items = self._search_cached_external(
                lat=lat,
                lng=lng,
                radius_meters=radius_meters,
                limit=limit,
                nearby_type=nearby_type,
            )
            merged = internal_items + external_items
            merged.sort(key=lambda item: item.distance_meters)
            return merged[:limit]

        return internal_items[:limit]

    def import_external_places(
        self,
        *,
        provider: MapsProvider,
        lat: float,
        lng: float,
        radius_meters: int,
        categories: list[NearbyType],
    ) -> tuple[int, int, int, int]:
        places = provider.search_healthcare_places(
            lat=lat,
            lng=lng,
            radius_meters=radius_meters,
            categories=categories,
        )

        imported = 0
        updated = 0
        skipped = 0

        for place in places:
            existing = (
                self.db.query(OSMPlaceCache)
                .filter(
                    OSMPlaceCache.source == place.source,
                    OSMPlaceCache.osm_type == place.osm_type,
                    OSMPlaceCache.osm_id == place.osm_id,
                )
                .first()
            )

            if existing is None:
                new_item = OSMPlaceCache(
                    source=place.source,
                    category=place.category.value,
                    osm_id=place.osm_id,
                    osm_type=place.osm_type,
                    name=place.name,
                    latitude=place.latitude,
                    longitude=place.longitude,
                    address=place.address,
                    city=place.city,
                    state=place.state,
                    zip_code=place.zip_code,
                    phone=place.phone,
                    website=place.website,
                    opening_hours=place.opening_hours,
                    raw_payload=place.raw_payload,
                )
                self.db.add(new_item)
                imported += 1
                continue

            changed = _apply_external_place_update(existing, place)
            if changed:
                existing.last_synced_at = datetime.now(UTC)
                updated += 1
            else:
                skipped += 1

        self.db.commit()
        return imported, updated, skipped, len(places)

    def _search_doctors(
        self,
        *,
        organization_id: str,
        lat: float,
        lng: float,
        radius_meters: int,
        limit: int,
        specialty: str | None,
        priority: str | None,
    ) -> list[NearbyItem]:
        if self.dialect == "postgresql":
            return self._search_doctors_postgres(
                organization_id=organization_id,
                lat=lat,
                lng=lng,
                radius_meters=radius_meters,
                limit=limit,
                specialty=specialty,
                priority=priority,
            )
        return self._search_doctors_fallback(
            organization_id=organization_id,
            lat=lat,
            lng=lng,
            radius_meters=radius_meters,
            limit=limit,
            specialty=specialty,
            priority=priority,
        )

    def _search_doctors_postgres(
        self,
        *,
        organization_id: str,
        lat: float,
        lng: float,
        radius_meters: int,
        limit: int,
        specialty: str | None,
        priority: str | None,
    ) -> list[NearbyItem]:
        sql = text(
            """
            SELECT DISTINCT ON (d.id)
                d.id::text AS id,
                d.full_name AS name,
                d.specialty AS specialty,
                d.priority::text AS priority,
                w.latitude AS latitude,
                w.longitude AS longitude,
                w.address AS address,
                w.city AS city,
                w.state AS state,
                w.zip_code AS zip_code,
                COALESCE(NULLIF(d.phone, ''), w.phone) AS phone,
                w.website AS website,
                w.opening_hours AS opening_hours,
                ST_DistanceSphere(
                    ST_SetSRID(ST_MakePoint(w.longitude, w.latitude), 4326),
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                ) AS distance_meters
            FROM doctors d
            JOIN doctor_workplaces dw
                ON dw.doctor_id = d.id
               AND dw.organization_id = :organization_id
            JOIN workplaces w
                ON w.id = dw.workplace_id
               AND w.organization_id = :organization_id
            WHERE d.organization_id = :organization_id
              AND w.latitude IS NOT NULL
              AND w.longitude IS NOT NULL
              AND ST_DWithin(
                ST_SetSRID(ST_MakePoint(w.longitude, w.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius_meters
              )
              AND (:specialty IS NULL OR d.specialty ILIKE :specialty_like)
              AND (:priority IS NULL OR d.priority::text = :priority)
            ORDER BY d.id, distance_meters ASC
            LIMIT :limit;
            """
        )

        rows = self.db.execute(
            sql,
            {
                "organization_id": organization_id,
                "lat": lat,
                "lng": lng,
                "radius_meters": radius_meters,
                "specialty": specialty,
                "specialty_like": f"%{specialty}%" if specialty else None,
                "priority": priority,
                "limit": limit,
            },
        ).mappings()

        return [
            NearbyItem(
                id=row["id"],
                name=row["name"],
                latitude=float(row["latitude"]),
                longitude=float(row["longitude"]),
                address=row["address"],
                city=row["city"],
                state=row["state"],
                zip_code=row["zip_code"],
                phone=row["phone"],
                website=row["website"],
                opening_hours=row["opening_hours"],
                distance_meters=float(row["distance_meters"]),
                category=NearbyType.DOCTOR,
                source=NearbySource.INTERNAL,
                specialty=row["specialty"],
                priority=row["priority"],
            )
            for row in rows
        ]

    def _search_doctors_fallback(
        self,
        *,
        organization_id: str,
        lat: float,
        lng: float,
        radius_meters: int,
        limit: int,
        specialty: str | None,
        priority: str | None,
    ) -> list[NearbyItem]:
        query = (
            self.db.query(Doctor, Workplace)
            .join(DoctorWorkplace, DoctorWorkplace.doctor_id == Doctor.id)
            .join(Workplace, Workplace.id == DoctorWorkplace.workplace_id)
            .filter(
                Doctor.organization_id == organization_id,
                DoctorWorkplace.organization_id == organization_id,
                Workplace.organization_id == organization_id,
                Workplace.latitude.isnot(None),
                Workplace.longitude.isnot(None),
            )
        )

        if specialty:
            query = query.filter(Doctor.specialty.ilike(f"%{specialty}%"))
        if priority:
            query = query.filter(Doctor.priority == priority)

        nearest_per_doctor: dict[str, NearbyItem] = {}
        for doctor, workplace in query.all():
            distance = _haversine_meters(lat, lng, workplace.latitude or 0.0, workplace.longitude or 0.0)
            if distance > radius_meters:
                continue

            current = nearest_per_doctor.get(doctor.id)
            if current is not None and current.distance_meters <= distance:
                continue

            nearest_per_doctor[doctor.id] = NearbyItem(
                id=doctor.id,
                name=doctor.full_name,
                latitude=float(workplace.latitude or 0.0),
                longitude=float(workplace.longitude or 0.0),
                address=workplace.address,
                city=workplace.city,
                state=workplace.state,
                zip_code=workplace.zip_code,
                phone=doctor.phone or workplace.phone,
                website=workplace.website,
                opening_hours=workplace.opening_hours,
                distance_meters=distance,
                category=NearbyType.DOCTOR,
                source=NearbySource.INTERNAL,
                specialty=doctor.specialty,
                priority=doctor.priority.value if hasattr(doctor.priority, "value") else str(doctor.priority),
            )

        results = sorted(nearest_per_doctor.values(), key=lambda item: item.distance_meters)
        return results[:limit]

    def _search_workplaces(
        self,
        *,
        organization_id: str,
        lat: float,
        lng: float,
        radius_meters: int,
        limit: int,
        nearby_type: NearbyType,
    ) -> list[NearbyItem]:
        facilities = _NEARBY_TYPE_TO_FACILITY.get(nearby_type)
        if not facilities:
            return []

        if self.dialect == "postgresql":
            sql = text(
                """
                SELECT
                    w.id::text AS id,
                    w.name AS name,
                    w.facility_type::text AS facility_type,
                    w.latitude AS latitude,
                    w.longitude AS longitude,
                    w.address AS address,
                    w.city AS city,
                    w.state AS state,
                    w.zip_code AS zip_code,
                    w.phone AS phone,
                    w.website AS website,
                    w.opening_hours AS opening_hours,
                    ST_DistanceSphere(
                        ST_SetSRID(ST_MakePoint(w.longitude, w.latitude), 4326),
                        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                    ) AS distance_meters
                FROM workplaces w
                WHERE w.organization_id = :organization_id
                  AND w.status::text = 'ACTIVE'
                  AND w.facility_type::text IN :facility_types
                  AND w.latitude IS NOT NULL
                  AND w.longitude IS NOT NULL
                  AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint(w.longitude, w.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radius_meters
                  )
                ORDER BY distance_meters ASC
                LIMIT :limit;
                """
            ).bindparams(bindparam("facility_types", expanding=True))

            rows = self.db.execute(
                sql,
                {
                    "organization_id": organization_id,
                    "lat": lat,
                    "lng": lng,
                    "radius_meters": radius_meters,
                    "facility_types": facilities,
                    "limit": limit,
                },
            ).mappings()

            return [
                NearbyItem(
                    id=row["id"],
                    name=row["name"],
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    address=row["address"],
                    city=row["city"],
                    state=row["state"],
                    zip_code=row["zip_code"],
                    phone=row["phone"],
                    website=row["website"],
                    opening_hours=row["opening_hours"],
                    distance_meters=float(row["distance_meters"]),
                    category=_FACILITY_TO_NEARBY_TYPE.get(row["facility_type"], nearby_type),
                    source=NearbySource.INTERNAL,
                )
                for row in rows
            ]

        query = self.db.query(Workplace).filter(
            Workplace.organization_id == organization_id,
            Workplace.status == WorkplaceStatus.ACTIVE,
            Workplace.facility_type.in_(facilities),
            Workplace.latitude.isnot(None),
            Workplace.longitude.isnot(None),
        )
        results: list[NearbyItem] = []
        for workplace in query.all():
            distance = _haversine_meters(lat, lng, workplace.latitude or 0.0, workplace.longitude or 0.0)
            if distance > radius_meters:
                continue
            results.append(
                NearbyItem(
                    id=workplace.id,
                    name=workplace.name,
                    latitude=float(workplace.latitude or 0.0),
                    longitude=float(workplace.longitude or 0.0),
                    address=workplace.address,
                    city=workplace.city,
                    state=workplace.state,
                    zip_code=workplace.zip_code,
                    phone=workplace.phone,
                    website=workplace.website,
                    opening_hours=workplace.opening_hours,
                    distance_meters=distance,
                    category=_FACILITY_TO_NEARBY_TYPE.get(
                        workplace.facility_type.value
                        if hasattr(workplace.facility_type, "value")
                        else str(workplace.facility_type),
                        nearby_type,
                    ),
                    source=NearbySource.INTERNAL,
                )
            )

        results.sort(key=lambda item: item.distance_meters)
        return results[:limit]

    def _search_cached_external(
        self,
        *,
        lat: float,
        lng: float,
        radius_meters: int,
        limit: int,
        nearby_type: NearbyType,
    ) -> list[NearbyItem]:
        if self.dialect == "postgresql":
            sql = text(
                """
                SELECT
                    p.id::text AS id,
                    p.name AS name,
                    p.latitude AS latitude,
                    p.longitude AS longitude,
                    p.address AS address,
                    p.city AS city,
                    p.state AS state,
                    p.zip_code AS zip_code,
                    p.phone AS phone,
                    p.website AS website,
                    p.opening_hours AS opening_hours,
                    p.osm_id AS osm_id,
                    p.osm_type AS osm_type,
                    p.category AS category,
                    p.source AS source,
                    ST_DistanceSphere(
                        ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326),
                        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                    ) AS distance_meters
                FROM osm_place_cache p
                WHERE p.category = :category
                  AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radius_meters
                  )
                ORDER BY distance_meters ASC
                LIMIT :limit;
                """
            )
            rows = self.db.execute(
                sql,
                {
                    "lat": lat,
                    "lng": lng,
                    "category": nearby_type.value,
                    "radius_meters": radius_meters,
                    "limit": limit,
                },
            ).mappings()
            return [
                NearbyItem(
                    id=row["id"],
                    name=row["name"],
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    address=row["address"],
                    city=row["city"],
                    state=row["state"],
                    zip_code=row["zip_code"],
                    phone=row["phone"],
                    website=row["website"],
                    opening_hours=row["opening_hours"],
                    distance_meters=float(row["distance_meters"]),
                    category=NearbyType(row["category"]),
                    source=NearbySource.OSM if str(row["source"]).lower() == "osm" else NearbySource.INTERNAL,
                    osm_id=row["osm_id"],
                    osm_type=row["osm_type"],
                )
                for row in rows
            ]

        query = self.db.query(OSMPlaceCache).filter(OSMPlaceCache.category == nearby_type.value)
        candidates: list[NearbyItem] = []
        for place in query.all():
            distance = _haversine_meters(lat, lng, place.latitude, place.longitude)
            if distance > radius_meters:
                continue
            candidates.append(
                NearbyItem(
                    id=place.id,
                    name=place.name,
                    latitude=place.latitude,
                    longitude=place.longitude,
                    address=place.address,
                    city=place.city,
                    state=place.state,
                    zip_code=place.zip_code,
                    phone=place.phone,
                    website=place.website,
                    opening_hours=place.opening_hours,
                    distance_meters=distance,
                    category=NearbyType(place.category),
                    source=NearbySource.OSM if place.source.lower() == "osm" else NearbySource.INTERNAL,
                    osm_id=place.osm_id,
                    osm_type=place.osm_type,
                )
            )

        candidates.sort(key=lambda item: item.distance_meters)
        return candidates[:limit]


def _apply_external_place_update(existing: OSMPlaceCache, incoming: ExternalPlace) -> bool:
    changed = False
    fields: dict[str, str | float | None] = {
        "category": incoming.category.value,
        "name": incoming.name,
        "latitude": incoming.latitude,
        "longitude": incoming.longitude,
        "address": incoming.address,
        "city": incoming.city,
        "state": incoming.state,
        "zip_code": incoming.zip_code,
        "phone": incoming.phone,
        "website": incoming.website,
        "opening_hours": incoming.opening_hours,
        "raw_payload": incoming.raw_payload,
    }
    for field_name, value in fields.items():
        if getattr(existing, field_name) != value:
            setattr(existing, field_name, value)
            changed = True
    return changed


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    earth_radius = 6371e3
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2) * math.sin(delta_phi / 2)
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lng / 2) * math.sin(delta_lng / 2)
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius * c
