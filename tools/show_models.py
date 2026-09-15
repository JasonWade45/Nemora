import pathlib
import re

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")
models_dir = backend / "app" / "models"

# ============ STEP 1: Show all 4 files ============
files_to_show = ["doctor.py", "doctor_specialty.py", "organization.py"]

for fname in files_to_show:
    f = models_dir / fname
    if f.exists():
        print("=" * 70)
        print(f"=== {fname} ===")
        print("=" * 70)
        print(f.read_text(encoding="utf-8"))
        print()
    else:
        print(f"!! {fname} NOT FOUND")
        print()

# Also search for Specialty model
print("=" * 70)
print("=== Searching for Specialty model ===")
print("=" * 70)
for f in models_dir.glob("*.py"):
    if f.name == "__init__.py":
        continue
    content = f.read_text(encoding="utf-8")
    if "class Specialty" in content:
        print(f"Found in: {f.name}")
        print(content)
        break