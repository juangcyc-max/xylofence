from urllib.parse import urlparse

from fastapi import HTTPException, status

from app.config import get_settings
from app.models import Asset


class AuthorizationError(ValueError):
    pass


def normalize_hostname(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise AuthorizationError("Solo se permiten esquemas http o https.")
    if not parsed.hostname:
        raise AuthorizationError("URL sin hostname válido.")
    return parsed.hostname.lower()


def host_matches_allowlist(host: str, allowed_hosts: list[str]) -> bool:
    if not allowed_hosts:
        return True
    host = host.lower().rstrip(".")
    for allowed in allowed_hosts:
        allowed = allowed.lower().rstrip(".")
        if host == allowed or host.endswith(f".{allowed}"):
            return True
    return False


def assert_asset_authorized(asset: Asset) -> None:
    settings = get_settings()
    if not asset.authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Activo no autorizado. Marca authorized=true solo si tienes permiso explícito.",
        )
    try:
        host = normalize_hostname(asset.base_url)
    except AuthorizationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Si el activo está explícitamente autorizado, se omite la comprobación de allowlist
    if not asset.authorized and not host_matches_allowlist(host, settings.allowed_host_list):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Host '{host}' fuera de ALLOWED_HOSTS.",
        )
