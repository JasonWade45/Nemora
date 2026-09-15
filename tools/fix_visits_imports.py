import pathlib

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")
routes_file = backend / "app" / "modules" / "visits" / "routes.py"
content = routes_file.read_text(encoding="utf-8")

# Remove geoalchemy2 import (unused — we use raw SQL text())
content = content.replace(
    "from geoalchemy2.functions import ST_Distance, ST_GeogFromText, ST_MakePoint, ST_SetSRID\n",
    ""
)

# Also remove unused func import if present
content = content.replace(
    "from sqlalchemy import func, text\n",
    "from sqlalchemy import text\n"
)

routes_file.write_text(content, encoding="utf-8")
print("OK - cleaned imports in visits/routes.py")