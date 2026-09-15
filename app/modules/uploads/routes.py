import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.api.deps import require_roles
from app.core.rbac import Role
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_ROOT = Path("uploads")
UPLOAD_ROOT.mkdir(exist_ok=True)

ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(Role.ADMIN, Role.MANAGER, Role.MEDICAL_REP)),
):
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP, GIF allowed")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower() or "jpg"
    now = datetime.utcnow()
    sub = UPLOAD_ROOT / str(now.year) / f"{now.month:02d}"
    sub.mkdir(parents=True, exist_ok=True)

    fname = f"{uuid.uuid4().hex}.{ext}"
    dest = sub / fname
    dest.write_bytes(content)

    rel = f"/uploads/{now.year}/{now.month:02d}/{fname}"
    return JSONResponse({"url": rel})