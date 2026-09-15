"""Quick DB inspection script for NEMORA."""
from sqlalchemy import text
from app.db.session import engine

TABLES_OF_INTEREST = [
    "organizations", "users", "doctors", "visits",
    "visit_products", "follow_ups", "targets", "products",
    "doctor_specialty", "doctor_specialties",
    "audit_logs", "notifications", "subscriptions",
]

def main():
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)).fetchall()
        all_tables = [r[0] for r in rows]

        print("=" * 60)
        print(f"Total tables in public schema: {len(all_tables)}")
        print("=" * 60)
        for t in all_tables:
            print(f"  - {t}")

        print()
        print("=" * 60)
        print("Row counts (key tables)")
        print("=" * 60)
        for t in TABLES_OF_INTEREST:
            if t in all_tables:
                try:
                    n = conn.execute(text('SELECT COUNT(*) FROM "' + t + '"')).scalar()
                    print(f"  {t:30s} -> {n}")
                except Exception as e:
                    print(f"  {t:30s} -> ERROR: {e}")
            else:
                print(f"  {t:30s} -> (table not found)")

        print()
        print("=" * 60)
        print("PostGIS")
        print("=" * 60)
        try:
            ver = conn.execute(text("SELECT PostGIS_Version()")).scalar()
            print(f"  PostGIS version: {ver}")
        except Exception as e:
            print(f"  PostGIS not available: {e}")

if __name__ == "__main__":
    main()