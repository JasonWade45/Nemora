"""Diagnose the migration state."""
from sqlalchemy import text
from app.db.session import engine

def main():
    with engine.connect() as conn:
        # 1) What tables exist?
        print("=" * 60)
        print("TABLES")
        print("=" * 60)
        tables = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)).fetchall()
        for (t,) in tables:
            print(f"  - {t}")
        print(f"  TOTAL: {len(tables)}")

        # 2) What indexes exist on doctor_locations?
        print()
        print("=" * 60)
        print("INDEXES on doctor_locations")
        print("=" * 60)
        try:
            idxs = conn.execute(text("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'doctor_locations'
            """)).fetchall()
            for (name, defn) in idxs:
                print(f"  - {name}")
            if not idxs:
                print("  (no indexes)")
        except Exception as e:
            print(f"  ERROR: {e}")

        # 3) What does alembic_version say?
        print()
        print("=" * 60)
        print("ALEMBIC VERSION")
        print("=" * 60)
        try:
            v = conn.execute(text("SELECT version_num FROM alembic_version")).fetchall()
            for (ver,) in v:
                print(f"  {ver}")
        except Exception as e:
            print(f"  ERROR: {e}")

        # 4) Any leftover type names?
        print()
        print("=" * 60)
        print("ENUM TYPES in public")
        print("=" * 60)
        try:
            types = conn.execute(text("""
                SELECT typname FROM pg_type t
                JOIN pg_namespace n ON t.typnamespace = n.oid
                WHERE n.nspname = 'public' AND t.typtype = 'e'
                ORDER BY typname
            """)).fetchall()
            for (t,) in types:
                print(f"  - {t}")
            if not types:
                print("  (no enums)")
        except Exception as e:
            print(f"  ERROR: {e}")

if __name__ == "__main__":
    main()