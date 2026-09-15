import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import FacilityType, WorkplaceStatus


class Workplace(Base):
    __tablename__ = "workplaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    facility_type: Mapped[FacilityType] = mapped_column(
        SAEnum(FacilityType, name="facilitytype"),
        default=FacilityType.CLINIC,
        nullable=False,
        index=True,
    )

    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    opening_hours: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[WorkplaceStatus] = mapped_column(
        SAEnum(WorkplaceStatus, name="workplacestatus"),
        default=WorkplaceStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization = relationship("Organization", back_populates="workplaces")
    doctor_links = relationship("DoctorWorkplace", back_populates="workplace", cascade="all,delete-orphan")
