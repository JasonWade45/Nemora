"""Make admin@nemora.com a super admin."""
from sqlalchemy import text
from app.db.session import engine

with engine.connect() as conn:
    r = conn.execute(text(
        "UPDATE users SET is_super_admin = TRUE WHERE email = 'admin@nemora.com'"
    ))
    conn.commit()
    print(f"Updated rows: {r.rowcount}")