"""
Fast bulk import for FINAL_high_quality.csv → Supabase
Skips duplicate check, uses bulk insert for speed.
"""
import csv
import os
import sys
import uuid
from pathlib import Path

env_path = Path(__file__).resolve().parents[2] / "backend" / ".env"
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line.startswith("DATABASE_URL_SYNC="):
            os.environ["DATABASE_URL_SYNC"] = line.split("=", 1)[1]

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models.doctor import Doctor
from app.models.enums import DoctorStatus, PriorityLevel

CSV_FILE = Path(r"C:\Users\ATG\egypt_medical_scraper\FINAL_high_quality.csv")
BATCH = 500


def split_name(full):
    parts = full.strip().split()
    if not parts:
        return "Unknown", "-"
    if len(parts) == 1:
        return parts[0], "-"
    return parts[0], " ".join(parts[1:])


def clean_phone(raw):
    if not raw or raw.strip() in ("", "None"):
        return None
    p = raw.strip()
    if p.startswith("+20"):
        p = "0" + p[3:]
    return p[:50] if p else None


def main():
    print("=" * 60)
    print("NEMORA — Fast Bulk Import")
    print("=" * 60)

    engine = create_engine(os.environ["DATABASE_URL_SYNC"], pool_pre_ping=True, connect_args={"connect_timeout": 15})
    Session = sessionmaker(bind=engine)

    # Delete old platform doctors first
    db = Session()
    deleted = db.execute(text("DELETE FROM doctors WHERE is_platform = true"))
    db.commit()
    print(f"Deleted {deleted.rowcount} old platform doctors")

    with open(CSV_FILE, "r", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    doctors_rows = [r for r in rows if r.get("entity_type", "").strip().lower() in ("doctor", "طبيب", "دكتور")]
    print(f"Total: {len(rows)} | Doctors: {len(doctors_rows)} | Skipped: {len(rows) - len(doctors_rows)}")

    success = 0
    failed = 0
    batch = []

    for i, row in enumerate(doctors_rows, 1):
        try:
            raw_name = row.get("name", "").strip()
            if not raw_name:
                continue

            first_name, last_name = split_name(raw_name)

            main_sp = (row.get("main_specialty") or "").strip()
            sub_sp = (row.get("sub_specialty") or "").strip()
            if main_sp and sub_sp and sub_sp.lower() != main_sp.lower():
                specialty = f"{main_sp} - {sub_sp}"
            elif main_sp:
                specialty = main_sp
            elif sub_sp:
                specialty = sub_sp
            else:
                specialty = None

            phone = clean_phone(row.get("all_phones"))
            if not phone:
                phone = clean_phone(row.get("phone_1"))
            if not phone:
                phone = clean_phone(row.get("hotline"))

            address = (row.get("address") or "").strip()[:255] or None
            if not address:
                address = (row.get("geocoded_address") or "").strip()[:255] or None

            city = (row.get("city") or "").strip()[:120] or None
            if not city:
                city = (row.get("governorate") or "").strip()[:120] or None

            lat = None
            lng = None
            try:
                lat = float(row.get("latitude", "") or 0) or None
            except (ValueError, TypeError):
                pass
            try:
                lng = float(row.get("longitude", "") or 0) or None
            except (ValueError, TypeError):
                pass

            doctor = Doctor(
                id=str(uuid.uuid4()),
                organization_id=None,
                is_platform=True,
                first_name=first_name[:100],
                last_name=last_name[:100],
                full_name=raw_name[:255],
                specialty=specialty[:120] if specialty else None,
                phone=phone,
                address=address,
                city=city,
                latitude=lat,
                longitude=lng,
                status=DoctorStatus.ACTIVE,
                priority=PriorityLevel.MEDIUM,
                tags_json="[]",
                working_hours_json="{}",
            )
            batch.append(doctor)
            success += 1

        except Exception as e:
            failed += 1

        if len(batch) >= BATCH:
            db.bulk_save_objects(batch)
            db.commit()
            batch = []
            print(f"   [{i}/{len(doctors_rows)}] committed {success} doctors...")

    if batch:
        db.bulk_save_objects(batch)
        db.commit()

    db.close()
    engine.dispose()

    print("\n" + "=" * 60)
    print(f"  DONE — {success} doctors imported, {failed} failed")
    print("=" * 60)


if __name__ == "__main__":
    main()
