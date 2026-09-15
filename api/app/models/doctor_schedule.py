import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_location_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("doctor_locations.id", ondelete="SET NULL"), nullable=True
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)

    doctor: Mapped["Doctor"] = relationship(back_populates="schedules")
    location: Mapped[Optional["DoctorLocation"]] = relationship(back_populates="schedules")

    __table_args__ = (Index("ix_doctor_schedules_doctor", "doctor_id"),)