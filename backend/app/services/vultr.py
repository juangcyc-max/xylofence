import base64
import textwrap
from typing import Any

import httpx

from app.config import get_settings

VULTR_API = "https://api.vultr.com/v2"
UBUNTU_24_OS_ID = 2284
DEFAULT_PLAN = "vc2-1c-1gb"  # 1 vCPU, 1 GB RAM, 25 GB SSD — $6/mo


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {get_settings().vultr_api_key}"}


def _client(timeout: int = 15) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=timeout,
        transport=httpx.AsyncHTTPTransport(local_address="0.0.0.0"),
    )


async def list_regions() -> list[dict]:
    async with _client() as client:
        r = await client.get(f"{VULTR_API}/regions", headers=_headers())
        r.raise_for_status()
        regions = r.json()["regions"]
    return sorted(regions, key=lambda x: x.get("country", ""))


async def list_plans() -> list[dict]:
    async with _client() as client:
        r = await client.get(f"{VULTR_API}/plans?type=vc2&per_page=100", headers=_headers())
        r.raise_for_status()
    return r.json()["plans"]


async def create_instance(
    region: str,
    label: str,
    wg_private_key: str,
    wg_port: int,
    server_vpn_ip: str,
    plan: str = DEFAULT_PLAN,
    peers: list[tuple[str, str]] | None = None,
    xray_uuid: str | None = None,
    xray_reality_private_key: str | None = None,
    xray_short_id: str | None = None,
    xray_sni: str = "www.microsoft.com",
    xray_port: int = 443,
) -> dict[str, Any]:
    script = _build_cloud_init(
        wg_private_key, wg_port, server_vpn_ip, peers or [],
        xray_uuid, xray_reality_private_key, xray_short_id, xray_sni, xray_port,
    )
    user_data = base64.b64encode(script.encode()).decode()

    payload = {
        "region": region,
        "plan": plan,
        "os_id": UBUNTU_24_OS_ID,
        "label": label,
        "hostname": label,
        "user_data": user_data,
        "backups": "disabled",
        "ddos_protection": False,
        "activation_email": False,
    }
    async with _client(timeout=30) as client:
        r = await client.post(f"{VULTR_API}/instances", headers=_headers(), json=payload)
        r.raise_for_status()
    return r.json()["instance"]


async def get_instance(instance_id: str) -> dict[str, Any]:
    async with _client() as client:
        r = await client.get(f"{VULTR_API}/instances/{instance_id}", headers=_headers())
        r.raise_for_status()
    return r.json()["instance"]


async def destroy_instance(instance_id: str) -> None:
    async with _client() as client:
        r = await client.delete(f"{VULTR_API}/instances/{instance_id}", headers=_headers())
        if r.status_code not in (200, 204, 404):
            r.raise_for_status()


def _build_cloud_init(
    private_key: str,
    port: int,
    server_vpn_ip: str,
    peers: list[tuple[str, str]] | None = None,
    xray_uuid: str | None = None,
    xray_reality_private_key: str | None = None,
    xray_short_id: str | None = None,
    xray_sni: str = "www.microsoft.com",
    xray_port: int = 443,
) -> str:
    peer_section = ""
    for pubkey, allowed_ip in (peers or []):
        peer_section += f"\n[Peer]\nPublicKey = {pubkey}\nAllowedIPs = {allowed_ip}/32\n"

    wg_conf = (
        f"[Interface]\n"
        f"Address = {server_vpn_ip}/24\n"
        f"ListenPort = {port}\n"
        f"PrivateKey = {private_key}\n"
        f"PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o WG_ETH -j MASQUERADE\n"
        f"PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o WG_ETH -j MASQUERADE\n"
        f"{peer_section}"
    )

    xray_block = ""
    if xray_uuid and xray_reality_private_key and xray_short_id:
        xray_config = (
            '{\n'
            '  "log": {"loglevel": "warning"},\n'
            '  "inbounds": [{\n'
            f'    "port": {xray_port},\n'
            '    "protocol": "vless",\n'
            '    "settings": {\n'
            f'      "clients": [{{"id": "{xray_uuid}", "flow": "xtls-rprx-vision"}}],\n'
            '      "decryption": "none"\n'
            '    },\n'
            '    "streamSettings": {\n'
            '      "network": "tcp",\n'
            '      "security": "reality",\n'
            '      "realitySettings": {\n'
            f'        "dest": "{xray_sni}:443",\n'
            f'        "serverNames": ["{xray_sni}"],\n'
            f'        "privateKey": "{xray_reality_private_key}",\n'
            f'        "shortIds": ["{xray_short_id}"]\n'
            '      }\n'
            '    }\n'
            '  }],\n'
            '  "outbounds": [{"protocol": "freedom"}]\n'
            '}'
        )
        xray_config_b64 = __import__('base64').b64encode(xray_config.encode()).decode()
        xray_block = (
            "\n# === Xray REALITY Setup ===\n"
            "curl -Lo /tmp/xray-install.sh https://github.com/XTLS/Xray-install/raw/main/install-release.sh\n"
            "bash /tmp/xray-install.sh install\n"
            "mkdir -p /usr/local/etc/xray\n"
            f"echo '{xray_config_b64}' | base64 -d > /usr/local/etc/xray/config.json\n"
            "systemctl enable xray\n"
            "systemctl restart xray\n"
            "echo 'Xray REALITY started' >> /var/log/xylofence-wg.log\n"
        )

    ssh_pubkey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJZoEgBfj881cGNzTtA5crI36GrwLsIwI2XMF7GE7p+q xylofence-debug"

    return (
        "#!/bin/bash\n"
        "export DEBIAN_FRONTEND=noninteractive\n"
        "apt-get update -y\n"
        "apt-get install -y wireguard iptables curl\n\n"
        "# SSH access\n"
        "mkdir -p /root/.ssh\n"
        f'echo "{ssh_pubkey}" >> /root/.ssh/authorized_keys\n'
        "chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys\n\n"
        "# IP forwarding\n"
        "echo 1 > /proc/sys/net/ipv4/ip_forward\n"
        'echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf\n\n'
        "# Disable ufw\n"
        "systemctl disable --now ufw 2>/dev/null || true\n\n"
        "sleep 5\n\n"
        "ETH=$(ip route | grep default | awk '{print $5}' | head -1)\n"
        "[ -z \"$ETH\" ] && ETH=$(ip link | awk -F: '/^[0-9]+: (en|eth)/{print $2;exit}' | tr -d ' ')\n\n"
        f'cat > /etc/wireguard/wg0.conf << WGEOF\n'
        f"{wg_conf}\n"
        "WGEOF\n\n"
        "sed -i \"s/WG_ETH/$ETH/g\" /etc/wireguard/wg0.conf\n"
        "chmod 600 /etc/wireguard/wg0.conf\n"
        "systemctl enable wg-quick@wg0\n"
        "systemctl start wg-quick@wg0\n"
        "echo \"WireGuard started on $ETH\" >> /var/log/xylofence-wg.log\n"
        f"{xray_block}"
    )
