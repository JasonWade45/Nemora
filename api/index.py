"""Vercel serverless entry point for Nemora FastAPI."""
import sys
from pathlib import Path

# Add backend to Python path
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from app.main import app  # noqa: E402

# Vercel expects `app` variable
handler = app