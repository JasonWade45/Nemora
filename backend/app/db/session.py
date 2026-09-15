from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()


def _build_engine(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


engine = _build_engine(settings.database_url_sync)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=Session)


def configure_database(url: str) -> None:
    global engine
    engine = _build_engine(url)
    SessionLocal.configure(bind=engine)
