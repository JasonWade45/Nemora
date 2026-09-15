import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OSMPlaceCache(Base):
    __tablename__ = "osm_place_cache"
    __table_args__ = (
        UniqueConstraint("source", "osm_type", "osm_id", name="uq_osm_place_source_type_id"),
        CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_osm_place_lat"),
        CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_osm_place_lng"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source: Mapped[str] = mapped_column(String(30), nullable=False, index=True, default="OSM")
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    osm_id: Mapped[str] = mapped_column(String(64), nullable=False)
    osm_type: Mapped[str] = mapped_column(String(20), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    opening_hours: Mapped[str | None] = mapped_column(String(255), nullable=True)

    raw_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
