from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
    Integer,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Target(Base):
    __tablename__ = "targets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    rep_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    total_visits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_doctors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    new_doctors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    follow_ups: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    rep: Mapped["User"] = relationship(back_populates="targets")
    organization: Mapped["Organization"] = relationship(back_populates="targets")

    __table_args__ = (
        UniqueConstraint("rep_id", "month", "year", name="uq_rep_month_year"),
        Index("ix_targets_rep", "rep_id"),
        Index("ix_targets_organization", "organization_id"),
    )