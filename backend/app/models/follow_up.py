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
    Integer,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class FollowUpActionType(str, enum.Enum):
    CALL = "CALL"
    VISIT = "VISIT"
    SEND_INFO = "SEND_INFO"
    OTHER = "OTHER"


class FollowUpStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rep_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    visit_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("visits.id", ondelete="SET NULL"), nullable=True
    )
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    action_type: Mapped[FollowUpActionType] = mapped_column(Enum(FollowUpActionType), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[FollowUpStatus] = mapped_column(Enum(FollowUpStatus), default=FollowUpStatus.PENDING, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    rep: Mapped["User"] = relationship(back_populates="follow_ups")
    doctor: Mapped["Doctor"] = relationship(back_populates="follow_ups")
    visit: Mapped[Optional["Visit"]] = relationship(back_populates="follow_ups")
    organization: Mapped["Organization"] = relationship(back_populates="follow_ups")

    __table_args__ = (
        Index("ix_follow_ups_rep", "rep_id"),
        Index("ix_follow_ups_doctor", "doctor_id"),
        Index("ix_follow_ups_organization", "organization_id"),
        Index("ix_follow_ups_due_date", "due_date"),
        Index("ix_follow_ups_status", "status"),
    )