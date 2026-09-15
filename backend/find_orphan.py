"""Find the orphaned index."""
from sqlalchemy import text
from app.db.session import engine

def main():
    with engine.connect() as conn:
        print("=" * 60)
        print("Search for 'idx_doctor_locations_location'")
        print("=" * 60)

        # 1) Is it an index?
        rows = conn.execute(text("""
            SELECT
                c.relname AS object_name,
                c.relkind AS kind,
                n.nspname AS schema,
                t.relname AS parent_table
            FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            LEFT JOIN pg_index i ON i.indexrelid = c.oid
            LEFT JOIN pg_class t ON t.oid = i.indrelid
            WHERE c.relname = 'idx_doctor_locations_location'
        """)).fetchall()

        if not rows:
            print("NOT FOUND in pg_class")
        else:
            for (name, kind, schema, parent) in rows:
                kind_map = {'i': 'index', 'r': 'table', 'S': 'sequence', 'v': 'view'}
                print(f"  Object: {name}")
                print(f"  Kind:   {kind} ({kind_map.get(kind, '?')})")
                print(f"  Schema: {schema}")
                print(f"  Parent: {parent if parent else '(orphan — no table!)'}")

        # 2) All similar names
        print()
        print("=" * 60)
        print("All objects matching 'doctor_locations%'")
        print("=" * 60)
        rows = conn.execute(text("""
            SELECT c.relname, c.relkind, n.nspname
            FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname LIKE 'doctor_locations%'
               OR c.relname LIKE 'idx_doctor_locations%'
               OR c.relname LIKE 'ix_doctor_locations%'
            ORDER BY c.relname
        """)).fetchall()
        if not rows:
            print("  (nothing)")
        else:
            for (name, kind, schema) in rows:
                print(f"  [{kind}] {schema}.{name}")

if __name__ == "__main__":
    main()