"""add is_platform to doctors

Revision ID: a1b2c3d4e5f6
Revises: 5eef593d111f
Create Date: 2026-09-18 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '5eef593d111f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('doctors', sa.Column('is_platform', sa.Boolean(), nullable=False, server_default='0'))
    op.create_index(op.f('ix_doctors_is_platform'), 'doctors', ['is_platform'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_doctors_is_platform'), table_name='doctors')
    op.drop_column('doctors', 'is_platform')
