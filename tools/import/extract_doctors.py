"""
Extract doctors from Google Maps scraped CSVs.
- Excludes veterinary and non-medical entities
- Categorizes by medical specialty (Arabic)
- Outputs clean CSV with specialty column
"""
import csv
import re
from pathlib import Path
from urllib.parse import unquote
from collections import Counter

INPUT_DIR = Path(__file__).parent
OUTPUT_FILE = INPUT_DIR / "doctors_by_specialty.csv"

SPECIALTY_RULES = [
    ("أسنان",          ["أسنان", "اسنان", "dental", "تقويم الأسنان", "تقويم اسنان", "زراعة الأسنان", "زراعة وتجميل الأسنان"]),
    ("جلدية",          ["جلدية", "جلديه", "أمراض جلدية", "الجلدية", "dermat", "تجميل الجلد", "الليزر"]),
    ("عيون",           ["عيون", "العيون", "بصريات", "ophthalm", "طب وجراحة العيون", "طب و جراحة العيون"]),
    ("أنف وأذن وحنجرة", ["أنف وأذن", "أنف و أذن", "انف واذن", "ENT", "أنف وأذن وحنجرة"]),
    ("نساء وتوليد",    ["نساء وتوليد", "نساء و توليد", "أمراض نسائية", "نسائية", "توليد", "نساء"]),
    ("أطفال",          ["أطفال", "اطفال", "pediatric", "حديثي الولادة", "حديثى الولادة", "أطفال وحديثي"]),
    ("عظام",           ["عظام", "تقويم عظام", "جراحة العظام", "جراحات العظام", "مفاصل", "العمود الفقري", "orthoped"]),
    ("قلب",            ["قلب", "أمراض القلب", "cardio", "أوعية دموية", "أوعية"]),
    ("باطنة",          ["باطنة", "باطنه", "أمراض باطنة", "internal"]),
    ("جهاز هضمي",      ["جهاز هضمي", "الجهاز الهضمي", "هضمي", "كبد", "gastro", "مناظير"]),
    ("مسالك بولية",    ["مسالك", "مسالك بولية", "ذكورة", "urology"]),
    ("صدر وحساسية",    ["صدر", "الرئة", "الجهاز التنفسي", "حساسية", "pulmonary"]),
    ("مخ وأعصاب",      ["مخ وأعصاب", "المخ والاعصاب", "أعصاب", "اعصاب", "جهاز عصبي", "neurolog"]),
    ("نفسية",          ["نفسي", "نفسية", "طب نفسي", "psych"]),
    ("تجميل",          ["تجميل", "جراح تجميل", "جراحة التجميل", "تجميل وليزر"]),
    ("أورام",          ["أورام", "الأورام", "oncolog"]),
    ("علاج طبيعي",     ["علاج طبيعي", "العلاج الطبيعي", "physio", "تأهيل"]),
    ("طب أسرة",        ["طب الأسرة", "طب اسره", "طب عام", "family"]),
    ("مختبرات",        ["مختبر", "معمل", "تحاليل", "labs"]),
    ("مستشفى",         ["مستشفى", "hospital", "مستشفيات"]),
    ("عيادة عامة",     ["عيادة طبية", "مركز طبي", "عيادة متخصصة", "clinic", "medical center", "طبيب", "دكتور"]),
]

EXCLUDE_RULES = [
    "بيطري", "veterinar", "vet ",
    "صيدلية", "صيدليات", "pharmacy",
    "مطعم", "مقهى", "كافيه", "restaurant",
    "مأذون", "ماذون", "ترخيص الزواج", "mazoun",
    "متجر", "محل هواتف", "محل موبايلات", "محل أعلاف",
    "فيلا", "شالية", "شاليه", "مبنى سكني", "مجمع سكني",
    "مستشار إدارة أعمال", "مكتب الشركات",
    "المركز التعليمي", "أكاديمية", "academy",
    "حجامة", "طب بديل",
    "خدمة السيارات", "خدمات السيارات",
    "محلل نفسي",
]

def extract_latlng(url):
    if not url: return None, None
    m = re.search(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", url)
    return (float(m.group(1)), float(m.group(2))) if m else (None, None)

def extract_name_from_url(url):
    if not url: return ""
    m = re.search(r"/place/([^/]+)/", url)
    if not m: return ""
    return unquote(m.group(1)).replace("+", " ").strip()

def clean_phone(p):
    if not p: return ""
    return re.sub(r"[^\d+]", "", p)

def is_excluded(name, category):
    blob = f"{name} {category}".lower()
    return any(kw.lower() in blob for kw in EXCLUDE_RULES)

def classify(name, category):
    blob = f"{name} {category}".lower()
    for specialty, keywords in SPECIALTY_RULES:
        for kw in keywords:
            if kw.lower() in blob:
                return specialty
    return ""

def process_csv(filepath):
    results = []
    with open(filepath, "r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            url = ""
            for key in row.keys():
                if key and "hfpxzc href" in key:
                    url = row.get(key, "") or ""
                    break
            if not url: continue

            name = ""
            for key in ["qBF1Pd", "xxVWCe"]:
                if key in row and row[key]:
                    name = row[key].strip(); break
            if not name:
                name = extract_name_from_url(url)
            if not name: continue

            category = (row.get("W4Efsd", "") or "").strip()
            if is_excluded(name, category): continue

            specialty = classify(name, category)
            if not specialty: continue

            phone = clean_phone(row.get("UsdlK", "") or "")

            address = ""
            for key in ["W4Efsd (3)", "W4Efsd (4)", "W4Efsd (5)"]:
                v = (row.get(key, "") or "").strip()
                if v and v not in ["·", "Closed", "Open 24 hours"] and not v.startswith("·"):
                    if not re.match(r"^(Open|Closed|Opens|Closes)", v):
                        address = v; break

            lat, lng = extract_latlng(url)

            results.append({
                "name": name, "specialty": specialty, "category": category,
                "phone": phone, "address": address,
                "latitude": lat, "longitude": lng, "source_url": url,
            })
    return results

def main():
    csv_files = sorted([f for f in INPUT_DIR.glob("*.csv") if f.name != OUTPUT_FILE.name])
    print(f"Found {len(csv_files)} CSV files\n")
    all_rows = []
    for f in csv_files:
        rows = process_csv(f)
        print(f"  {f.name}: {len(rows)} medical rows")
        all_rows.extend(rows)

    seen = set(); unique = []
    for r in all_rows:
        key = (r["name"].strip(), r["phone"].strip())
        if key in seen: continue
        seen.add(key); unique.append(r)

    unique.sort(key=lambda x: (x["specialty"], x["name"]))

    with open(OUTPUT_FILE, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["name","specialty","category","phone","address","latitude","longitude","source_url"])
        w.writeheader()
        for r in unique: w.writerow(r)

    counts = Counter(r["specialty"] for r in unique)
    print(f"\nTotal medical rows (before dedupe): {len(all_rows)}")
    print(f"After dedupe: {len(unique)}\n")
    print("Distribution by specialty:")
    for spec, cnt in counts.most_common():
        print(f"   {spec:25} {cnt}")
    print(f"\nSaved: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()