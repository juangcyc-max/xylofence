import ipaddress

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import VpnPeer, VpnServer


def validate_cidr(cidr: str) -> str:
    try:
        network = ipaddress.ip_network(cidr, strict=False)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"CIDR inválido: {cidr}") from exc
    if network.version != 4:
        raise HTTPException(status_code=400, detail="Este MVP solo asigna IPv4 dentro de la VPN")
    if network.num_addresses < 4:
        raise HTTPException(status_code=400, detail="El CIDR debe permitir al menos 4 direcciones")
    return str(network)


def server_interface_address(cidr: str) -> str:
    network = ipaddress.ip_network(cidr, strict=False)
    first_host = next(network.hosts())
    return f"{first_host}/{network.prefixlen}"


def allocate_next_ip(db: Session, server: VpnServer) -> str:
    network = ipaddress.ip_network(server.vpn_cidr, strict=False)
    existing_ips = set(
        db.scalars(select(VpnPeer.allocated_ip).where(VpnPeer.server_id == server.id)).all()
    )
    hosts = list(network.hosts())
    if len(hosts) < 2:
        raise HTTPException(status_code=409, detail="CIDR sin direcciones disponibles")
    for host in hosts[1:]:
        candidate = str(host)
        if candidate not in existing_ips:
            return candidate
    raise HTTPException(status_code=409, detail="No quedan IPs disponibles para este servidor")
