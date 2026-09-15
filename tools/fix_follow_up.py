import pathlib

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")
fu_file = backend / "app" / "models" / "follow_up.py"
content = fu_file.read_text(encoding="utf-8")

# 1) Add import enum
if "import enum" not in content.split("\n")[0:5]:
    content = content.replace(
        "from datetime import datetime",
        "import enum\nimport uuid\nfrom datetime import datetime",
        1
    )
else:
    if "import uuid" not in content.split("\n")[0:5]:
        content = content.replace(
            "import enum\n",
            "import enum\nimport uuid\n",
            1
        )

# 2) Fix Base import
content = content.replace(
    "from app.db.session import Base",
    "from app.models.base import Base"
)

# 3) Fix id default
content = content.replace(
    '    id: Mapped[str] = mapped_column(String(36), primary_key=True)',
    '    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))'
)

fu_file.write_text(content, encoding="utf-8")
print("OK - follow_up.py fixed")

# Also check the first 10 lines to verify
print("\n--- First 12 lines of follow_up.py ---")
for i, line in enumerate(fu_file.read_text(encoding="utf-8").split("\n")[:12], 1):
    print(f"{i}: {line}")