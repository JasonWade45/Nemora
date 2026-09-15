"""Role-based visibility helper."""
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.user import User, UserRole


def get_visible_user_ids(db: Session, current_user: User) -> list[str]:
    """
    Returns list of user IDs the current user can see/manage.

    - MANAGER:      all users in org
    - ADMIN:        self + reps supervised by this admin
    - MEDICAL_REP:  self only
    """
    if current_user.role == UserRole.MANAGER:
        rows = (
            db.query(User.id)
            .filter(User.organization_id == current_user.organization_id)
            .all()
        )
        return [r[0] for r in rows]

    if current_user.role == UserRole.ADMIN:
        rows = (
            db.query(User.id)
            .filter(
                User.organization_id == current_user.organization_id,
                or_(
                    User.id == current_user.id,
                    User.supervisor_id == current_user.id,
                ),
            )
            .all()
        )
        return [r[0] for r in rows]

    return [current_user.id]


def can_manage_user(db: Session, current_user: User, target_user_id: str) -> bool:
    """Check if current user can manage a specific user."""
    return target_user_id in get_visible_user_ids(db, current_user)