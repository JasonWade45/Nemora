"""Backfill doctor.area from address using keyword matching."""
import re
from sqlalchemy import text
from app.db.session import engine

# ترتيب مهم: الأطول والأخص أولاً (عشان "سيدي جابر" قبل "جابر")
AREA_KEYWORDS = [
    # غرب الإسكندرية
    ("الهانوفيل", ["الهانوفيل", "هانوفيل", "hanoville", "hanovil"]),
    ("العجمي", ["العجمي", "العجمى", "agami", "agamii"]),
    ("البيطاش", ["البيطاش", "بيطاش", "bitash"]),
    ("الدخيلة", ["الدخيلة", "الدخيله", "dekheila", "dakhila"]),
    ("الورديان", ["الورديان", "ورديان", "wardian"]),
    ("القباري", ["القباري", "قباري", "qabbari", "kabbari"]),
    ("المكس", ["المكس", "مكس ", "max "]),
    ("الأنفوشي", ["الأنفوشي", "الانفوشي", "anfushi"]),
    ("كرموز", ["كرموز", "karmouz"]),
    ("غبريال", ["غبريال", "ghabrial"]),
    ("محرم بك", ["محرم بك", "محرمبك", "moharam bek", "moharam"]),
    ("العطارين", ["العطارين", "attarin"]),
    ("الميناء", ["الميناء", "mina "]),
    ("المنشية", ["المنشية", "المنشيه", "mansheya"]),
    ("باب شرق", ["باب شرق", "babel sharq", "bab sharq"]),
    ("اللبان", ["اللبان", "labban"]),
    ("محطة الرمل", ["محطة الرمل", "محطه الرمل", "الرمل", "raml", "raml station"]),
    ("الرمل", ["رمل "]),
    # شرق ووسط
    ("الحضرة", ["الحضرة", "الحضره", "hadra"]),
    ("فكتوريا", ["فكتوريا", "فيكتوريا", "victoria"]),
    ("سموحة", ["سموحة", "سموحه", "smouha"]),
    ("سيدي جابر", ["سيدي جابر", "سيدى جابر", "sidi gaber", "sidi gabir"]),
    ("كليوباترا", ["كليوباترا", "cleopatra"]),
    ("رشدي", ["رشدي", "رشدى", "rushdy", "roshdy"]),
    ("سبورتنج", ["سبورتنج", "سبورتنج", "sporting"]),
    ("جليم", ["جليم", "gleem", "gleam"]),
    ("مصطفى كامل", ["مصطفى كامل", "مصطفى كامل", "mustafa kamel", "mostafa kamel"]),
    ("المندرة", ["المندرة", "المندره", "mandara"]),
    ("العصافرة", ["العصافرة", "العصافره", "asafra", "asafrah"]),
    ("سيدي بشر", ["سيدي بشر", "سيدى بشر", "sidi bishr", "sidi beshr"]),
    ("المنتزه", ["المنتزه", "montazah", "montaza"]),
    ("المعمورة", ["المعمورة", "المعموره", "maamoura", "maamura"]),
    ("أبو قير", ["أبو قير", "ابو قير", "abu qir", "abuqir"]),
    ("باكوس", ["باكوس", "bakos", "bakous"]),
    # مناطق إدارية عامة
    ("وسط البلد", ["وسط البلد", "وسط المدينه", "downtown"]),
    ("العامرية", ["العامرية", "العامريه", "amreya", "amriya"]),
    ("برج العرب", ["برج العرب", "borg el arab", "burg el arab"]),
    ("المتراس", ["المتراس", "metroos"]),
    ("السيوف", ["السيوف", "syouf", "siouf"]),
    ("الأزاريطة", ["الأزاريطة", "الازاريطه", "azarita"]),
    ("الشاطبي", ["الشاطبي", "shatby"]),
    ("كامب شيزار", ["كامب شيزار", "camp cesar", "camp chezar"]),
    ("الإبراهيمية", ["الإبراهيمية", "الابراهيميه", "ibrahimia"]),
    ("زيزينيا", ["زيزينيا", "zizinia"]),
    ("سابا باشا", ["سابا باشا", "saba pasha"]),
    ("لوران", ["لوران", "loran", "laurent"]),
    ("سان ستيفانو", ["سان ستيفانو", "سان استفانو", "san stefano"]),
    ("السرايا", ["السرايا", "saraya"]),
    ("محرم بك", ["محرم بك", "moharem bek"]),
]


def detect_area(address: str | None) -> str | None:
    if not address:
        return None
    a = address.lower()
    # نظّف المسافات العربية
    a = re.sub(r"\s+", " ", a)
    for canonical, keywords in AREA_KEYWORDS:
        for kw in keywords:
            if kw.lower() in a:
                return canonical
    return None


def main():
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, address, area FROM doctors
        """)).fetchall()

        print(f"Total doctors: {len(rows)}")
        updated = 0
        by_area: dict[str, int] = {}
        unmatched = 0

        for (doc_id, address, existing_area) in rows:
            detected = detect_area(address)
            if detected:
                conn.execute(
                    text("UPDATE doctors SET area = :a WHERE id = :i"),
                    {"a": detected, "i": doc_id},
                )
                by_area[detected] = by_area.get(detected, 0) + 1
                updated += 1
            else:
                unmatched += 1

        conn.commit()

        print()
        print(f"Updated: {updated}")
        print(f"Unmatched (no area detected): {unmatched}")
        print()
        print("Distribution by area:")
        for area, cnt in sorted(by_area.items(), key=lambda x: -x[1]):
            print(f"  {area:25s} → {cnt}")


if __name__ == "__main__":
    main()