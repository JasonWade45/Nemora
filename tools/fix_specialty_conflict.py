import pathlib
import re

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")
models_dir = backend / "app" / "models"

# ============ STEP 1: Show current content ============
print("=== Current doctor_specialty.py ===\n")
ds_file = models_dir / "doctor_specialty.py"
content = ds_file.read_text(encoding="utf-8")
print(content)
print("\n=== Applying fix ===\n")

# ============ STEP 2: Remove broken 'doctors' relationship line ============
# Match any line like: 'doctors = relationship("Doctor", back_populates="...")'
lines = content.split("\n")
new_lines = []
removed = []
for line in lines:
    if re.match(r"^\s*doctors\s*=\s*relationship\(", line):
        removed.append(line.strip())
        continue  # skip this line
    new_lines.append(line)

new_content = "\n".join(new_lines)
ds_file.write_text(new_content, encoding="utf-8")

if removed:
    for r in removed:
        print(f"REMOVED: {r}")
else:
    print("No 'doctors' relationship found to remove.")

# ============ STEP 3: Also check Doctor model for back_populates='doctors' ============
doc_file = models_dir / "doctor.py"
doc_content = doc_file.read_text(encoding="utf-8")
if 'back_populates="doctors"' in doc_content:
    doc_content = doc_content.replace(', back_populates="doctors"', '')
    doc_content = doc_content.replace('back_populates="doctors", ', '')
    doc_content = doc_content.replace('back_populates="doctors"', '')
    doc_file.write_text(doc_content, encoding="utf-8")
    print("OK - removed back_populates='doctors' from doctor.py")

# ============ STEP 4: Check if specialty_obj relationship also broken ============
if "specialty_obj" in doc_content:
    # Remove it too if it tries to link via FK that doesn't exist
    new_doc_lines = []
    for line in doc_content.split("\n"):
        if "specialty_obj" in line and "relationship" in line:
            continue
        new_doc_lines.append(line)
    doc_file.write_text("\n".join(new_doc_lines), encoding="utf-8")
    print("OK - removed specialty_obj from doctor.py")

print("\n=== DONE ===")
print("\nNow restart backend:")
print("  uvicorn app.main:app --reload --port 8000")