import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    Index,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class DoctorSpecialty(Base):
    __tablename__ = "doctor_specialties"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    organization: Mapped["Organization"] = relationship(back_populates="specialties")

    __table_args__ = (Index("ix_doctor_specialties_organization", "organization_id"),)