import socket
import ssl
from datetime import datetime, timezone
from urllib.parse import urlparse

from app.models import Asset
from app.scanners.base import CheckFinding
from app.utils.http_client import SafeHttpClient


class TlsCertificateCheck:
    name = "tls_certificate"
    active = False

    async def run(self, asset: Asset, client: SafeHttpClient) -> list[CheckFinding]:
        parsed = urlparse(asset.base_url)
        if parsed.scheme != "https":
            return [CheckFinding(
                check_name=self.name,
                title="Activo sin HTTPS",
                description="El activo no usa HTTPS en la URL base registrada.",
                severity="high",
                evidence={"url": asset.base_url},
                remediation="Publica el servicio mediante HTTPS con certificado válido.",
            )]

        hostname = parsed.hostname
        if not hostname:
            return []

        port = parsed.port or 443
        context = ssl.create_default_context()
        try:
            with socket.create_connection((hostname, port), timeout=8) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
        except Exception as exc:
            return [CheckFinding(
                check_name=self.name,
                title="No se pudo validar el certificado TLS",
                description="La conexión TLS falló durante la validación.",
                severity="high",
                evidence={"error": str(exc), "host": hostname, "port": port},
                remediation="Revisa cadena de certificados, hostname, caducidad y configuración TLS.",
            )]

        findings: list[CheckFinding] = []
        not_after = cert.get("notAfter")
        if not_after:
            expires_at = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
            days_left = (expires_at - datetime.now(timezone.utc)).days
            if days_left < 0:
                sev, title = "critical", "Certificado TLS caducado"
            elif days_left <= 14:
                sev, title = "high", "Certificado TLS próximo a caducar"
            elif days_left <= 30:
                sev, title = "medium", "Certificado TLS caduca en menos de 30 días"
            else:
                sev, title = "info", "Certificado TLS válido"

            if sev != "info":
                findings.append(CheckFinding(
                    check_name=self.name,
                    title=title,
                    description=f"El certificado TLS caduca en {days_left} días.",
                    severity=sev,
                    evidence={"host": hostname, "expires_at": expires_at.isoformat(), "days_left": days_left},
                    remediation="Renueva el certificado y automatiza alertas de caducidad.",
                ))
        return findings
