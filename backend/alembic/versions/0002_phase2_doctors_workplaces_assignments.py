"""phase2 doctors workplaces assignments

Revision ID: 0002_phase2
Revises: 0001_phase1
Create Date: 2026-09-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0002_phase2"
down_revision: Union[str, None] = "0001_phase1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


priority_enum = postgresql.ENUM("LOW", "MEDIUM", "HIGH", "URGENT", name="prioritylevel", create_type=False)
doctor_status_enum = postgresql.ENUM("ACTIVE", "INACTIVE", name="doctorstatus", create_type=False)
workplace_status_enum = postgresql.ENUM("ACTIVE", "INACTIVE", name="workplacestatus", create_type=False)
assignment_status_enum = postgresql.ENUM("ACTIVE", "PAUSED", "ARCHIVED", name="assignmentstatus", create_type=False)
facility_type_enum = postgresql.ENUM(
    "DOCTOR_OFFICE",
    "CLINIC",
    "HOSPITAL",
    "PHARMACY",
    "DENTAL_CENTER",
    "MEDICAL_CENTER",
    "OTHER",
    name="facilitytype",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    priority_enum.create(bind, checkfirst=True)
    doctor_status_enum.create(bind, checkfirst=True)
    workplace_status_enum.create(bind, checkfirst=True)
    assignment_status_enum.create(bind, checkfirst=True)
    facility_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "doctors",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("specialty", sa.String(length=120), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("state", sa.String(length=120), nullable=True),
        sa.Column("zip_code", sa.String(length=20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", doctor_status_enum, nullable=False, server_default="ACTIVE"),
        sa.Column("priority", priority_enum, nullable=False, server_default="MEDIUM"),
        sa.Column("tags_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_doctors_organization_id", "doctors", ["organization_id"], unique=False)
    op.create_index("ix_doctors_full_name", "doctors", ["full_name"], unique=False)
    op.create_index("ix_doctors_specialty", "doctors", ["specialty"], unique=False)
    op.create_index("ix_doctors_city", "doctors", ["city"], unique=False)
    op.create_index("ix_doctors_zip_code", "doctors", ["zip_code"], unique=False)
    op.create_index("ix_doctors_status", "doctors", ["status"], unique=False)
    op.create_index("ix_doctors_priority", "doctors", ["priority"], unique=False)

    op.create_table(
        "workplaces",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("facility_type", facility_type_enum, nullable=False, server_default="CLINIC"),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("state", sa.String(length=120), nullable=True),
        sa.Column("zip_code", sa.String(length=20), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("website", sa.String(length=255), nullable=True),
        sa.Column("opening_hours", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", workplace_status_enum, nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("latitude IS NULL OR (latitude >= -90 AND latitude <= 90)", name="ck_workplaces_lat"),
        sa.CheckConstraint("longitude IS NULL OR (longitude >= -180 AND longitude <= 180)", name="ck_workplaces_lng"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workplaces_organization_id", "workplaces", ["organization_id"], unique=False)
    op.create_index("ix_workplaces_name", "workplaces", ["name"], unique=False)
    op.create_index("ix_workplaces_facility_type", "workplaces", ["facility_type"], unique=False)
    op.create_index("ix_workplaces_city", "workplaces", ["city"], unique=False)
    op.create_index("ix_workplaces_zip_code", "workplaces", ["zip_code"], unique=False)
    op.create_index("ix_workplaces_status", "workplaces", ["status"], unique=False)

    op.create_table(
        "doctor_workplaces",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("doctor_id", sa.String(length=36), nullable=False),
        sa.Column("workplace_id", sa.String(length=36), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workplace_id"], ["workplaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("doctor_id", "workplace_id", name="uq_doctor_workplace_pair"),
    )
    op.create_index("ix_doctor_workplaces_organization_id", "doctor_workplaces", ["organization_id"], unique=False)
    op.create_index("ix_doctor_workplaces_doctor_id", "doctor_workplaces", ["doctor_id"], unique=False)
    op.create_index("ix_doctor_workplaces_workplace_id", "doctor_workplaces", ["workplace_id"], unique=False)

    op.create_table(
        "doctor_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("doctor_id", sa.String(length=36), nullable=False),
        sa.Column("medical_rep_id", sa.String(length=36), nullable=False),
        sa.Column("priority", priority_enum, nullable=False, server_default="MEDIUM"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("follow_up_date", sa.Date(), nullable=True),
        sa.Column("visit_frequency_days", sa.Integer(), nullable=True),
        sa.Column("last_visit_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_visit_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", assignment_status_enum, nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "visit_frequency_days IS NULL OR visit_frequency_days > 0",
            name="ck_assignment_visit_frequency_days_positive",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["medical_rep_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "doctor_id", "medical_rep_id", name="uq_assignment_rep_doctor"),
    )
    op.create_index("ix_doctor_assignments_organization_id", "doctor_assignments", ["organization_id"], unique=False)
    op.create_index("ix_doctor_assignments_doctor_id", "doctor_assignments", ["doctor_id"], unique=False)
    op.create_index("ix_doctor_assignments_medical_rep_id", "doctor_assignments", ["medical_rep_id"], unique=False)
    op.create_index("ix_doctor_assignments_priority", "doctor_assignments", ["priority"], unique=False)
    op.create_index("ix_doctor_assignments_status", "doctor_assignments", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_doctor_assignments_status", table_name="doctor_assignments")
    op.drop_index("ix_doctor_assignments_priority", table_name="doctor_assignments")
    op.drop_index("ix_doctor_assignments_medical_rep_id", table_name="doctor_assignments")
    op.drop_index("ix_doctor_assignments_doctor_id", table_name="doctor_assignments")
    op.drop_index("ix_doctor_assignments_organization_id", table_name="doctor_assignments")
    op.drop_table("doctor_assignments")

    op.drop_index("ix_doctor_workplaces_workplace_id", table_name="doctor_workplaces")
    op.drop_index("ix_doctor_workplaces_doctor_id", table_name="doctor_workplaces")
    op.drop_index("ix_doctor_workplaces_organization_id", table_name="doctor_workplaces")
    op.drop_table("doctor_workplaces")

    op.drop_index("ix_workplaces_status", table_name="workplaces")
    op.drop_index("ix_workplaces_zip_code", table_name="workplaces")
    op.drop_index("ix_workplaces_city", table_name="workplaces")
    op.drop_index("ix_workplaces_facility_type", table_name="workplaces")
    op.drop_index("ix_workplaces_name", table_name="workplaces")
    op.drop_index("ix_workplaces_organization_id", table_name="workplaces")
    op.drop_table("workplaces")

    op.drop_index("ix_doctors_priority", table_name="doctors")
    op.drop_index("ix_doctors_status", table_name="doctors")
    op.drop_index("ix_doctors_zip_code", table_name="doctors")
    op.drop_index("ix_doctors_city", table_name="doctors")
    op.drop_index("ix_doctors_specialty", table_name="doctors")
    op.drop_index("ix_doctors_full_name", table_name="doctors")
    op.drop_index("ix_doctors_organization_id", table_name="doctors")
    op.drop_table("doctors")

    bind = op.get_bind()
    facility_type_enum.drop(bind, checkfirst=True)
    assignment_status_enum.drop(bind, checkfirst=True)
    workplace_status_enum.drop(bind, checkfirst=True)
    doctor_status_enum.drop(bind, checkfirst=True)
    priority_enum.drop(bind, checkfirst=True)
