import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    settings: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    users = relationship("User", back_populates="organization", cascade="all,delete-orphan")
    visits = relationship("Visit", back_populates="organization", cascade="all,delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="organization", cascade="all,delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="organization", cascade="all,delete-orphan")
    doctors = relationship("Doctor", back_populates="organization", cascade="all,delete-orphan")
    specialties = relationship("DoctorSpecialty", back_populates="organization", cascade="all,delete-orphan")
    workplaces = relationship("Workplace", back_populates="organization", cascade="all,delete-orphan")
    doctor_assignments = relationship("DoctorAssignment", back_populates="organization", cascade="all,delete-orphan")
    products = relationship("Product", back_populates="organization", cascade="all,delete-orphan")
    targets = relationship("Target", back_populates="organization", cascade="all,delete-orphan")
    subscription_details = relationship("Subscription", back_populates="organization", cascade="all,delete-orphan", uselist=False)