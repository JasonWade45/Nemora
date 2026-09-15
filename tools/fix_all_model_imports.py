import pathlib
import re

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")
models_dir = backend / "app" / "models"

fixed = []
for f in models_dir.glob("*.py"):
    if f.name in ("__init__.py", "base.py"):
        continue
    content = f.read_text(encoding="utf-8")
    original = content
    needs_write = False

    # Fix Base import
    if "from app.db.session import Base" in content:
        content = content.replace(
            "from app.db.session import Base",
            "from app.models.base import Base"
        )
        needs_write = True

    # Add enum if missing but used
    if "str, enum.Enum" in content or "enum.Enum" in content:
        if "import enum" not in content.split("\n")[0:5] and not content.startswith("import enum"):
            # Insert at very top
            content = "import enum\n" + content
            needs_write = True

    # Add uuid if missing but mapped_column primary key uses default
    if "default=lambda: str(uuid.uuid4())" in content and "import uuid" not in content.split("\n")[0:6]:
        # Insert after import enum if exists
        if content.startswith("import enum\n"):
            content = content.replace("import enum\n", "import enum\nimport uuid\n", 1)
        else:
            content = "import uuid\n" + content
        needs_write = True

    if needs_write and content != original:
        f.write_text(content, encoding="utf-8")
        fixed.append(f.name)

if fixed:
    print("Fixed files:")
    for name in fixed:
        print("  -", name)
else:
    print("No files needed fixing.")

print("\n✅ Done!")