"""add user phone and specialties

Revision ID: f0cbe8702067
Revises: 15d752024ad7
Create Date: 2026-09-15

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "f0cbe8702067"
down_revision: Union[str, None] = "15d752024ad7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=50), nullable=True))
    op.add_column(
        "users",
        sa.Column("specialties_json", sa.Text(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("users", "specialties_json")
    op.drop_column("users", "phone")