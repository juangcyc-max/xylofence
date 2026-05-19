"""
Xylofence Node Agent — opcional para servidores WireGuard.

Por seguridad, está en modo dry-run por defecto.
No reinicia servicios ni escribe en /etc/wireguard salvo que configures APPLY_CHANGES=true.

Variables:
- NODE_AGENT_TOKEN: token compartido con el backend u operador.
- APPLY_CHANGES: true/false.
- WG_CONFIG_PATH: ruta de wg0.conf.
"""
import os
import subprocess
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

NODE_AGENT_TOKEN = os.getenv("NODE_AGENT_TOKEN", "change-me")
APPLY_CHANGES = os.getenv("APPLY_CHANGES", "false").lower() == "true"
WG_CONFIG_PATH = Path(os.getenv("WG_CONFIG_PATH", "/etc/wireguard/wg0.conf"))

app = FastAPI(title="Xylofence Node Agent", version="1.0.0")


class ConfigApplyRequest(BaseModel):
    config: str
    restart: bool = False


def require_token(authorization: str | None):
    if authorization != f"Bearer {NODE_AGENT_TOKEN}":
        raise HTTPException(status_code=401, detail="Token inválido")


@app.get("/health")
def health():
    return {"status": "ok", "apply_changes": APPLY_CHANGES, "path": str(WG_CONFIG_PATH)}


@app.post("/apply-config")
def apply_config(payload: ConfigApplyRequest, authorization: str | None = Header(default=None)):
    require_token(authorization)

    if not payload.config.strip().startswith("# Xylofence"):
        raise HTTPException(status_code=400, detail="Configuración no generada por Xylofence")

    if not APPLY_CHANGES:
        return {"message": "Dry-run OK. Configuración recibida pero no aplicada.", "bytes": len(payload.config.encode())}

    WG_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    backup_path = WG_CONFIG_PATH.with_suffix(".conf.bak")
    if WG_CONFIG_PATH.exists():
        backup_path.write_text(WG_CONFIG_PATH.read_text())

    WG_CONFIG_PATH.write_text(payload.config)
    restarted = False
    if payload.restart:
        subprocess.run(["systemctl", "restart", "wg-quick@wg0"], check=True)
        restarted = True

    return {"message": "Configuración aplicada", "path": str(WG_CONFIG_PATH), "restarted": restarted}
