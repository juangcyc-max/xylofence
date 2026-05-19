from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, VpnPeer, VpnServer
from app.security.auth import get_current_user, require_admin
from app.services.audit_service import audit
from app.services.wireguard_config import render_client_config, render_server_config

router = APIRouter(prefix="/configs", tags=["vpn-configs"])


@router.get("/peers/{peer_id}/client.conf")
def download_client_config(
    peer_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    peer = db.get(VpnPeer, peer_id)
    if not peer:
        raise HTTPException(status_code=404, detail="Peer no encontrado")
    if peer.revoked:
        raise HTTPException(status_code=409, detail="Peer revocado")
    if current_user.role != "admin" and peer.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin permisos para descargar esta configuración")

    server = db.get(VpnServer, peer.server_id)
    if not server or not server.enabled:
        raise HTTPException(status_code=409, detail="Servidor no disponible")

    config = render_client_config(peer, server)
    audit(db, current_user, "config.client.downloaded", "peer", peer.id, detail=peer.name)
    return Response(
        content=config,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{peer.name}.conf"'},
    )


@router.get("/servers/{server_id}/wg0.conf")
def get_server_config(
    server_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    server = db.get(VpnServer, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Servidor no encontrado")

    peers = db.scalars(select(VpnPeer).where(VpnPeer.server_id == server.id).order_by(VpnPeer.id)).all()
    config = render_server_config(server, list(peers))
    audit(db, current_user, "config.server.rendered", "server", server.id, detail=server.name)
    return Response(
        content=config,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{server.name}-wg0.conf"'},
    )
