import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class VisitProduct(Base):
    __tablename__ = "visit_products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    visit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("visits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )

    visit: Mapped["Visit"] = relationship(back_populates="visit_products")
    product: Mapped["Product"] = relationship(back_populates="visit_products")

    __table_args__ = (
        UniqueConstraint("visit_id", "product_id", name="uq_visit_product"),
        Index("ix_visit_products_visit", "visit_id"),
        Index("ix_visit_products_product", "product_id"),
    )