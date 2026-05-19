from app.models import VpnPeer, VpnServer
from app.services.ipam import server_interface_address


def render_client_config(peer: VpnPeer, server: VpnServer) -> str:
    mtu_line = f"MTU = {server.mtu}\n" if server.mtu else ""
    dns_line = f"DNS = {server.dns}\n" if server.dns else ""
    return (
        f"# Xylofence — WireGuard client config\n"
        f"# User ID: {peer.user_id} | Peer ID: {peer.id} | Server: {server.name}\n\n"
        f"[Interface]\n"
        f"PrivateKey = {peer.private_key}\n"
        f"Address = {peer.allocated_ip}/32\n"
        f"{dns_line}{mtu_line}\n"
        f"[Peer]\n"
        f"PublicKey = {server.server_public_key}\n"
        f"PresharedKey = {peer.preshared_key}\n"
        f"Endpoint = {server.public_host}:{server.listen_port}\n"
        f"AllowedIPs = {peer.allowed_ips}\n"
        f"PersistentKeepalive = {server.persistent_keepalive}\n"
    )


def render_server_config(server: VpnServer, peers: list[VpnPeer]) -> str:
    active_peers = [p for p in peers if not p.revoked]
    address = server_interface_address(server.vpn_cidr)
    lines = [
        "# Xylofence — WireGuard server config",
        f"# Server: {server.name}",
        "",
        "[Interface]",
        f"Address = {address}",
        f"ListenPort = {server.listen_port}",
        f"PrivateKey = {server.server_private_key}",
        "",
        "# Enable forwarding/NAT on the host separately.",
        "",
    ]
    for peer in active_peers:
        lines.extend([
            f"# Peer ID: {peer.id} | User ID: {peer.user_id} | Name: {peer.name}",
            "[Peer]",
            f"PublicKey = {peer.public_key}",
            f"PresharedKey = {peer.preshared_key}",
            f"AllowedIPs = {peer.allocated_ip}/32",
            "",
        ])
    return "\n".join(lines)
