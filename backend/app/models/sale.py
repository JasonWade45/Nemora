import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    String,
    Text,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class SaleStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rep_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    visit_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("visits.id", ondelete="SET NULL"), nullable=True, index=True
    )

    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    unit_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    total_price: Mapped[float] = mapped_column(Float, nullable=False)
    total_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    profit: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    status: Mapped[SaleStatus] = mapped_column(
        Enum(SaleStatus),
        default=SaleStatus.CONFIRMED,
        nullable=False,
        index=True,
    )

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sold_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_sales_org", "organization_id"),
        Index("ix_sales_rep", "rep_id"),
        Index("ix_sales_doctor", "doctor_id"),
        Index("ix_sales_product", "product_id"),
        Index("ix_sales_sold_at", "sold_at"),
        Index("ix_sales_status", "status"),
    )