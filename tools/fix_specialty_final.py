import pathlib
import re

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")
models_dir = backend / "app" / "models"

# ============ FIX 1: Doctor — add back_populates to organization ============
doc_file = models_dir / "doctor.py"
content = doc_file.read_text(encoding="utf-8")

# Add back_populates="doctors" to organization relationship
content = content.replace(
    'organization = relationship("Organization")',
    'organization = relationship("Organization", back_populates="doctors")'
)

doc_file.write_text(content, encoding="utf-8")
print("OK - Doctor.organization now has back_populates='doctors'")

# ============ FIX 2: DoctorSpecialty — remove broken 'doctors' relationship ============
ds_file = models_dir / "doctor_specialty.py"
content = ds_file.read_text(encoding="utf-8")

# Remove the line: doctors: Mapped[List["Doctor"]] = relationship(back_populates="specialty")
lines = content.split("\n")
new_lines = []
removed = []
for line in lines:
    if "doctors" in line and "relationship" in line and "back_populates" in line:
        removed.append(line.strip())
        continue
    new_lines.append(line)

content = "\n".join(new_lines)

# Also remove the 'specialty' import if it references something missing
# (no need — we didn't import Specialty)

# Fix: DoctorSpecialty.id needs uuid default
if "import uuid" not in content.split("\n")[0:6]:
    content = "import uuid\n" + content
content = content.replace(
    '    id: Mapped[str] = mapped_column(String(36), primary_key=True)',
    '    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))'
)

# Add back_populates to organization
content = content.replace(
    'organization: Mapped["Organization"] = relationship()',
    'organization: Mapped["Organization"] = relationship(back_populates="specialties")'
)

ds_file.write_text(content, encoding="utf-8")
if removed:
    for r in removed:
        print(f"OK - removed broken line: {r}")

# ============ FIX 3: Organization — add specialties relationship ============
org_file = models_dir / "organization.py"
content = org_file.read_text(encoding="utf-8")

if "specialties = relationship" not in content:
    content = content.replace(
        '    doctors = relationship("Doctor", back_populates="organization", cascade="all,delete-orphan")',
        '    doctors = relationship("Doctor", back_populates="organization", cascade="all,delete-orphan")\n    specialties = relationship("DoctorSpecialty", back_populates="organization", cascade="all,delete-orphan")'
    )
    org_file.write_text(content, encoding="utf-8")
    print("OK - Organization.specialties added")

print("\n=== DONE ===")
print("\nNow restart backend:")
print("  uvicorn app.main:app --reload --port 8000")