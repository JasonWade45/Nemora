"""add doctor coordinates and working hours

Revision ID: 15d752024ad7
Revises: 2613742924e7
Create Date: 2026-09-15

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "15d752024ad7"
down_revision: Union[str, None] = "2613742924e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("doctors", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("doctors", sa.Column("longitude", sa.Float(), nullable=True))
    op.add_column(
        "doctors",
        sa.Column("working_hours_json", sa.Text(), nullable=False, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("doctors", "working_hours_json")
    op.drop_column("doctors", "longitude")
    op.drop_column("doctors", "latitude")