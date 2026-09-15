import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    Index,
    Boolean,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geography

from app.models.base import Base


class DoctorLocation(Base):
    __tablename__ = "doctor_locations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[Geography]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False), nullable=True
    )
    latitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    doctor: Mapped["Doctor"] = relationship(back_populates="locations")
    schedules: Mapped[List["DoctorSchedule"]] = relationship(back_populates="location")
    visits: Mapped[List["Visit"]] = relationship(back_populates="doctor_location")

    __table_args__ = (Index("ix_doctor_locations_doctor", "doctor_id"),)