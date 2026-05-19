from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl


# ── Auth & Users ──────────────────────────────────────────────────────────────

class Role(str, Enum):
    admin = "admin"
    manager = "manager"
    viewer = "viewer"
    client = "client"


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.client


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    role: Optional[Role] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


# ── Invitations & Registration ────────────────────────────────────────────────

class InvitationCreate(BaseModel):
    email: Optional[EmailStr] = None
    role: Role = Role.client


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    token: str
    email: Optional[str]
    role: str
    used_at: Optional[datetime]
    expires_at: datetime
    created_at: datetime


class RegisterRequest(BaseModel):
    token: str
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)


# ── VPN ───────────────────────────────────────────────────────────────────────

class VpnServerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    public_host: str = Field(min_length=3, max_length=255)
    listen_port: int = Field(default=51820, ge=1, le=65535)
    vpn_cidr: str = "10.44.0.0/24"
    dns: Optional[str] = "1.1.1.1"
    client_allowed_ips: str = "0.0.0.0/0, ::/0"
    mtu: Optional[int] = Field(default=None, ge=576, le=1500)
    persistent_keepalive: int = Field(default=25, ge=0, le=120)


class VpnServerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    public_host: str
    listen_port: int
    vpn_cidr: str
    server_public_key: str
    dns: Optional[str]
    client_allowed_ips: str
    mtu: Optional[int]
    persistent_keepalive: int
    enabled: bool
    created_at: datetime


class VultrRegionOut(BaseModel):
    id: str
    city: str
    country: str
    continent: str
    options: list[str] = []


class VultrNodeCreate(BaseModel):
    region: str = Field(min_length=2, max_length=20)
    name: str = Field(min_length=2, max_length=80)
    vpn_cidr: str = "10.45.0.0/24"
    listen_port: int = Field(default=51820, ge=1, le=65535)
    dns: Optional[str] = "1.1.1.1"
    plan: str = "vc2-1c-1gb"


class VultrNodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    server_id: int
    vultr_instance_id: str
    region: str
    region_city: str
    region_country: str
    plan: str
    status: str
    ip_address: Optional[str]
    created_at: datetime


class VultrChainSet(BaseModel):
    exit_node_id: int


class ChainApply(BaseModel):
    node_ids: list[int]


class VpnServerUpdate(BaseModel):
    public_host: Optional[str] = None
    listen_port: Optional[int] = Field(default=None, ge=1, le=65535)
    dns: Optional[str] = None
    client_allowed_ips: Optional[str] = None
    mtu: Optional[int] = Field(default=None, ge=576, le=1500)
    persistent_keepalive: Optional[int] = Field(default=None, ge=0, le=120)
    enabled: Optional[bool] = None


class PeerCreate(BaseModel):
    user_id: int
    server_id: int
    name: str = Field(min_length=2, max_length=120)


class PeerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    server_id: int
    name: str
    public_key: str
    allocated_ip: str
    allowed_ips: str
    revoked: bool
    created_at: datetime
    revoked_at: Optional[datetime]


class PeerSecretOut(PeerOut):
    private_key: str
    preshared_key: str


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_user_id: Optional[int]
    action: str
    target_type: str
    target_id: Optional[int]
    detail: Optional[str]
    created_at: datetime


class ConnectionEventIn(BaseModel):
    server_id: int
    peer_public_key: Optional[str] = None
    source_ip: Optional[str] = None
    bytes_received: int = 0
    bytes_sent: int = 0
    last_handshake_at: Optional[datetime] = None


# ── Security / Sentinel ───────────────────────────────────────────────────────

class Severity(str, Enum):
    info = "info"
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IncidentStatus(str, Enum):
    open = "open"
    investigating = "investigating"
    mitigated = "mitigated"
    closed = "closed"


class ScanProfile(str, Enum):
    passive = "passive"
    safe_active = "safe_active"


class AssetCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    base_url: HttpUrl
    environment: str = Field(default="lab", max_length=50)
    owner: Optional[str] = Field(default=None, max_length=120)
    owner_user_id: Optional[int] = None
    authorized: bool = Field(
        default=False,
        description="Debe ser true solo para activos propios o con permiso explícito.",
    )


class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    base_url: str
    environment: str
    owner: Optional[str]
    owner_user_id: Optional[int]
    authorized: bool
    created_at: datetime


class ScanCreate(BaseModel):
    asset_id: int
    profile: ScanProfile = ScanProfile.passive


class ScanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    profile: str
    status: str
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    summary_json: Optional[str]


class FindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scan_run_id: int
    asset_id: int
    check_name: str
    title: str
    description: str
    severity: str
    evidence_json: Optional[str]
    remediation: Optional[str]
    created_at: datetime


class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    finding_id: Optional[int]
    title: str
    description: str
    severity: str
    status: str
    owner: Optional[str]
    actions_taken: Optional[str]
    created_at: datetime
    closed_at: Optional[datetime]


class IncidentUpdate(BaseModel):
    status: Optional[IncidentStatus] = None
    owner: Optional[str] = None
    actions_taken: Optional[str] = None
