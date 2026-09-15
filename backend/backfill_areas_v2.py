"""Backfill doctor.area using coordinates + keyword fallback."""
import re
import math
from sqlalchemy import text
from app.db.session import engine


# مناطق الإسكندرية بإحداثياتها الفعلية
# (اسم المنطقة، lat، lng، نصف القطر بالأمتار)
AREAS_WITH_COORDS = [
    # غرب الإسكندرية
    ("الهانوفيل",       31.1265, 29.7815, 2500),
    ("العجمي",          31.1094, 29.7710, 3000),
    ("البيطاش",         31.1245, 29.7885, 2000),
    ("الدخيلة",         31.1330, 29.8120, 2500),
    ("الورديان",        31.1618, 29.8605, 2000),
    ("القباري",         31.1748, 29.8707, 1500),
    ("المكس",           31.1580, 29.8370, 2500),
    ("الأنفوشي",        31.2075, 29.8795, 1500),
    ("كرموز",           31.1995, 29.8840, 1500),
    ("غبريال",          31.1955, 29.8910, 1000),
    ("محرم بك",         31.1945, 29.9010, 1500),
    ("العطارين",        31.1955, 29.8940, 1200),
    ("المنشية",         31.2010, 29.8960, 1200),
    ("باب شرق",         31.2010, 29.9035, 1000),
    ("اللبان",          31.2030, 29.9075, 1000),
    ("محطة الرمل",      31.2020, 29.9000, 1200),
    # شرق ووسط
    ("الحضرة",          31.2100, 29.9255, 1500),
    ("فكتوريا",         31.2135, 29.9380, 1200),
    ("سموحة",           31.2145, 29.9430, 2000),
    ("سيدي جابر",       31.2175, 29.9425, 1500),
    ("كليوباترا",       31.2230, 29.9450, 1200),
    ("رشدي",            31.2100, 29.9355, 1200),
    ("سبورتنج",         31.2135, 29.9305, 1200),
    ("جليم",            31.2250, 29.9540, 1200),
    ("مصطفى كامل",      31.2200, 29.9330, 1200),
    ("المندرة",         31.2300, 29.9600, 1800),
    ("العصافرة",        31.2360, 29.9650, 1500),
    ("سيدي بشر",        31.2390, 29.9700, 1800),
    ("المنتزه",         31.2500, 29.9830, 2500),
    ("المعمورة",        31.2840, 30.0180, 3000),
    ("أبو قير",         31.3180, 30.0630, 2500),
    ("المتراس",         31.2000, 29.9000, 800),
    ("السيوف",          31.2200, 29.9550, 1200),
    ("الأزاريطة",       31.2000, 29.9160, 1000),
    ("الشاطبي",         31.2160, 29.9355, 1000),
    ("كامب شيزار",      31.2120, 29.9255, 1000),
    ("الإبراهيمية",     31.2080, 29.9270, 1000),
    ("زيزينيا",         31.2270, 29.9475, 1000),
    ("سابا باشا",       31.2380, 29.9650, 1200),
    ("لوران",           31.2340, 29.9630, 1000),
    ("سان ستيفانو",     31.2400, 29.9720, 1200),
    ("السرايا",         31.2150, 29.9400, 800),
    ("العامرية",        31.0170, 29.7800, 5000),
    ("برج العرب",       30.9160, 29.5400, 8000),
]


