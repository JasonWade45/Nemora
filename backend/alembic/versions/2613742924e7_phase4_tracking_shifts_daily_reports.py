"""phase4 tracking shifts daily_reports

Revision ID: 2613742924e7
Revises: 0003_phase3
Create Date: 2026-09-15 06:11:56.798149

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '2613742924e7'
down_revision: Union[str, None] = '0003_phase3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "daily_reports",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("manager_id", sa.String(length=36), nullable=True),
        sa.Column("report_date", sa.Date(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("total_visits", sa.Integer(), nullable=False),
        sa.Column("completed_visits", sa.Integer(), nullable=False),
        sa.Column("doctors_visited", sa.Integer(), nullable=False),
        sa.Column("revenue", sa.Float(), nullable=False),
        sa.Column("shift_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("shift_ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("distance_km", sa.Float(), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["manager_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_daily_reports_manager_id"), "daily_reports", ["manager_id"], unique=False)
    op.create_index(op.f("ix_daily_reports_organization_id"), "daily_reports", ["organization_id"], unique=False)
    op.create_index(op.f("ix_daily_reports_report_date"), "daily_reports", ["report_date"], unique=False)
    op.create_index(op.f("ix_daily_reports_user_id"), "daily_reports", ["user_id"], unique=False)

    op.create_table(
        "location_pings",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_location_pings_organization_id"), "location_pings", ["organization_id"], unique=False)
    op.create_index(op.f("ix_location_pings_recorded_at"), "location_pings", ["recorded_at"], unique=False)
    op.create_index(op.f("ix_location_pings_user_id"), "location_pings", ["user_id"], unique=False)
    op.create_index("ix_pings_org_user_time", "location_pings", ["organization_id", "user_id", "recorded_at"], unique=False)

    op.create_table(
        "shifts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.Enum("ACTIVE", "ENDED", name="shiftstatus"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_shifts_org_user_started", "shifts", ["organization_id", "user_id", "started_at"], unique=False)
    op.create_index(op.f("ix_shifts_organization_id"), "shifts", ["organization_id"], unique=False)
    op.create_index(op.f("ix_shifts_status"), "shifts", ["status"], unique=False)
    op.create_index(op.f("ix_shifts_user_id"), "shifts", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_shifts_user_id"), table_name="shifts")
    op.drop_index(op.f("ix_shifts_status"), table_name="shifts")
    op.drop_index(op.f("ix_shifts_organization_id"), table_name="shifts")
    op.drop_index("ix_shifts_org_user_started", table_name="shifts")
    op.drop_table("shifts")

    op.drop_index("ix_pings_org_user_time", table_name="location_pings")
    op.drop_index(op.f("ix_location_pings_user_id"), table_name="location_pings")
    op.drop_index(op.f("ix_location_pings_recorded_at"), table_name="location_pings")
    op.drop_index(op.f("ix_location_pings_organization_id"), table_name="location_pings")
    op.drop_table("location_pings")

    op.drop_index(op.f("ix_daily_reports_user_id"), table_name="daily_reports")
    op.drop_index(op.f("ix_daily_reports_report_date"), table_name="daily_reports")
    op.drop_index(op.f("ix_daily_reports_organization_id"), table_name="daily_reports")
    op.drop_index(op.f("ix_daily_reports_manager_id"), table_name="daily_reports")
    op.drop_table("daily_reports")