"""Vercel serverless entry point for Nemora FastAPI."""
import os
import sys

# Add project root to Python path
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.main import app  # noqa: E402

# Vercel expects `app`