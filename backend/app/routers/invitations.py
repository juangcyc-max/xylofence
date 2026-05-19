import secrets
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import Invitation, User
from app.schemas import InvitationCreate, InvitationOut, RegisterRequest, UserOut
from app.security.auth import get_current_user, hash_password, require_admin
from app.services.audit_service import audit
from app.utils.db import get_or_404
from app.utils.time import utc_now

router = APIRouter(prefix="/auth", tags=["invitaciones"])
settings = get_settings()


@router.post("/invite", response_model=dict, status_code=201)
def create_invitation(
    payload: InvitationCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    token = secrets.token_urlsafe(32)
    expires_at = utc_now() + timedelta(hours=settings.invitation_expire_hours)

    invitation = Invitation(
        token=token,
        email=str(payload.email) if payload.email else None,
        role=payload.role.value,
        created_by=current_user.id,
        expires_at=expires_at,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    audit(db, current_user, "invitation.created", "invitation", invitation.id, detail=payload.email or "sin email")

    link = f"{settings.app_base_url}/register/{token}"
    return {"token": token, "link": link, "expires_at": expires_at}


@router.get("/invite/{token}", response_model=InvitationOut)
def get_invitation(token: str, db: Annotated[Session, Depends(get_db)]):
    invitation = db.scalar(select(Invitation).where(Invitation.token == token))
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no válida")
    if invitation.used_at is not None:
        raise HTTPException(status_code=410, detail="Esta invitación ya fue usada")
    if invitation.expires_at < utc_now():
        raise HTTPException(status_code=410, detail="Esta invitación ha expirado")
    return invitation


@router.get("/invitations", response_model=list[InvitationOut])
def list_invitations(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    return list(db.scalars(select(Invitation).order_by(Invitation.created_at.desc())).all())


@router.delete("/invitations/{invitation_id}", status_code=204)
def delete_invitation(
    invitation_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    invitation = get_or_404(db, Invitation, invitation_id)
    db.delete(invitation)
    db.commit()


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: RegisterRequest, db: Annotated[Session, Depends(get_db)]):
    invitation = db.scalar(select(Invitation).where(Invitation.token == payload.token))
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitación no válida")
    if invitation.used_at is not None:
        raise HTTPException(status_code=410, detail="Esta invitación ya fue usada")
    if invitation.expires_at < utc_now():
        raise HTTPException(status_code=410, detail="Esta invitación ha expirado")

    if invitation.email:
        existing = db.scalar(select(User).where(User.email == invitation.email))
        if existing:
            raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese email")

    user = User(
        email=invitation.email or f"user_{secrets.token_hex(4)}@pending.local",
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=invitation.role,
        is_active=True,
    )
    db.add(user)
    db.flush()

    invitation.used_at = utc_now()
    db.commit()
    db.refresh(user)
    return user
