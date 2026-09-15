"""Vercel serverless entry point for Nemora FastAPI."""
import sys
from pathlib import Path

# Add api/ directory to Python path
HERE = Path(__file__).parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from app.main import app  # noqa: E402

# Vercel Python runtime expects `app`