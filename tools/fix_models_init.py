import pathlib

backend = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\backend")
init_file = backend / "app" / "models" / "__init__.py"

content = '''from app.models.base import Base
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.models.location_ping import LocationPing
from app.models.shift import Shift, ShiftStatus
from app.models.daily_report import DailyReport
from app.models.doctor_specialty import DoctorSpecialty
from app.models.doctor import Doctor
from app.models.doctor_location import DoctorLocation
from app.models.doctor_schedule import DoctorSchedule
from app.models.doctor_workplace import DoctorWorkplace
from app.models.doctor_assignment import DoctorAssignment
from app.models.workplace import Workplace
from app.models.product import Product
from app.models.visit import Visit, VisitPurpose, VisitStatus, DoctorResponse
from app.models.visit_product import VisitProduct
from app.models.follow_up import FollowUp, FollowUpActionType, FollowUpStatus
from app.models.notification import Notification
from app.models.subscription import Subscription
from app.models.target import Target
from app.models.osm_place_cache import OSMPlaceCache

__all__ = [
    "Base",
    "Organization",
    "User",
    "UserRole",
    "AuditLog",
    "LocationPing",
    "Shift",
    "ShiftStatus",
    "DailyReport",
    "DoctorSpecialty",
    "Doctor",
    "DoctorLocation",
    "DoctorSchedule",
    "DoctorWorkplace",
    "DoctorAssignment",
    "Workplace",
    "Product",
    "Visit",
    "VisitPurpose",
    "VisitStatus",
    "DoctorResponse",
    "VisitProduct",
    "FollowUp",
    "FollowUpActionType",
    "FollowUpStatus",
    "Notification",
    "Subscription",
    "Target",
    "OSMPlaceCache",
]
'''

init_file.write_text(content, encoding="utf-8")
print("OK - models/__init__.py rewritten with all models")