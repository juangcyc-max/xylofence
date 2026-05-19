from http.cookies import SimpleCookie

from app.models import Asset
from app.scanners.base import CheckFinding
from app.utils.http_client import SafeHttpClient


class CookieFlagsCheck:
    name = "cookie_flags"
    active = False

    async def run(self, asset: Asset, client: SafeHttpClient) -> list[CheckFinding]:
        response = await client.get(asset.base_url)
        set_cookie_headers = response.headers.get_list("set-cookie")
        findings: list[CheckFinding] = []

        for raw_cookie in set_cookie_headers:
            parsed = SimpleCookie()
            parsed.load(raw_cookie)
            for cookie_name, morsel in parsed.items():
                missing: list[str] = []
                if asset.base_url.startswith("https://") and not morsel["secure"]:
                    missing.append("Secure")
                if not morsel["httponly"]:
                    missing.append("HttpOnly")
                if not morsel["samesite"]:
                    missing.append("SameSite")

                if missing:
                    severity = "medium" if "HttpOnly" in missing else "low"
                    findings.append(CheckFinding(
                        check_name=self.name,
                        title=f"Cookie sin flags recomendados: {cookie_name}",
                        description=f"La cookie {cookie_name} no define: {', '.join(missing)}.",
                        severity=severity,
                        evidence={"cookie_name": cookie_name, "missing_flags": missing},
                        remediation="Configura cookies con Secure, HttpOnly y SameSite según el caso de uso.",
                    ))

        return findings
