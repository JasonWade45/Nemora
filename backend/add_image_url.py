from sqlalchemy import text
from app.db.session import engine

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)"))
    conn.commit()
    print("OK - image_url column added")