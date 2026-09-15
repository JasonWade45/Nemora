"""Add RBAC columns + link admin to rep + create manager."""
from sqlalchemy import text
from app.db.session import engine
from app.core.security import hash_password


def main():
    with engine.connect() as conn:
        # 1) users.supervisor_id
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id VARCHAR(36)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_supervisor_id ON users(supervisor_id)"))
        try:
            conn.execute(text(
                "ALTER TABLE users ADD CONSTRAINT fk_users_supervisor "
                "FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE SET NULL"
            ))
            print("OK - FK users.supervisor_id")
        except Exception as e:
            print(f"INFO - FK likely exists: {e}")

        # 2) visits new fields
        conn.execute(text("ALTER TABLE visits ADD COLUMN IF NOT EXISTS report_sent_to_admin_at TIMESTAMP WITH TIME ZONE"))
        conn.execute(text("ALTER TABLE visits ADD COLUMN IF NOT EXISTS report_forwarded_to_manager_at TIMESTAMP WITH TIME ZONE"))
        conn.execute(text("ALTER TABLE visits ADD COLUMN IF NOT EXISTS admin_notes TEXT"))
        print("OK - visits report columns added")

        conn.commit()

        # 3) Link admin@nemora as Mahmoud's supervisor
        admin = conn.execute(text(
            "SELECT id FROM users WHERE email = 'admin@nemora.com'"
        )).fetchone()
        rep = conn.execute(text(
            "SELECT id FROM users WHERE email = 'Mahmoud@nemora.com'"
        )).fetchone()

        if admin and rep:
            conn.execute(
                text("UPDATE users SET supervisor_id = :s WHERE id = :r"),
                {"s": admin[0], "r": rep[0]},
            )
            conn.commit()
            print(f"OK - linked Mahmoud -> admin as supervisor")

        # 4) Create manager if not exists
        mgr = conn.execute(text(
            "SELECT id FROM users WHERE email = 'manager@nemora.com'"
        )).fetchone()

        if not mgr and admin:
            org_id = conn.execute(text(
                "SELECT organization_id FROM users WHERE id = :i"
            ), {"i": admin[0]}).scalar()
            conn.execute(
                text(
                    "INSERT INTO users (id, organization_id, email, full_name, password_hash, role, is_active, specialties_json) "
                    "VALUES (gen_random_uuid()::text, :org, 'manager@nemora.com', 'NEMORA Manager', :pw, 'MANAGER', true, '[]')"
                ),
                {"org": org_id, "pw": hash_password("ManagerPass2025!")},
            )
            conn.commit()
            print("OK - created manager@nemora.com / ManagerPass2025!")
        else:
            print("INFO - manager already exists")

    print("\n✅ Migration done")


if __name__ == "__main__":
    main()