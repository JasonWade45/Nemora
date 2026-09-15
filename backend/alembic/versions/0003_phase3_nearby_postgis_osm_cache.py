"""phase3 nearby postgis osm cache

Revision ID: 0003_phase3
Revises: 0002_phase2
Create Date: 2026-09-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003_phase3"
down_revision: Union[str, None] = "0002_phase2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "osm_place_cache",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False, server_default=sa.text("'OSM'")),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("osm_id", sa.String(length=64), nullable=False),
        sa.Column("osm_type", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("state", sa.String(length=120), nullable=True),
        sa.Column("zip_code", sa.String(length=20), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("website", sa.String(length=255), nullable=True),
        sa.Column("opening_hours", sa.String(length=255), nullable=True),
        sa.Column("raw_payload", sa.Text(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_osm_place_lat"),
        sa.CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_osm_place_lng"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source", "osm_type", "osm_id", name="uq_osm_place_source_type_id"),
    )

    op.create_index("ix_osm_place_cache_source", "osm_place_cache", ["source"], unique=False)
    op.create_index("ix_osm_place_cache_category", "osm_place_cache", ["category"], unique=False)
    op.create_index("ix_osm_place_cache_city", "osm_place_cache", ["city"], unique=False)

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_workplaces_geo_gist
        ON workplaces
        USING GIST (geography(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)))
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_osm_place_cache_geo_gist
        ON osm_place_cache
        USING GIST (geography(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)));
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_osm_place_cache_geo_gist;")
    op.execute("DROP INDEX IF EXISTS ix_workplaces_geo_gist;")

    op.drop_index("ix_osm_place_cache_city", table_name="osm_place_cache")
    op.drop_index("ix_osm_place_cache_category", table_name="osm_place_cache")
    op.drop_index("ix_osm_place_cache_source", table_name="osm_place_cache")

    op.drop_table("osm_place_cache")
