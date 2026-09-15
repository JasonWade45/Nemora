import pathlib
import re

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")
models_dir = backend / "app" / "models"

# Step 1: Find all files with back_populates="specialties"
print("=== SCANNING ===\n")
hits = []
for f in models_dir.glob("*.py"):
    if f.name == "__init__.py":
        continue
    content = f.read_text(encoding="utf-8")
    if 'back_populates="specialties"' in content or "back_populates='specialties'" in content:
        hits.append(f)
        print(f"FOUND in: {f.name}")
        # Show context lines
        for i, line in enumerate(content.split("\n"), 1):
            if "specialties" in line and "relationship" in line.lower() or 'back_populates="specialties"' in line:
                print(f"   Line {i}: {line.strip()}")

print(f"\n=== Total files with back_populates=specialties: {len(hits)} ===\n")

# Step 2: Check Organization model
org_file = models_dir / "organization.py"
org_content = org_file.read_text(encoding="utf-8")
has_specialties = "specialties = relationship" in org_content or "specialties: Mapped" in org_content

print(f"Organization has 'specialties' relationship? {'YES' if has_specialties else 'NO'}\n")

# Step 3: Apply fix — remove back_populates="specialties" from the other side
# This is the safest approach since Organization may not need this link
for f in hits:
    content = f.read_text(encoding="utf-8")
    
    # Remove , back_populates="specialties" or back_populates="specialties",
    content = content.replace(', back_populates="specialties"', '')
    content = content.replace('back_populates="specialties", ', '')
    content = content.replace('back_populates="specialties"', '')
    
    f.write_text(content, encoding="utf-8")
    print(f"OK - removed 'back_populates=specialties' from {f.name}")

print("\n=== DONE ===")
print("Restart backend now:")
print("  uvicorn app.main:app --reload --port 8000")