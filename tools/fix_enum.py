import pathlib

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")
visit_file = backend / "app" / "models" / "visit.py"
content = visit_file.read_text(encoding="utf-8")

# Add "import enum" if missing
if "import enum\n" not in content and "import enum " not in content:
    content = content.replace(
        "import uuid\n",
        "import enum\nimport uuid\n"
    )
    visit_file.write_text(content, encoding="utf-8")
    print("OK - added import enum")
else:
    print("INFO - enum already imported")