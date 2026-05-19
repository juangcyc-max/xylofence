from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, VpnPeer, VpnServer
from app.schemas import PeerCreate, PeerOut, PeerSecretOut
from app.security.auth import get_current_user, require_admin, require_manager
from app.security.wireguard_keys import generate_keypair, generate_preshared_key
from app.services.audit_service import audit
from app.services.ipam import allocate_next_ip
from app.utils.db import get_or_404
from app.utils.time import utc_now

router = APIRouter(prefix="/peers", tags=["vpn-peers"])


@router.get("", response_model=list[PeerOut])
def list_peers(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    user_id: int | None = None,
    server_id: int | None = None,
):
    query = select(VpnPeer)
    if current_user.role == "client":
        query = query.where(VpnPeer.user_id == current_user.id)
    elif user_id is not None:
        query = query.where(VpnPeer.user_id == user_id)
    if server_id is not None:
        query = query.where(VpnPeer.server_id == server_id)
    return db.scalars(query.order_by(VpnPeer.id)).all()


@router.post("", response_model=PeerSecretOut, status_code=201)
def create_peer(
    payload: PeerCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_manager)],
):
    user = db.get(User, payload.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="Usuario no encontrado o inactivo")

    server = db.get(VpnServer, payload.server_id)
    if not server or not server.enabled:
        raise HTTPException(status_code=404, detail="Servidor no encontrado o desactivado")

    allocated_ip = allocate_next_ip(db, server)
    private_key, public_key = generate_keypair()
    preshared_key = generate_preshared_key()

    peer = VpnPeer(
        user_id=user.id,
        server_id=server.id,
        name=payload.name,
        private_key=private_key,
        public_key=public_key,
        preshared_key=preshared_key,
        allocated_ip=allocated_ip,
        allowed_ips=server.client_allowed_ips,
        revoked=False,
    )
    db.add(peer)
    db.commit()
    db.refresh(peer)
    audit(db, current_user, "peer.created", "peer", peer.id, detail=f"{peer.name} -> {peer.allocated_ip}")
    return peer


@router.get("/{peer_id}", response_model=PeerOut)
def get_peer(
    peer_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    peer = get_or_404(db, VpnPeer, peer_id)
    if current_user.role != "admin" and peer.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin permisos para ver este peer")
    return peer


@router.post("/{peer_id}/revoke", response_model=PeerOut)
def revoke_peer(
    peer_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_manager)],
):
    peer = get_or_404(db, VpnPeer, peer_id)
    if not peer.revoked:
        peer.revoked = True
        peer.revoked_at = utc_now()
        db.commit()
        db.refresh(peer)
        audit(db, current_user, "peer.revoked", "peer", peer.id, detail=peer.name)
    return peer


@router.post("/{peer_id}/restore", response_model=PeerOut)
def restore_peer(
    peer_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_manager)],
):
    peer = get_or_404(db, VpnPeer, peer_id)
    if peer.revoked:
        peer.revoked = False
        peer.revoked_at = None
        db.commit()
        db.refresh(peer)
        audit(db, current_user, "peer.restored", "peer", peer.id, detail=peer.name)
    return peer


@router.delete("/{peer_id}", status_code=204)
def delete_peer(
    peer_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_manager)],
):
    peer = get_or_404(db, VpnPeer, peer_id)
    audit(db, current_user, "peer.deleted", "peer", peer.id, detail=peer.name)
    db.delete(peer)
    db.commit()
