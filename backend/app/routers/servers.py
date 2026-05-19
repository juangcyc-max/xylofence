from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, VpnServer
from app.schemas import VpnServerCreate, VpnServerOut, VpnServerUpdate
from app.security.auth import require_admin
from app.security.wireguard_keys import generate_keypair
from app.services.audit_service import audit
from app.services.ipam import validate_cidr
from app.utils.db import get_or_404

router = APIRouter(prefix="/servers", tags=["vpn-servidores"])


@router.get("", response_model=list[VpnServerOut])
def list_servers(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    return db.scalars(select(VpnServer).order_by(VpnServer.id)).all()


@router.post("", response_model=VpnServerOut, status_code=201)
def create_server(
    payload: VpnServerCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    existing = db.scalar(select(VpnServer).where(VpnServer.name == payload.name))
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un servidor con ese nombre")

    private_key, public_key = generate_keypair()
    server = VpnServer(
        name=payload.name,
        public_host=payload.public_host,
        listen_port=payload.listen_port,
        vpn_cidr=validate_cidr(payload.vpn_cidr),
        server_private_key=private_key,
        server_public_key=public_key,
        dns=payload.dns,
        client_allowed_ips=payload.client_allowed_ips,
        mtu=payload.mtu,
        persistent_keepalive=payload.persistent_keepalive,
        enabled=True,
    )
    db.add(server)
    db.commit()
    db.refresh(server)
    audit(db, current_user, "server.created", "server", server.id, detail=server.name)
    return server


@router.get("/{server_id}", response_model=VpnServerOut)
def get_server(
    server_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    return get_or_404(db, VpnServer, server_id)


@router.delete("/{server_id}", status_code=204)
def delete_server(
    server_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    server = get_or_404(db, VpnServer, server_id)
    audit(db, current_user, "server.deleted", "server", server.id, detail=server.name)
    db.delete(server)
    db.commit()


@router.patch("/{server_id}", response_model=VpnServerOut)
def update_server(
    server_id: int,
    payload: VpnServerUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    server = get_or_404(db, VpnServer, server_id)

    for field in ("public_host", "listen_port", "dns", "client_allowed_ips", "mtu", "persistent_keepalive", "enabled"):
        value = getattr(payload, field)
        if value is not None:
            setattr(server, field, value)

    db.commit()
    db.refresh(server)
    audit(db, current_user, "server.updated", "server", server.id, detail=server.name)
    return server
