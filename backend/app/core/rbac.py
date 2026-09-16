from enum import Enum


class Role(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    MEDICAL_REP = "MEDICAL_REP"


ROLE_PRIORITY: dict[Role, int] = {
    Role.ADMIN: 3,
    Role.MANAGER: 2,
    Role.MEDICAL_REP: 1,
}


def has_min_role(current_role: Role, required_role: Role) -> bool:
    return ROLE_PRIORITY[current_role] >= ROLE_PRIORITY[required_role]