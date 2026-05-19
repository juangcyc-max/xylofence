from app.models import Asset
from app.scanners.base import CheckFinding
from app.utils.http_client import SafeHttpClient


class HttpSecurityHeadersCheck:
    name = "http_security_headers"
    active = False

    REQUIRED_HEADERS = {
        "content-security-policy": {
            "severity": "medium",
            "remediation": "Define una política Content-Security-Policy ajustada a la aplicación.",
        },
        "x-content-type-options": {
            "severity": "low",
            "remediation": "Añade X-Content-Type-Options: nosniff.",
        },
        "x-frame-options": {
            "severity": "medium",
            "remediation": "Añade X-Frame-Options: DENY/SAMEORIGIN o usa frame-ancestors en CSP.",
        },
        "referrer-policy": {
            "severity": "low",
            "remediation": "Configura Referrer-Policy, por ejemplo strict-origin-when-cross-origin.",
        },
        "permissions-policy": {
            "severity": "low",
            "remediation": "Define Permissions-Policy para limitar APIs del navegador no necesarias.",
        },
    }

    async def run(self, asset: Asset, client: SafeHttpClient) -> list[CheckFinding]:
        response = await client.get(asset.base_url)
        headers = {k.lower(): v for k, v in response.headers.items()}
        findings: list[CheckFinding] = []

        for header, meta in self.REQUIRED_HEADERS.items():
            if header not in headers:
                findings.append(CheckFinding(
                    check_name=self.name,
                    title=f"Falta cabecera HTTP de seguridad: {header}",
                    description=f"La respuesta de {asset.base_url} no incluye la cabecera {header}.",
                    severity=meta["severity"],
                    evidence={"url": asset.base_url, "status_code": response.status_code, "missing_header": header},
                    remediation=meta["remediation"],
                ))

        if asset.base_url.startswith("https://") and "strict-transport-security" not in headers:
            findings.append(CheckFinding(
                check_name=self.name,
                title="Falta Strict-Transport-Security en HTTPS",
                description="El sitio usa HTTPS pero no declara HSTS en la respuesta principal.",
                severity="high",
                evidence={"url": asset.base_url, "status_code": response.status_code},
                remediation="Añade Strict-Transport-Security con max-age adecuado.",
            ))

        return findings
