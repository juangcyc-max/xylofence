from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.utils.time import utc_now


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), default="user", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    peers: Mapped[list["VpnPeer"]] = relationship(back_populates="user")
    assets: Mapped[list["Asset"]] = relationship(back_populates="owner_user", foreign_keys="Asset.owner_user_id")


class VpnServer(Base):
    __tablename__ = "vpn_servers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    public_host: Mapped[str] = mapped_column(String(255), nullable=False)
    listen_port: Mapped[int] = mapped_column(Integer, default=51820, nullable=False)
    vpn_cidr: Mapped[str] = mapped_column(String(64), default="10.44.0.0/24", nullable=False)
    server_private_key: Mapped[str] = mapped_column(Text, nullable=False)
    server_public_key: Mapped[str] = mapped_column(Text, nullable=False)
    dns: Mapped[Optional[str]] = mapped_column(String(255), default="1.1.1.1", nullable=True)
    client_allowed_ips: Mapped[str] = mapped_column(String(255), default="0.0.0.0/0, ::/0", nullable=False)
    mtu: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    persistent_keepalive: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    peers: Mapped[list["VpnPeer"]] = relationship(back_populates="server")


class VpnPeer(Base):
    __tablename__ = "vpn_peers"
    __table_args__ = (UniqueConstraint("server_id", "allocated_ip", name="uq_peer_server_ip"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("vpn_servers.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    private_key: Mapped[str] = mapped_column(Text, nullable=False)
    public_key: Mapped[str] = mapped_column(Text, nullable=False)
    preshared_key: Mapped[str] = mapped_column(Text, nullable=False)
    allocated_ip: Mapped[str] = mapped_column(String(64), nullable=False)
    allowed_ips: Mapped[str] = mapped_column(String(255), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="peers")
    server: Mapped[VpnServer] = relationship(back_populates="peers")


class VultrNode(Base):
    __tablename__ = "vultr_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("vpn_servers.id"), unique=True, nullable=False)
    vultr_instance_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    region: Mapped[str] = mapped_column(String(20), nullable=False)
    region_city: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    region_country: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    plan: Mapped[str] = mapped_column(String(50), nullable=False, default="vc2-1c-1gb")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="provisioning")
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    server: Mapped["VpnServer"] = relationship()


class VultrNodeClient(Base):
    __tablename__ = "vultr_node_clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    node_id: Mapped[int] = mapped_column(ForeignKey("vultr_nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    slot: Mapped[int] = mapped_column(Integer, nullable=False)
    private_key: Mapped[str] = mapped_column(Text, nullable=False)
    public_key: Mapped[str] = mapped_column(Text, nullable=False)
    allocated_ip: Mapped[str] = mapped_column(String(64), nullable=False)


class VultrNodeChain(Base):
    __tablename__ = "vultr_node_chains"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entry_node_id: Mapped[int] = mapped_column(ForeignKey("vultr_nodes.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    exit_node_id: Mapped[int] = mapped_column(ForeignKey("vultr_nodes.id", ondelete="CASCADE"), nullable=False, index=True)

    entry_node: Mapped["VultrNode"] = relationship(foreign_keys=[entry_node_id])
    exit_node: Mapped["VultrNode"] = relationship(foreign_keys=[exit_node_id])


class VultrNodeXray(Base):
    __tablename__ = "vultr_node_xray"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    node_id: Mapped[int] = mapped_column(ForeignKey("vultr_nodes.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    client_uuid: Mapped[str] = mapped_column(String(36), nullable=False)
    reality_private_key: Mapped[str] = mapped_column(Text, nullable=False)
    reality_public_key: Mapped[str] = mapped_column(Text, nullable=False)
    short_id: Mapped[str] = mapped_column(String(32), nullable=False)
    sni: Mapped[str] = mapped_column(String(255), nullable=False, default="www.microsoft.com")
    port: Mapped[int] = mapped_column(Integer, nullable=False, default=443)


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(30), default="client", nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    creator: Mapped["User"] = relationship(foreign_keys=[created_by])


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    actor_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    target_type: Mapped[str] = mapped_column(String(80), nullable=False)
    target_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class ConnectionEvent(Base):
    __tablename__ = "connection_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    peer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vpn_peers.id"), nullable=True, index=True)
    server_id: Mapped[int] = mapped_column(ForeignKey("vpn_servers.id"), nullable=False, index=True)
    source_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    bytes_received: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bytes_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_handshake_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False, unique=True)
    environment: Mapped[str] = mapped_column(String(50), nullable=False, default="lab")
    owner: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    owner_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    authorized: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    owner_user: Mapped[Optional[User]] = relationship(back_populates="assets", foreign_keys=[owner_user_id])
    scan_runs: Mapped[list["ScanRun"]] = relationship(back_populates="asset")
    findings: Mapped[list["Finding"]] = relationship(back_populates="asset")
    incidents: Mapped[list["Incident"]] = relationship(back_populates="asset")


class ScanRun(Base):
    __tablename__ = "scan_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    profile: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="queued")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    summary_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    asset: Mapped[Asset] = relationship(back_populates="scan_runs")
    findings: Mapped[list["Finding"]] = relationship(back_populates="scan_run")


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scan_run_id: Mapped[int] = mapped_column(ForeignKey("scan_runs.id"), nullable=False)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    check_name: Mapped[str] = mapped_column(String(120), nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="info")
    evidence_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    remediation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    scan_run: Mapped[ScanRun] = relationship(back_populates="findings")
    asset: Mapped[Asset] = relationship(back_populates="findings")


class HostScan(Base):
    __tablename__ = "host_scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    target: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="running")
    total_ports_scanned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    open_ports_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    risk_score: Mapped[str] = mapped_column(String(20), nullable=True)
    system_info_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    ports: Mapped[list["HostPort"]] = relationship(back_populates="scan", cascade="all, delete-orphan")


class HostPort(Base):
    __tablename__ = "host_ports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scan_id: Mapped[int] = mapped_column(ForeignKey("host_scans.id"), nullable=False, index=True)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    protocol: Mapped[str] = mapped_column(String(10), default="tcp", nullable=False)
    service: Mapped[str] = mapped_column(String(80), nullable=False, default="unknown")
    banner: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="info")
    risk_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    scan: Mapped[HostScan] = relationship(back_populates="ports")


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    finding_id: Mapped[Optional[int]] = mapped_column(ForeignKey("findings.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="open")
    owner: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    actions_taken: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    asset: Mapped[Asset] = relationship(back_populates="incidents")
    finding: Mapped[Optional[Finding]] = relationship(foreign_keys=[finding_id])
