import json

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def create_audit_log(
    db: Session,
    *,
    organization_id: str,
    actor_user_id: str | None,
    action: str,
    entity: str,
    entity_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    log = AuditLog(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        metadata_json=json.dumps(metadata or {}),
    )
    db.add(log)
