import base64 as _b64
import json
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import User, VpnServer, VultrNode, VultrNodeChain, VultrNodeClient, VultrNodeXray
from app.schemas import ChainApply, VultrChainSet, VultrNodeCreate, VultrNodeOut, VultrRegionOut
from app.security.auth import require_admin
from app.security.wireguard_keys import generate_keypair
from app.security.xray_keys import (
    build_vless_link, generate_reality_keypair, generate_short_id, generate_uuid,
)
from app.services import vultr as vultr_svc
from app.services.audit_service import audit
from app.services.ipam import validate_cidr
from app.services.vps_ssh import ssh_exec, ssh_write_file

NUM_CLIENT_SLOTS = 5

router = APIRouter(prefix="/vpn/nodes", tags=["vpn-cloud"])


@router.get("/regions", response_model=list[VultrRegionOut])
async def get_regions(
    current_user: Annotated[User, Depends(require_admin)],
):
    try:
        regions = await vultr_svc.list_regions()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al contactar Vultr: {e}")
    return [
        {
            "id": r["id"],
            "city": r.get("city", r["id"]),
            "country": r.get("country", ""),
            "continent": r.get("continent", ""),
            "options": r.get("options", []),
        }
        for r in regions
    ]


@router.get("", response_model=list[VultrNodeOut])
async def list_nodes(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    nodes = db.scalars(select(VultrNode).order_by(VultrNode.id)).all()
    pending = [n for n in nodes if n.status != "active"]
    for node in pending:
        try:
            instance = await vultr_svc.get_instance(node.vultr_instance_id)
            if instance.get("status") == "active":
                node.status = "active"
            new_ip = instance.get("main_ip")
            if new_ip and new_ip != "0.0.0.0":
                node.ip_address = new_ip
                if node.server:
                    node.server.public_host = new_ip
        except Exception:
            pass
    if pending:
        db.commit()
    return nodes


@router.post("", response_model=VultrNodeOut, status_code=201)
async def provision_node(
    payload: VultrNodeCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    cidr = validate_cidr(payload.vpn_cidr)
    network_prefix = ".".join(cidr.split(".")[:3])
    server_vpn_ip = f"{network_prefix}.1"

    private_key, public_key = generate_keypair()

    client_slots = [
        (slot, *generate_keypair(), f"{network_prefix}.{slot + 1}")
        for slot in range(1, NUM_CLIENT_SLOTS + 1)
    ]
    peers = [(pub, ip) for (_, _, pub, ip) in client_slots]

    xray_priv, xray_pub = generate_reality_keypair()
    xray_uuid = generate_uuid()
    xray_short_id = generate_short_id()
    xray_sni = "www.microsoft.com"
    xray_port = 443

    try:
        regions = await vultr_svc.list_regions()
        region_info = next((r for r in regions if r["id"] == payload.region), None)
        if not region_info:
            raise HTTPException(status_code=400, detail=f"Región '{payload.region}' no encontrada en Vultr")

        instance = await vultr_svc.create_instance(
            region=payload.region,
            label=f"xylofence-{payload.name}",
            wg_private_key=private_key,
            wg_port=payload.listen_port,
            server_vpn_ip=server_vpn_ip,
            plan=payload.plan,
            peers=peers,
            xray_uuid=xray_uuid,
            xray_reality_private_key=xray_priv,
            xray_short_id=xray_short_id,
            xray_sni=xray_sni,
            xray_port=xray_port,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al provisionar en Vultr: {e}")

    server = VpnServer(
        name=payload.name,
        public_host=instance.get("main_ip", "provisioning"),
        listen_port=payload.listen_port,
        vpn_cidr=cidr,
        server_private_key=private_key,
        server_public_key=public_key,
        dns=payload.dns,
        client_allowed_ips="0.0.0.0/0, ::/0",
        enabled=True,
    )
    db.add(server)
    db.flush()

    node = VultrNode(
        server_id=server.id,
        vultr_instance_id=instance["id"],
        region=payload.region,
        region_city=region_info.get("city", payload.region),
        region_country=region_info.get("country", ""),
        plan=payload.plan,
        status="provisioning",
        ip_address=instance.get("main_ip") or None,
    )
    db.add(node)
    db.flush()

    for slot, priv, pub, client_ip in client_slots:
        db.add(VultrNodeClient(
            node_id=node.id,
            slot=slot,
            private_key=priv,
            public_key=pub,
            allocated_ip=client_ip,
        ))

    db.add(VultrNodeXray(
        node_id=node.id,
        client_uuid=xray_uuid,
        reality_private_key=xray_priv,
        reality_public_key=xray_pub,
        short_id=xray_short_id,
        sni=xray_sni,
        port=xray_port,
    ))

    db.commit()
    db.refresh(node)

    audit(db, current_user, "vpn_node.provisioned", "vpn_node", node.id,
          detail=f"{payload.name} en {payload.region}")
    return node


@router.get("/subscription", response_class=PlainTextResponse)
def get_subscription(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])
        if not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    nodes = db.scalars(select(VultrNode).where(VultrNode.status == "active").order_by(VultrNode.id)).all()
    links = []
    for node in nodes:
        if not node.ip_address:
            continue
        xray = db.scalar(select(VultrNodeXray).where(VultrNodeXray.node_id == node.id))
        if not xray:
            continue
        links.append(build_vless_link(
            client_uuid=xray.client_uuid,
            ip=node.ip_address,
            port=xray.port,
            public_key=xray.reality_public_key,
            short_id=xray.short_id,
            sni=xray.sni,
            name=f"Xylofence-{node.region_city}",
        ))

    encoded = _b64.b64encode("\n".join(links).encode()).decode()
    return PlainTextResponse(content=encoded, media_type="text/plain")


@router.get("/chain/active")
def get_active_chain(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    all_chains = db.scalars(select(VultrNodeChain)).all()
    if not all_chains:
        return {"chain": []}

    entry_ids = {c.entry_node_id for c in all_chains}
    exit_ids = {c.exit_node_id for c in all_chains}
    roots = entry_ids - exit_ids
    if not roots:
        return {"chain": []}

    root_id = next(iter(roots))
    chain_ids: list[int] = [root_id]
    visited = {root_id}
    current_id = root_id
    while True:
        link = db.scalar(select(VultrNodeChain).where(VultrNodeChain.entry_node_id == current_id))
        if not link or link.exit_node_id in visited:
            break
        chain_ids.append(link.exit_node_id)
        visited.add(link.exit_node_id)
        current_id = link.exit_node_id

    result = []
    for nid in chain_ids:
        node = db.get(VultrNode, nid)
        if node:
            result.append({
                "id": node.id,
                "region_city": node.region_city,
                "region_country": node.region_country,
                "status": node.status,
                "ip_address": node.ip_address,
            })
    return {"chain": result}


def _apply_chain_ssh_task(steps: list[tuple[str, str]]) -> None:
    """steps: list of (ip, config_json) — each node gets its config written and xray restarted."""
    import logging
    logger = logging.getLogger(__name__)
    for ip, config_json in steps:
        try:
            ssh_write_file(ip, "/usr/local/etc/xray/config.json", config_json)
            ssh_exec(ip, "systemctl restart xray")
            logger.info("Xray restarted on %s", ip)
        except RuntimeError as exc:
            logger.error("SSH error on %s: %s", ip, exc)


@router.post("/chain/apply", status_code=200)
def apply_chain(
    payload: ChainApply,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    if len(payload.node_ids) < 2:
        raise HTTPException(status_code=400, detail="Necesitas al menos 2 nodos para encadenar")
    if len(payload.node_ids) != len(set(payload.node_ids)):
        raise HTTPException(status_code=400, detail="No puedes repetir nodos en la cadena")

    nodes_xray: list[tuple] = []
    for nid in payload.node_ids:
        node = db.get(VultrNode, nid)
        if not node:
            raise HTTPException(status_code=404, detail=f"Nodo {nid} no encontrado")
        if not node.ip_address:
            raise HTTPException(status_code=409, detail=f"Nodo {nid} ({node.region_city}) sin IP asignada")
        xray = db.scalar(select(VultrNodeXray).where(VultrNodeXray.node_id == nid))
        if not xray:
            raise HTTPException(status_code=404, detail=f"Nodo {nid} ({node.region_city}) sin Xray configurado")
        nodes_xray.append((node, xray))

    # Update DB chain records synchronously (fast, no SSH)
    for i in range(len(nodes_xray) - 1):
        entry_node, _ = nodes_xray[i]
        exit_node, _ = nodes_xray[i + 1]
        chain = db.scalar(select(VultrNodeChain).where(VultrNodeChain.entry_node_id == entry_node.id))
        if chain:
            chain.exit_node_id = exit_node.id
        else:
            db.add(VultrNodeChain(entry_node_id=entry_node.id, exit_node_id=exit_node.id))

    last_node, _ = nodes_xray[-1]
    existing_last_chain = db.scalar(select(VultrNodeChain).where(VultrNodeChain.entry_node_id == last_node.id))
    if existing_last_chain:
        db.delete(existing_last_chain)

    audit(db, current_user, "vpn_node.chain_applied", "vpn_node", None,
          detail=" → ".join(n.region_city for n, _ in nodes_xray))
    db.commit()

    # Build SSH steps (pre-computed, no DB needed in background)
    ssh_steps: list[tuple[str, str]] = []
    for i in range(len(nodes_xray) - 1):
        entry_node, entry_xray = nodes_xray[i]
        exit_node, exit_xray = nodes_xray[i + 1]
        ssh_steps.append((entry_node.ip_address, _build_xray_chain_config(entry_xray, exit_node.ip_address, exit_xray)))
    last_node, last_xray = nodes_xray[-1]
    ssh_steps.append((last_node.ip_address, _build_xray_direct_config(last_xray)))

    background_tasks.add_task(_apply_chain_ssh_task, ssh_steps)

    return {
        "chain": [{"node_id": n.id, "city": n.region_city, "country": n.region_country} for n, _ in nodes_xray],
        "entry": nodes_xray[0][0].region_city,
        "exit": nodes_xray[-1][0].region_city,
    }


@router.get("/{node_id}/xray-link")
def get_xray_link(
    node_id: int,
    db: Annotated[Session, Depends(get_db)] = ...,
    current_user: Annotated[User, Depends(require_admin)] = ...,
):
    node = db.get(VultrNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Nodo no encontrado")
    if not node.ip_address:
        raise HTTPException(status_code=409, detail="El nodo aún no tiene IP asignada")

    xray = db.scalar(select(VultrNodeXray).where(VultrNodeXray.node_id == node_id))
    if not xray:
        raise HTTPException(status_code=404, detail="Este nodo no tiene Xray configurado")

    link = build_vless_link(
        client_uuid=xray.client_uuid,
        ip=node.ip_address,
        port=xray.port,
        public_key=xray.reality_public_key,
        short_id=xray.short_id,
        sni=xray.sni,
        name=f"Xylofence-{node.region_city}",
    )
    return {"link": link, "sni": xray.sni, "port": xray.port}


@router.get("/{node_id}/client-config", response_class=PlainTextResponse)
def get_client_config(
    node_id: int,
    slot: int = 1,
    db: Annotated[Session, Depends(get_db)] = ...,
    current_user: Annotated[User, Depends(require_admin)] = ...,
):
    node = db.get(VultrNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Nodo no encontrado")
    if not node.ip_address:
        raise HTTPException(status_code=409, detail="El nodo aún no tiene IP asignada")

    client = db.scalar(
        select(VultrNodeClient).where(
            VultrNodeClient.node_id == node_id,
            VultrNodeClient.slot == slot,
        )
    )
    if not client:
        raise HTTPException(status_code=404, detail=f"Slot {slot} no encontrado")

    server = node.server
    config = (
        f"[Interface]\n"
        f"PrivateKey = {client.private_key}\n"
        f"Address = {client.allocated_ip}/32\n"
        f"DNS = {server.dns or '1.1.1.1'}\n"
        f"\n"
        f"[Peer]\n"
        f"PublicKey = {server.server_public_key}\n"
        f"Endpoint = {node.ip_address}:{server.listen_port}\n"
        f"AllowedIPs = 0.0.0.0/0, ::/0\n"
        f"PersistentKeepalive = 25\n"
    )
    return PlainTextResponse(
        content=config,
        headers={"Content-Disposition": f'attachment; filename="xylofence-{node.region.lower()}.conf"'},
    )


def _wg_inbound() -> dict:
    return {
        "port": 10801,
        "protocol": "dokodemo-door",
        "settings": {"network": "tcp", "followRedirect": True},
        "tag": "wg-inbound",
    }


def _build_xray_direct_config(xray: VultrNodeXray) -> str:
    config = {
        "log": {"loglevel": "warning"},
        "inbounds": [
            {
                "port": xray.port,
                "protocol": "vless",
                "settings": {
                    "clients": [{"id": xray.client_uuid, "flow": "xtls-rprx-vision"}],
                    "decryption": "none",
                },
                "streamSettings": {
                    "network": "tcp",
                    "security": "reality",
                    "realitySettings": {
                        "dest": f"{xray.sni}:443",
                        "serverNames": [xray.sni],
                        "privateKey": xray.reality_private_key,
                        "shortIds": [xray.short_id],
                    },
                },
            },
            _wg_inbound(),
        ],
        "outbounds": [{"protocol": "freedom"}],
    }
    return json.dumps(config, indent=2)


def _build_xray_chain_config(entry: VultrNodeXray, exit_ip: str, exit_xray: VultrNodeXray) -> str:
    config = {
        "log": {"loglevel": "warning"},
        "inbounds": [
            {
                "port": entry.port,
                "protocol": "vless",
                "settings": {
                    "clients": [{"id": entry.client_uuid, "flow": "xtls-rprx-vision"}],
                    "decryption": "none",
                },
                "streamSettings": {
                    "network": "tcp",
                    "security": "reality",
                    "realitySettings": {
                        "dest": f"{entry.sni}:443",
                        "serverNames": [entry.sni],
                        "privateKey": entry.reality_private_key,
                        "shortIds": [entry.short_id],
                    },
                },
            },
            _wg_inbound(),
        ],
        "outbounds": [{
            "tag": "exit-chain",
            "protocol": "vless",
            "settings": {
                "vnext": [{
                    "address": exit_ip,
                    "port": exit_xray.port,
                    "users": [{"id": exit_xray.client_uuid, "flow": "xtls-rprx-vision", "encryption": "none"}],
                }],
            },
            "streamSettings": {
                "network": "tcp",
                "security": "reality",
                "realitySettings": {
                    "serverName": exit_xray.sni,
                    "fingerprint": "chrome",
                    "publicKey": exit_xray.reality_public_key,
                    "shortId": exit_xray.short_id,
                },
            },
        }],
        "routing": {
            "rules": [{"inboundTag": ["wg-inbound"], "outboundTag": "exit-chain"}]
        },
    }
    return json.dumps(config, indent=2)


@router.get("/{node_id}/chain")
def get_chain(
    node_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    chain = db.scalar(select(VultrNodeChain).where(VultrNodeChain.entry_node_id == node_id))
    if not chain:
        return None
    exit_node = db.get(VultrNode, chain.exit_node_id)
    return {
        "entry_node_id": node_id,
        "exit_node_id": chain.exit_node_id,
        "exit_city": exit_node.region_city if exit_node else "?",
        "exit_ip": exit_node.ip_address if exit_node else None,
    }


@router.post("/{node_id}/chain", status_code=200)
def set_chain(
    node_id: int,
    payload: VultrChainSet,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    if node_id == payload.exit_node_id:
        raise HTTPException(status_code=400, detail="Un nodo no puede encadenarse a sí mismo")

    entry_node = db.get(VultrNode, node_id)
    exit_node = db.get(VultrNode, payload.exit_node_id)
    if not entry_node:
        raise HTTPException(status_code=404, detail="Nodo de entrada no encontrado")
    if not exit_node:
        raise HTTPException(status_code=404, detail="Nodo de salida no encontrado")
    if not entry_node.ip_address:
        raise HTTPException(status_code=409, detail="El nodo de entrada no tiene IP asignada")
    if not exit_node.ip_address:
        raise HTTPException(status_code=409, detail="El nodo de salida no tiene IP asignada")

    entry_xray = db.scalar(select(VultrNodeXray).where(VultrNodeXray.node_id == node_id))
    exit_xray = db.scalar(select(VultrNodeXray).where(VultrNodeXray.node_id == payload.exit_node_id))
    if not entry_xray:
        raise HTTPException(status_code=404, detail="El nodo de entrada no tiene Xray configurado")
    if not exit_xray:
        raise HTTPException(status_code=404, detail="El nodo de salida no tiene Xray configurado")

    config_json = _build_xray_chain_config(entry_xray, exit_node.ip_address, exit_xray)
    try:
        ssh_write_file(entry_node.ip_address, "/usr/local/etc/xray/config.json", config_json)
        ssh_exec(entry_node.ip_address, "systemctl restart xray")
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"SSH error configurando cadena: {e}")

    chain = db.scalar(select(VultrNodeChain).where(VultrNodeChain.entry_node_id == node_id))
    if chain:
        chain.exit_node_id = payload.exit_node_id
    else:
        chain = VultrNodeChain(entry_node_id=node_id, exit_node_id=payload.exit_node_id)
        db.add(chain)
    db.commit()

    audit(db, current_user, "vpn_node.chain_set", "vpn_node", node_id,
          detail=f"entry={node_id} → exit={payload.exit_node_id}")
    return {
        "entry_node_id": node_id,
        "exit_node_id": payload.exit_node_id,
        "exit_city": exit_node.region_city,
        "exit_ip": exit_node.ip_address,
    }


@router.delete("/{node_id}/chain", status_code=204)
def remove_chain(
    node_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    entry_node = db.get(VultrNode, node_id)
    if not entry_node:
        raise HTTPException(status_code=404, detail="Nodo no encontrado")
    if not entry_node.ip_address:
        raise HTTPException(status_code=409, detail="El nodo no tiene IP asignada")

    entry_xray = db.scalar(select(VultrNodeXray).where(VultrNodeXray.node_id == node_id))
    if not entry_xray:
        raise HTTPException(status_code=404, detail="El nodo no tiene Xray configurado")

    config_json = _build_xray_direct_config(entry_xray)
    try:
        ssh_write_file(entry_node.ip_address, "/usr/local/etc/xray/config.json", config_json)
        ssh_exec(entry_node.ip_address, "systemctl restart xray")
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"SSH error eliminando cadena: {e}")

    chain = db.scalar(select(VultrNodeChain).where(VultrNodeChain.entry_node_id == node_id))
    if chain:
        db.delete(chain)
        db.commit()

    audit(db, current_user, "vpn_node.chain_removed", "vpn_node", node_id)


@router.get("/{node_id}/test")
def test_node(
    node_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    node = db.get(VultrNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Nodo no encontrado")
    if not node.ip_address:
        raise HTTPException(status_code=409, detail="El nodo no tiene IP asignada")

    try:
        xray_status = ssh_exec(node.ip_address, "systemctl is-active xray").strip()
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"SSH error: {e}")

    try:
        public_ip = ssh_exec(node.ip_address, "curl -s --max-time 8 https://api.ipify.org || echo unreachable").strip()
    except RuntimeError:
        public_ip = "unreachable"

    return {
        "xray_active": xray_status == "active",
        "xray_status": xray_status,
        "public_ip": public_ip,
        "node_ip": node.ip_address,
    }


@router.get("/{node_id}", response_model=VultrNodeOut)
async def get_node(
    node_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    node = db.get(VultrNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Nodo no encontrado")

    try:
        instance = await vultr_svc.get_instance(node.vultr_instance_id)
        new_status = instance.get("power_status", node.status)
        new_ip = instance.get("main_ip") or node.ip_address

        if instance.get("status") == "active":
            new_status = "active"

        if new_status != node.status or new_ip != node.ip_address:
            node.status = new_status
            node.ip_address = new_ip
            if new_ip and node.server:
                node.server.public_host = new_ip
            db.commit()
            db.refresh(node)
    except Exception:
        pass

    return node


@router.delete("/{node_id}", status_code=204)
async def destroy_node(
    node_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    node = db.get(VultrNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Nodo no encontrado")

    try:
        await vultr_svc.destroy_instance(node.vultr_instance_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al destruir instancia Vultr: {e}")

    audit(db, current_user, "vpn_node.destroyed", "vpn_node", node.id,
          detail=node.region)

    for xray in db.scalars(select(VultrNodeXray).where(VultrNodeXray.node_id == node.id)).all():
        db.delete(xray)
    for client in db.scalars(select(VultrNodeClient).where(VultrNodeClient.node_id == node.id)).all():
        db.delete(client)
    for chain in db.scalars(select(VultrNodeChain).where(
        (VultrNodeChain.entry_node_id == node.id) | (VultrNodeChain.exit_node_id == node.id)
    )).all():
        db.delete(chain)
    if node.server:
        db.delete(node.server)
    db.delete(node)
    db.commit()
