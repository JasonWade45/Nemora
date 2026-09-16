"""Helpers for organization focus areas."""
import json

from sqlalchemy.orm import Session

from app.models.organization import Organization


def get_focus_areas(db: Session, organization_id: str) -> list[str]:
    """Return focus areas list for an organization. Empty list = all areas allowed."""
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org or not org.settings:
        return []
    try:
        settings = json.loads(org.settings)
        areas = settings.get("focus_areas", [])
        if isinstance(areas, list):
            return [str(a).strip() for a in areas if str(a).strip()]
    except (json.JSONDecodeError, TypeError):
        pass
    return []


def set_focus_areas(db: Session, organization_id: str, areas: list[str]) -> None:
    """Update focus areas for an organization."""
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        return
    try:
        settings = json.loads(org.settings or "{}")
    except (json.JSONDecodeError, TypeError):
        settings = {}
    settings["focus_areas"] = sorted({a.strip() for a in areas if a and a.strip()})
    org.settings = json.dumps(settings)