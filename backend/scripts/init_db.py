#!/usr/bin/env python
"""
Database initialization script for PharmaTrack FastAPI backend.
Run this after starting PostgreSQL with PostGIS.
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import init_db, engine
from app.models import *  # noqa: F401,F403
from app.core.config import settings
from sqlalchemy import text


async def main():
    print(f"Initializing database: {settings.database_url}")
    
    try:
        # Test connection
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            print("✓ Database connection successful")
            
            # Enable PostGIS
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis_topology"))
            print("✓ PostGIS extension enabled")
        
        # Create tables
        await init_db()
        print("✓ All tables created successfully")
        
        print("\nDatabase initialization complete!")
        print("You can now run the FastAPI server with:")
        print("  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload")
        
    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())