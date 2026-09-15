import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class DoctorWorkplace(Base):
    __tablename__ = "doctor_workplaces"
    __table_args__ = (
        UniqueConstraint("doctor_id", "workplace_id", name="uq_doctor_workplace_pair"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("doctors.id", ondelete="CASCADE"), index=True, nullable=False
    )
    workplace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workplaces.id", ondelete="CASCADE"), index=True, nullable=False
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    doctor = relationship("Doctor", back_populates="workplace_links")
    workplace = relationship("Workplace", back_populates="doctor_links")
