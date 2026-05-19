import base64
import os

from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


def generate_private_key() -> str:
    return base64.b64encode(os.urandom(32)).decode("ascii")


def public_key_from_private(private_key_b64: str) -> str:
    raw = base64.b64decode(private_key_b64)
    private_key = X25519PrivateKey.from_private_bytes(raw)
    public_key = private_key.public_key().public_bytes(encoding=Encoding.Raw, format=PublicFormat.Raw)
    return base64.b64encode(public_key).decode("ascii")


def generate_keypair() -> tuple[str, str]:
    private_key = generate_private_key()
    public_key = public_key_from_private(private_key)
    return private_key, public_key


def generate_preshared_key() -> str:
    return base64.b64encode(os.urandom(32)).decode("ascii")
