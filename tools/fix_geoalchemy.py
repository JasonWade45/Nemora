import pathlib

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")

# Remove unused geoalchemy2 import from visit.py
visit_file = backend / "app" / "models" / "visit.py"
content = visit_file.read_text(encoding="utf-8")
content = content.replace("from geoalchemy2 import Geography\n", "")
visit_file.write_text(content, encoding="utf-8")
print("OK - removed geoalchemy2 from visit.py")

# Remove from visit_product.py too if it exists
vp_file = backend / "app" / "models" / "visit_product.py"
vp_content = vp_file.read_text(encoding="utf-8")
if "geoalchemy2" in vp_content:
    vp_content = vp_content.replace("from geoalchemy2 import Geography\n", "")
    vp_file.write_text(vp_content, encoding="utf-8")
    print("OK - removed geoalchemy2 from visit_product.py")