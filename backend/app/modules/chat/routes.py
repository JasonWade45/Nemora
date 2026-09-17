from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.core.rbac import Role
from app.models.message import Message
from app.models.user import User

router = APIRouter(prefix="/chat", tags=["chat"])


class MessageSendRequest(BaseModel):
    receiver_id: str | None = None
    group_name: str | None = None
    content: str
    message_type: str = "TEXT"


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    sender_name: str | None = None
    receiver_id: str | None = None
    receiver_name: str | None = None
    group_name: str | None = None
    content: str
    message_type: str
    is_read: bool
    created_at: datetime


class ConversationResponse(BaseModel):
    peer_id: str | None = None
    peer_name: str | None = None
    group_name: str | None = None
    last_message: str
    last_message_at: datetime
    unread_count: int


def _msg_resp(msg: Message, sender: User | None, receiver: User | None) -> MessageResponse:
    return MessageResponse(
        id=msg.id,
        sender_id=msg.sender_id,
        sender_name=sender.full_name if sender else None,
        receiver_id=msg.receiver_id,
        receiver_name=receiver.full_name if receiver else None,
        group_name=msg.group_name,
        content=msg.content,
        message_type=msg.message_type,
        is_read=msg.is_read,
        created_at=msg.created_at,
    )


@router.get("/conversations", response_model=list[ConversationResponse])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    org_id = current_user.organization_id
    messages = (
        db.query(Message)
        .filter(Message.organization_id == org_id)
        .filter(or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id, Message.group_name.isnot(None)))
        .order_by(Message.created_at.desc())
        .limit(200)
        .all()
    )

    conv_map: dict[str, dict] = {}
    for m in messages:
        if m.group_name:
            key = f"group:{m.group_name}"
        else:
            peer = m.receiver_id if m.sender_id == current_user.id else m.sender_id
            key = f"dm:{peer}"

        if key not in conv_map:
            unread = 0
            if m.receiver_id == current_user.id and not m.is_read:
                unread = (
                    db.query(func.count(Message.id))
                    .filter(
                        Message.organization_id == org_id,
                        Message.sender_id == (m.sender_id if m.receiver_id == current_user.id else current_user.id),
                        Message.receiver_id == current_user.id if m.receiver_id == current_user.id else Message.receiver_id == m.sender_id,
                        Message.is_read == False,
                    )
                    .scalar()
                )

            conv_map[key] = {
                "peer_id": None,
                "peer_name": None,
                "group_name": m.group_name,
                "last_message": m.content,
                "last_message_at": m.created_at,
                "unread_count": unread,
            }
            if not m.group_name:
                peer_id = m.receiver_id if m.sender_id == current_user.id else m.sender_id
                peer_user = db.query(User).filter(User.id == peer_id).first()
                conv_map[key]["peer_id"] = peer_id
                conv_map[key]["peer_name"] = peer_user.full_name if peer_user else None

    return sorted(conv_map.values(), key=lambda x: x["last_message_at"], reverse=True)


@router.get("/messages/{peer_id}", response_model=list[MessageResponse])
def get_messages(
    peer_id: str,
    limit: int = Query(default=50, le=200),
    before: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    org_id = current_user.organization_id
    q = (
        db.query(Message)
        .filter(
            Message.organization_id == org_id,
            or_(
                (Message.sender_id == current_user.id) & (Message.receiver_id == peer_id),
                (Message.sender_id == peer_id) & (Message.receiver_id == current_user.id),
            ),
        )
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    if before:
        before_msg = db.query(Message).filter(Message.id == before).first()
        if before_msg:
            q = q.filter(Message.created_at < before_msg.created_at)

    messages = q.all()
    user_ids = list({m.sender_id for m in messages} | {m.receiver_id for m in messages if m.receiver_id})
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()}

    # Mark as read
    db.query(Message).filter(
        Message.sender_id == peer_id,
        Message.receiver_id == current_user.id,
        Message.is_read == False,
    ).update({"is_read": True})
    db.commit()

    return [_msg_resp(m, users_map.get(m.sender_id), users_map.get(m.receiver_id)) for m in reversed(messages)]


@router.post("/messages", response_model=MessageResponse)
def send_message(
    payload: MessageSendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    if not payload.receiver_id and not payload.group_name:
        raise HTTPException(status_code=400, detail="Either receiver_id or group_name is required")

    msg = Message(
        organization_id=current_user.organization_id,
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        group_name=payload.group_name,
        content=payload.content,
        message_type=payload.message_type,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    receiver = db.query(User).filter(User.id == payload.receiver_id).first() if payload.receiver_id else None
    return _msg_resp(msg, current_user, receiver)


@router.post("/messages/mark-read")
def mark_all_read(
    peer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    db.query(Message).filter(
        Message.sender_id == peer_id,
        Message.receiver_id == current_user.id,
        Message.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}


@router.get("/team", response_model=list[dict])
def list_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    from app.core.visibility import get_visible_user_ids
    visible = get_visible_user_ids(db, current_user)
    users = db.query(User).filter(User.id.in_(visible), User.id != current_user.id).all()
    return [{"id": u.id, "full_name": u.full_name, "email": u.email, "role": u.role.value if hasattr(u.role, "value") else u.role} for u in users]
