from app.models import Asset
from app.scanners.base import CheckFinding
from app.utils.http_client import SafeHttpClient


class OptionsMethodsCheck:
    name = "http_options_methods"
    active = True

    RISKY_METHODS = {"TRACE", "TRACK", "PUT", "DELETE"}

    async def run(self, asset: Asset, client: SafeHttpClient) -> list[CheckFinding]:
        response = await client.options(asset.base_url)
        allow_header = response.headers.get("allow", "")
        methods = {m.strip().upper() for m in allow_header.split(",") if m.strip()}
        risky = sorted(methods & self.RISKY_METHODS)

        if not risky:
            return []

        severity = "high" if "TRACE" in risky or "TRACK" in risky else "medium"
        return [CheckFinding(
            check_name=self.name,
            title="Métodos HTTP potencialmente riesgosos expuestos",
            description=f"El endpoint declara métodos potencialmente riesgosos: {', '.join(risky)}.",
            severity=severity,
            evidence={"url": asset.base_url, "allow": allow_header, "risky_methods": risky},
            remediation="Deshabilita métodos no requeridos en proxy, servidor web o aplicación.",
        )]
