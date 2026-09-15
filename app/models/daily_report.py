import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    manager_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    report_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_visits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_visits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    doctors_visited: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    revenue: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    shift_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    shift_ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())