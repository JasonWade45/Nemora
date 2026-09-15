import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import AssignmentStatus, PriorityLevel


class DoctorAssignment(Base):
    __tablename__ = "doctor_assignments"
    __table_args__ = (
        UniqueConstraint("organization_id", "doctor_id", "medical_rep_id", name="uq_assignment_rep_doctor"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("doctors.id", ondelete="CASCADE"), index=True, nullable=False
    )
    medical_rep_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    priority: Mapped[PriorityLevel] = mapped_column(
        SAEnum(PriorityLevel, name="prioritylevel"),
        default=PriorityLevel.MEDIUM,
        nullable=False,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    visit_frequency_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_visit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_visit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[AssignmentStatus] = mapped_column(
        SAEnum(AssignmentStatus, name="assignmentstatus"),
        default=AssignmentStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization = relationship("Organization", back_populates="doctor_assignments")
    doctor = relationship("Doctor", back_populates="assignments")
    medical_rep = relationship("User", back_populates="doctor_assignments")
