from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ConnectionEvent, User, VpnPeer, VpnServer
from app.schemas import ConnectionEventIn
from app.security.auth import require_admin

router = APIRouter(prefix="/telemetry", tags=["telemetría"])


@router.post("/connection-events", status_code=201)
def ingest_connection_event(
    payload: ConnectionEventIn,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    server = db.get(VpnServer, payload.server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Servidor no encontrado")

    peer_id = None
    if payload.peer_public_key:
        peer = db.scalar(
            select(VpnPeer).where(
                VpnPeer.server_id == payload.server_id,
                VpnPeer.public_key == payload.peer_public_key,
            )
        )
        peer_id = peer.id if peer else None

    event = ConnectionEvent(
        server_id=payload.server_id,
        peer_id=peer_id,
        source_ip=payload.source_ip,
        bytes_received=payload.bytes_received,
        bytes_sent=payload.bytes_sent,
        last_handshake_at=payload.last_handshake_at,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return {"message": "Evento registrado", "id": event.id, "peer_id": peer_id}
