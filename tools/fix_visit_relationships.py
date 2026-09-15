import pathlib

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")

def add_visits_relationship(file_path, marker_line, backup_line, import_line=None):
    """Add a visits relationship to a model file."""
    f = backend / file_path
    content = f.read_text(encoding="utf-8")
    
    if "visits: Mapped" in content or "visits = relationship" in content:
        print(f"INFO - {file_path} already has visits")
        return
    
    # Add import if needed
    if import_line and import_line not in content:
        if "from typing import" not in content and "List" in import_line:
            content = content.replace(
                "from datetime import datetime",
                "from datetime import datetime\nfrom typing import List"
            )
    
    # Insert relationship before the closing (after last relationship line, or at end of class)
    if backup_line in content:
        content = content.replace(
            backup_line,
            backup_line + "\n    visits = relationship(\"Visit\", back_populates=\"rep\", cascade=\"all,delete-orphan\")"
        )
    else:
        # Fallback: add at end of class
        print(f"WARN - marker not found in {file_path}, skipping")
        return
    
    f.write_text(content, encoding="utf-8")
    print(f"OK - added visits to {file_path}")


# User model — add visits relationship
user_file = backend / "app" / "models" / "user.py"
user_content = user_file.read_text(encoding="utf-8")
if "visits = relationship" not in user_content and "visits: Mapped" not in user_content:
    user_content = user_content.replace(
        'doctor_assignments = relationship("DoctorAssignment", back_populates="medical_rep", cascade="all,delete-orphan")',
        'doctor_assignments = relationship("DoctorAssignment", back_populates="medical_rep", cascade="all,delete-orphan")\n    visits = relationship("Visit", back_populates="rep", cascade="all,delete-orphan")'
    )
    user_file.write_text(user_content, encoding="utf-8")
    print("OK - User.visits added")
else:
    print("INFO - User already has visits")

# Doctor model
doc_file = backend / "app" / "models" / "doctor.py"
doc_content = doc_file.read_text(encoding="utf-8")
if "visits = relationship" not in doc_content and "visits: Mapped" not in doc_content:
    # Add after assignments relationship
    doc_content = doc_content.replace(
        'assignments = relationship("DoctorAssignment", back_populates="doctor", cascade="all,delete-orphan")',
        'assignments = relationship("DoctorAssignment", back_populates="doctor", cascade="all,delete-orphan")\n    visits = relationship("Visit", back_populates="doctor", cascade="all,delete-orphan")'
    )
    doc_file.write_text(doc_content, encoding="utf-8")
    print("OK - Doctor.visits added")
else:
    print("INFO - Doctor already has visits")

# Organization model
org_file = backend / "app" / "models" / "organization.py"
org_content = org_file.read_text(encoding="utf-8")
if "visits = relationship" not in org_content and "visits: Mapped" not in org_content:
    # Find any existing relationship line and add after it
    lines = org_content.split("\n")
    new_lines = []
    added = False
    for line in lines:
        new_lines.append(line)
        if not added and "= relationship(" in line:
            indent = len(line) - len(line.lstrip())
            new_lines.append(" " * indent + 'visits = relationship("Visit", back_populates="organization", cascade="all,delete-orphan")')
            added = True
    if added:
        org_file.write_text("\n".join(new_lines), encoding="utf-8")
        print("OK - Organization.visits added")
    else:
        print("WARN - no relationship found in Organization, skipping")
else:
    print("INFO - Organization already has visits")

# ============ Also check visit_product.py and follow_up.py ============
print("\n--- Checking visit_product.py ---")
vp_file = backend / "app" / "models" / "visit_product.py"
print(vp_file.read_text(encoding="utf-8"))

print("\n--- Checking follow_up.py ---")
fu_file = backend / "app" / "models" / "follow_up.py"
print(fu_file.read_text(encoding="utf-8"))