from enum import Enum


class PriorityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class DoctorStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class WorkplaceStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class AssignmentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    ARCHIVED = "ARCHIVED"


class FacilityType(str, Enum):
    DOCTOR_OFFICE = "DOCTOR_OFFICE"
    CLINIC = "CLINIC"
    HOSPITAL = "HOSPITAL"
    PHARMACY = "PHARMACY"
    DENTAL_CENTER = "DENTAL_CENTER"
    MEDICAL_CENTER = "MEDICAL_CENTER"
    OTHER = "OTHER"
