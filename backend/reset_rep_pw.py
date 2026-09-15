"""Reset Mahmoud's password so we can test the rep flow."""
from sqlalchemy import text
from app.db.session import engine
from app.core.security import hash_password

NEW_PASSWORD = "RepPass2025!"

with engine.connect() as conn:
    result = conn.execute(
        text("UPDATE users SET password_hash = :h WHERE email = :e"),
        {"h": hash_password(NEW_PASSWORD), "e": "Mahmoud@nemora.com"},
    )
    conn.commit()
    print(f"Rows updated: {result.rowcount}")
    print(f"New password: {NEW_PASSWORD}")