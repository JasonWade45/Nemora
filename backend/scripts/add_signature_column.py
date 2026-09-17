"""Add signature_data column to visits table."""
import sqlalchemy as sa
from sqlalchemy import text

DATABASE_URL = "postgresql://postgres.lqtzorufwtllchixrgag:7%23Y3Xsewx%3FHi5%23p@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

engine = sa.create_engine(DATABASE_URL)

with engine.begin() as conn:
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'visits' AND column_name = 'signature_data'"
    ))
    if not result.fetchone():
        conn.execute(text("ALTER TABLE visits ADD COLUMN signature_data TEXT"))
        print("Added signature_data column to visits table.")
    else:
        print("Column signature_data already exists.")
