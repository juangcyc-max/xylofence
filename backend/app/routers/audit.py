from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuditLog, User
from app.schemas import AuditLogOut
from app.security.auth import require_admin

router = APIRouter(prefix="/audit", tags=["auditoría"])


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
    limit: int = 100,
):
    limit = min(max(limit, 1), 500)
    return db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(limit)).all()
