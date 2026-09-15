"""Inspect doctor location data to plan area filtering."""
from sqlalchemy import text
from app.db.session import engine

with engine.connect() as conn:
    print("=" * 70)
    print("Distinct STATE values:")
    print("=" * 70)
    rows = conn.execute(text("""
        SELECT state, COUNT(*) as cnt
        FROM doctors
        WHERE state IS NOT NULL
        GROUP BY state
        ORDER BY cnt DESC
    """)).fetchall()
    for (state, cnt) in rows:
        print(f"  {state:40s} → {cnt}")

    print()
    print("=" * 70)
    print("Distinct CITY values (top 20):")
    print("=" * 70)
    rows = conn.execute(text("""
        SELECT city, COUNT(*) as cnt
        FROM doctors
        WHERE city IS NOT NULL
        GROUP BY city
        ORDER BY cnt DESC
        LIMIT 20
    """)).fetchall()
    for (city, cnt) in rows:
        print(f"  {city:40s} → {cnt}")

    print()
    print("=" * 70)
    print("Sample of 15 addresses (Alexandria):")
    print("=" * 70)
    rows = conn.execute(text("""
        SELECT full_name, address, city, state
        FROM doctors
        WHERE state ILIKE '%اسكند%' OR state ILIKE '%alex%' OR city ILIKE '%اسكند%'
        LIMIT 15
    """)).fetchall()
    for (name, addr, city, state) in rows:
        print(f"\n  Name: {name}")
        print(f"  Addr: {addr}")
        print(f"  City: {city} | State: {state}")

    print()
    print("=" * 70)
    print("Sample of 15 addresses (ALL):")
    print("=" * 70)
    rows = conn.execute(text("""
        SELECT full_name, address, city, state
        FROM doctors
        LIMIT 15
    """)).fetchall()
    for (name, addr, city, state) in rows:
        print(f"\n  Name: {name}")
        print(f"  Addr: {addr}")
        print(f"  City: {city} | State: {state}")