# كلمات مفتاحية (للعناوين اللي فيها اسم المنطقة بالعربي)
AREA_KEYWORDS = {
    "الهانوفيل": ["الهانوفيل", "هانوفيل", "hanoville", "hanovil"],
    "العجمي": ["العجمي", "العجمى", "agami", "agamii"],
    "البيطاش": ["البيطاش", "بيطاش", "bitash"],
    "الدخيلة": ["الدخيلة", "الدخيله", "dekheila", "dakhila"],
    "الورديان": ["الورديان", "ورديان", "wardian"],
    "القباري": ["القباري", "قباري", "qabbari", "kabbari"],
    "المكس": ["المكس", "مكس ", "max "],
    "الأنفوشي": ["الأنفوشي", "الانفوشي", "anfushi"],
    "كرموز": ["كرموز", "karmouz"],
    "غبريال": ["غبريال", "ghabrial"],
    "محرم بك": ["محرم بك", "محرمبك", "moharam bek", "moharam"],
    "العطارين": ["العطارين", "attarin"],
    "المنشية": ["المنشية", "المنشيه", "mansheya"],
    "باب شرق": ["باب شرق", "babel sharq", "bab sharq"],
    "اللبان": ["اللبان", "labban"],
    "محطة الرمل": ["محطة الرمل", "محطه الرمل", "raml station", "raml"],
    "الحضرة": ["الحضرة", "الحضره", "hadra"],
    "فكتوريا": ["فكتوريا", "فيكتوريا", "victoria"],
    "سموحة": ["سموحة", "سموحه", "smouha"],
    "سيدي جابر": ["سيدي جابر", "سيدى جابر", "sidi gaber", "sidi gabir"],
    "كليوباترا": ["كليوباترا", "cleopatra"],
    "رشدي": ["رشدي", "رشدى", "rushdy", "roshdy"],
    "سبورتنج": ["سبورتنج", "sporting"],
    "جليم": ["جليم", "gleem", "gleam"],
    "مصطفى كامل": ["مصطفى كامل", "mustafa kamel", "mostafa kamel"],
    "المندرة": ["المندرة", "المندره", "mandara"],
    "العصافرة": ["العصافرة", "العصافره", "asafra", "asafrah"],
    "سيدي بشر": ["سيدي بشر", "سيدى بشر", "sidi bishr", "sidi beshr"],
    "المنتزه": ["المنتزه", "montazah", "montaza"],
    "المعمورة": ["المعمورة", "المعموره", "maamoura", "maamura"],
    "أبو قير": ["أبو قير", "ابو قير", "abu qir", "abuqir"],
    "السيوف": ["السيوف", "syouf", "siouf"],
    "الأزاريطة": ["الأزاريطة", "الازاريطه", "azarita"],
    "الشاطبي": ["الشاطبي", "shatby"],
    "كامب شيزار": ["كامب شيزار", "camp cesar", "camp chezar"],
    "الإبراهيمية": ["الإبراهيمية", "الابراهيميه", "ibrahimia"],
    "زيزينيا": ["زيزينيا", "zizinia"],
    "سابا باشا": ["سابا باشا", "saba pasha"],
    "لوران": ["لوران", "loran", "laurent"],
    "سان ستيفانو": ["سان ستيفانو", "san stefano"],
    "السرايا": ["السرايا", "saraya"],
    "العامرية": ["العامرية", "العامريه", "amreya", "amriya"],
    "برج العرب": ["برج العرب", "borg el arab", "burg el arab"],
}


def haversine_meters(lat1, lng1, lat2, lng2):
    R = 6371000
    toRad = math.radians
    dLat = toRad(lat2 - lat1)
    dLng = toRad(lng2 - lng1)
    a = (math.sin(dLat / 2) ** 2 +
         math.cos(toRad(lat1)) * math.cos(toRad(lat2)) * math.sin(dLng / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def detect_area_keyword(address):
    if not address:
        return None
    a = re.sub(r"\s+", " ", address.lower())
    for area, keywords in AREA_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in a:
                return area
    return None


def detect_area_coords(lat, lng):
    """Find closest area center within its radius."""
    if lat is None or lng is None:
        return None
    best = None
    best_dist = float("inf")
    for (name, alat, alng, radius) in AREAS_WITH_COORDS:
        d = haversine_meters(lat, lng, alat, alng)
        if d <= radius and d < best_dist:
            best = name
            best_dist = d
    return best


def main():
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, address, latitude, longitude, area FROM doctors
        """)).fetchall()

        print(f"Total doctors: {len(rows)}")
        updated = 0
        from_keyword = 0
        from_coords = 0
        unmatched = 0
        by_area: dict[str, int] = {}

        for (doc_id, address, lat, lng, existing) in rows:
            # 1) Try keyword (more accurate — explicit)
            area = detect_area_keyword(address)
            src = "keyword"
            # 2) Fallback to coordinates
            if not area:
                area = detect_area_coords(lat, lng)
                src = "coords"
            # 3) If still nothing, keep existing (from v1)
            if not area:
                area = existing
                src = "existing"

            if area:
                conn.execute(
                    text("UPDATE doctors SET area = :a WHERE id = :i"),
                    {"a": area, "i": doc_id},
                )
                by_area[area] = by_area.get(area, 0) + 1
                updated += 1
                if src == "keyword":
                    from_keyword += 1
                elif src == "coords":
                    from_coords += 1
            else:
                unmatched += 1

        conn.commit()

        print()
        print(f"Updated: {updated}")
        print(f"  - from keywords: {from_keyword}")
        print(f"  - from coordinates: {from_coords}")
        print(f"Unmatched: {unmatched}")
        print()
        print("Distribution by area:")
        for area, cnt in sorted(by_area.items(), key=lambda x: -x[1]):
            print(f"  {area:25s} → {cnt}")


if __name__ == "__main__":
    main()