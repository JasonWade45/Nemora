import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class InterestLevel(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RepDoctor(Base):
    __tablename__ = "rep_doctors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    rep_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interest_level: Mapped[InterestLevel] = mapped_column(
        Enum(InterestLevel), default=InterestLevel.MEDIUM, nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    rep: Mapped["User"] = relationship(back_populates="rep_doctor_links")
    doctor: Mapped["Doctor"] = relationship(back_populates="rep_doctor_links")

    __table_args__ = (
        UniqueConstraint("rep_id", "doctor_id", name="uq_rep_doctor"),
        Index("ix_rep_doctors_rep", "rep_id"),
        Index("ix_rep_doctors_doctor", "doctor_id"),
    )