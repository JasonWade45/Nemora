"""Entry point for FastAPI Cloud."""
import sys
from pathlib import Path

# Add backend/ to Python path so 'app' package is importable
HERE = Path(__file__).parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from app.main import app  # noqa: E402, F401

__all__ = ["app"]