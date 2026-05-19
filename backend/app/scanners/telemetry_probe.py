from urllib.parse import urljoin
from uuid import uuid4

from app.models import Asset
from app.scanners.base import CheckFinding
from app.utils.http_client import SafeHttpClient


class TelemetryProbeCheck:
    name = "telemetry_probe"
    active = True

    async def run(self, asset: Asset, client: SafeHttpClient) -> list[CheckFinding]:
        simulation_id = f"xylofence-{uuid4()}"
        probe_url = urljoin(asset.base_url.rstrip("/") + "/", "__security_detection_probe__")
        response = await client.get(probe_url, headers={"X-Security-Simulation-Id": simulation_id})

        if response.status_code in {401, 403, 404}:
            return [CheckFinding(
                check_name=self.name,
                title="Sonda de telemetría emitida",
                description=(
                    "Se emitió una petición identificable para validar que la telemetría defensiva "
                    "la registra. Verifica el ID en tus logs/SIEM."
                ),
                severity="info",
                evidence={"probe_url": probe_url, "simulation_id": simulation_id, "status_code": response.status_code},
                remediation="Correlaciona simulation_id en logs de proxy, WAF, SIEM o aplicación.",
            )]

        return [CheckFinding(
            check_name=self.name,
            title="Sonda de telemetría con respuesta inesperada",
            description="La ruta de sonda respondió con un código no esperado para un recurso inexistente.",
            severity="low",
            evidence={"probe_url": probe_url, "simulation_id": simulation_id, "status_code": response.status_code},
            remediation="Revisa routing, fallback de SPA, páginas catch-all y trazabilidad de logs.",
        )]
