import base64
import os
import uuid

from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.serialization import (
    Encoding, NoEncryption, PrivateFormat, PublicFormat,
)


def generate_reality_keypair() -> tuple[str, str]:
    key = X25519PrivateKey.generate()
    priv = key.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
    pub = key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    priv_b64 = base64.urlsafe_b64encode(priv).decode().rstrip("=")
    pub_b64 = base64.urlsafe_b64encode(pub).decode().rstrip("=")
    return priv_b64, pub_b64


def generate_uuid() -> str:
    return str(uuid.uuid4())


def generate_short_id() -> str:
    return os.urandom(8).hex()


def build_vless_link(
    client_uuid: str,
    ip: str,
    port: int,
    public_key: str,
    short_id: str,
    sni: str,
    name: str,
) -> str:
    params = (
        f"security=reality"
        f"&sni={sni}"
        f"&fp=chrome"
        f"&pbk={public_key}"
        f"&sid={short_id}"
        f"&flow=xtls-rprx-vision"
        f"&type=tcp"
    )
    return f"vless://{client_uuid}@{ip}:{port}?{params}#{name}"
