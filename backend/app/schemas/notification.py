from datetime import datetime

from pydantic import BaseModel

from app.models.enums import NotificationType


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int
