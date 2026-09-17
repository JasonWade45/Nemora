import enum
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Boolean,
    Integer,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class VisitPurpose(str, enum.Enum):
    DETAILING = "DETAILING"
    FOLLOW_UP = "FOLLOW_UP"
    PRODUCT_LAUNCH = "PRODUCT_LAUNCH"
    SAMPLE_DELIVERY = "SAMPLE_DELIVERY"
    MEDICAL_EDUCATION = "MEDICAL_EDUCATION"
    RELATIONSHIP_BUILDING = "RELATIONSHIP_BUILDING"


class VisitStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    CHECKED_IN = "CHECKED_IN"
    COMPLETED = "COMPLETED"
    MISSED = "MISSED"
    CANCELLED = "CANCELLED"


class DoctorResponse(str, enum.Enum):
    VERY_INTERESTED = "VERY_INTERESTED"
    INTERESTED = "INTERESTED"
    NEUTRAL = "NEUTRAL"
    NOT_INTERESTED = "NOT_INTERESTED"


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rep_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_location_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("doctor_locations.id", ondelete="SET NULL"), nullable=True
    )
    visit_purpose: Mapped[VisitPurpose] = mapped_column(Enum(VisitPurpose), nullable=False)
    status: Mapped[VisitStatus] = mapped_column(Enum(VisitStatus), default=VisitStatus.PLANNED, nullable=False)
    planned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    checked_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    checkin_latitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    checkin_longitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    checkout_latitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    checkout_longitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    distance_from_doctor: Mapped[Optional[float]] = mapped_column(nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    doctor_response: Mapped[Optional[DoctorResponse]] = mapped_column(Enum(DoctorResponse), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    next_follow_up_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_follow_up_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    next_follow_up_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feedback_positive: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feedback_objections: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feedback_next_steps: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feedback_overall: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    report_sent_to_admin_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    report_forwarded_to_manager_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signature_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    rep: Mapped["User"] = relationship(back_populates="visits")
    doctor: Mapped["Doctor"] = relationship(back_populates="visits")
    doctor_location: Mapped[Optional["DoctorLocation"]] = relationship(back_populates="visits")
    organization: Mapped["Organization"] = relationship(back_populates="visits")
    visit_products: Mapped[List["VisitProduct"]] = relationship(back_populates="visit", cascade="all, delete-orphan")
    follow_ups: Mapped[List["FollowUp"]] = relationship(back_populates="visit")

    __table_args__ = (
        Index("ix_visits_rep", "rep_id"),
        Index("ix_visits_doctor", "doctor_id"),
        Index("ix_visits_organization", "organization_id"),
        Index("ix_visits_created_at", "created_at"),
        Index("ix_visits_status", "status"),
    )