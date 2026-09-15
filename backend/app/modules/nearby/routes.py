from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.models.enums import PriorityLevel
from app.models.user import User
from app.modules.audit.service import create_audit_log
from app.modules.nearby.service import NearbySearchService
from app.providers.maps.overpass import OverpassMapsProvider
from app.schemas.nearby import (
    NearbySearchResponse,
    NearbyType,
    OSMImportRequest,
    OSMImportResponse,
)

router = APIRouter(prefix="/nearby", tags=["nearby"])


@router.get("", response_model=NearbySearchResponse)
def search_nearby(
    nearby_type: NearbyType = Query(alias="type"),
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    radius: int = Query(default=5000, ge=100, le=50000),
    limit: int = Query(default=50, ge=1, le=200),
    specialty: str | None = Query(default=None, max_length=120),
    priority: PriorityLevel | None = Query(default=None),
    include_external: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> NearbySearchResponse:
    service = NearbySearchService(db)
    items = service.search(
        organization_id=current_user.organization_id,
        lat=lat,
        lng=lng,
        radius_meters=radius,
        nearby_type=nearby_type,
        limit=limit,
        specialty=specialty,
        priority=priority.value if priority else None,
        include_external=include_external,
    )

    return NearbySearchResponse(
        items=items,
        total=len(items),
        center_lat=lat,
        center_lng=lng,
        radius_meters=radius,
        generated_at=datetime.now(UTC),
    )


@router.post("/import-osm", response_model=OSMImportResponse)
def import_osm_places(
    payload: OSMImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER)),
) -> OSMImportResponse:
    provider = OverpassMapsProvider()
    service = NearbySearchService(db)

    imported, updated, skipped, total_received = service.import_external_places(
        provider=provider,
        lat=payload.lat,
        lng=payload.lng,
        radius_meters=payload.radius_meters,
        categories=payload.categories,
    )

    create_audit_log(
        db,
        organization_id=current_user.organization_id,
        actor_user_id=current_user.id,
        action="OSM_PLACES_IMPORTED",
        entity="OSMPlaceCache",
        entity_id=f"{payload.lat}:{payload.lng}",
        metadata={
            "radius_meters": payload.radius_meters,
            "categories": [item.value for item in payload.categories],
            "imported": imported,
            "updated": updated,
            "skipped": skipped,
            "total_received": total_received,
        },
    )
    db.commit()

    return OSMImportResponse(
        imported=imported,
        updated=updated,
        skipped=skipped,
        total_received=total_received,
    )


@router.get("/categories", response_model=list[str])
def list_nearby_categories(
    _: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
) -> list[str]:
    return [item.value for item in NearbyType]
