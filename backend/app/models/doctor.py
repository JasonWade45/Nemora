import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import DoctorStatus, PriorityLevel


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True
    )
    is_platform: Mapped[bool] = mapped_column(default=False, nullable=False, index=True)

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    specialty: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)

    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    area: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[DoctorStatus] = mapped_column(
        SAEnum(DoctorStatus, name="doctorstatus"),
        default=DoctorStatus.ACTIVE,
        nullable=False,
        index=True,
    )
    priority: Mapped[PriorityLevel] = mapped_column(
        SAEnum(PriorityLevel, name="prioritylevel"),
        default=PriorityLevel.MEDIUM,
        nullable=False,
        index=True,
    )
    tags_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    working_hours_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization = relationship("Organization", back_populates="doctors")
    workplace_links = relationship("DoctorWorkplace", back_populates="doctor", cascade="all,delete-orphan")
    assignments = relationship("DoctorAssignment", back_populates="doctor", cascade="all,delete-orphan")
    locations = relationship("DoctorLocation", back_populates="doctor", cascade="all,delete-orphan")
    schedules = relationship("DoctorSchedule", back_populates="doctor", cascade="all,delete-orphan")
    visits = relationship("Visit", back_populates="doctor", cascade="all,delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="doctor", cascade="all,delete-orphan")