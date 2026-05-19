from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Asset, Incident, User
from app.schemas import IncidentOut, IncidentUpdate
from app.security.auth import get_current_user, require_admin, require_manager
from app.utils.db import get_or_404
from app.utils.time import utc_now

router = APIRouter(prefix="/incidents", tags=["seguridad-incidentes"])


@router.get("", response_model=list[IncidentOut])
def list_incidents(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Incident]:
    if current_user.role == "client":
        owned_ids = list(db.scalars(select(Asset.id).where(Asset.owner_user_id == current_user.id)).all())
        query = select(Incident).where(Incident.asset_id.in_(owned_ids))
    else:
        query = select(Incident)
    return list(db.scalars(query.order_by(Incident.created_at.desc())).all())


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(
    incident_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Incident:
    return get_or_404(db, Incident, incident_id)


@router.patch("/{incident_id}", response_model=IncidentOut)
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_manager)],
) -> Incident:
    incident = get_or_404(db, Incident, incident_id)

    if payload.status is not None:
        incident.status = payload.status.value
        if payload.status.value == "closed" and incident.closed_at is None:
            incident.closed_at = utc_now()
        if payload.status.value != "closed":
            incident.closed_at = None

    if payload.owner is not None:
        incident.owner = payload.owner

    if payload.actions_taken is not None:
        incident.actions_taken = payload.actions_taken

    db.commit()
    db.refresh(incident)
    return incident
