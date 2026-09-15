import pathlib

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")

# ============ User needs: visits, follow_ups ============
user_file = backend / "app" / "models" / "user.py"
c = user_file.read_text(encoding="utf-8")
changed = False

if "follow_ups = relationship" not in c:
    # Add after visits line
    c = c.replace(
        'visits = relationship("Visit", back_populates="rep", cascade="all,delete-orphan")',
        'visits = relationship("Visit", back_populates="rep", cascade="all,delete-orphan")\n    follow_ups = relationship("FollowUp", back_populates="rep", cascade="all,delete-orphan")'
    )
    changed = True
    print("OK - User.follow_ups added")

if changed:
    user_file.write_text(c, encoding="utf-8")

# ============ Doctor needs: visits, follow_ups ============
doc_file = backend / "app" / "models" / "doctor.py"
c = doc_file.read_text(encoding="utf-8")
changed = False

if "follow_ups = relationship" not in c:
    c = c.replace(
        'visits = relationship("Visit", back_populates="doctor", cascade="all,delete-orphan")',
        'visits = relationship("Visit", back_populates="doctor", cascade="all,delete-orphan")\n    follow_ups = relationship("FollowUp", back_populates="doctor", cascade="all,delete-orphan")'
    )
    changed = True
    print("OK - Doctor.follow_ups added")

if changed:
    doc_file.write_text(c, encoding="utf-8")

# ============ Organization needs: visits, follow_ups ============
org_file = backend / "app" / "models" / "organization.py"
c = org_file.read_text(encoding="utf-8")
changed = False

if "follow_ups = relationship" not in c:
    c = c.replace(
        'visits = relationship("Visit", back_populates="organization", cascade="all,delete-orphan")',
        'visits = relationship("Visit", back_populates="organization", cascade="all,delete-orphan")\n    follow_ups = relationship("FollowUp", back_populates="organization", cascade="all,delete-orphan")'
    )
    changed = True
    print("OK - Organization.follow_ups added")

if changed:
    org_file.write_text(c, encoding="utf-8")

# ============ Product needs: visit_products ============
prod_file = backend / "app" / "models" / "product.py"
c = prod_file.read_text(encoding="utf-8")
changed = False

if "visit_products = relationship" not in c:
    lines = c.split("\n")
    new_lines = []
    added = False
    for line in lines:
        new_lines.append(line)
        if not added and "= relationship(" in line:
            indent = len(line) - len(line.lstrip())
            new_lines.append(" " * indent + 'visit_products = relationship("VisitProduct", back_populates="product", cascade="all,delete-orphan")')
            added = True
    if added:
        c = "\n".join(new_lines)
        changed = True
        print("OK - Product.visit_products added")

if changed:
    prod_file.write_text(c, encoding="utf-8")

print("\n✅ All relationships checked!")