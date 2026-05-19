import json

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Asset, ScanRun
from app.utils.time import utc_now
from app.scanners.base import Check, max_severity
from app.scanners.cookies import CookieFlagsCheck
from app.scanners.http_headers import HttpSecurityHeadersCheck
from app.scanners.options_methods import OptionsMethodsCheck
from app.scanners.telemetry_probe import TelemetryProbeCheck
from app.scanners.tls_certificate import TlsCertificateCheck
from app.services.finding_service import persist_finding
from app.utils.http_client import RequestBudget, SafeHttpClient


def checks_for_profile(profile: str) -> list[Check]:
    passive: list[Check] = [
        HttpSecurityHeadersCheck(),
        CookieFlagsCheck(),
        TlsCertificateCheck(),
    ]
    safe_active: list[Check] = passive + [
        OptionsMethodsCheck(),
        TelemetryProbeCheck(),
    ]
    if profile == "passive":
        return passive
    if profile == "safe_active":
        return safe_active
    raise ValueError(f"Perfil no soportado: {profile}")


async def execute_scan(db: Session, asset: Asset, scan_run: ScanRun) -> ScanRun:
    settings = get_settings()
    budget = RequestBudget(max_requests=settings.max_requests_per_scan)
    client = SafeHttpClient(budget=budget)
    scan_run.status = "running"
    scan_run.started_at = utc_now()
    db.commit()
    db.refresh(scan_run)

    all_findings = []
    errors: list[dict] = []

    for check in checks_for_profile(scan_run.profile):
        try:
            findings = await check.run(asset, client)
            for item in findings:
                persist_finding(db, asset, scan_run, item)
            all_findings.extend(findings)
        except Exception as exc:
            errors.append({"check": check.name, "error": str(exc)})

    summary = {
        "profile": scan_run.profile,
        "requests_used": budget.used,
        "findings_count": len(all_findings),
        "max_severity": max_severity(all_findings),
        "errors": errors,
    }

    scan_run.status = "completed_with_errors" if errors else "completed"
    scan_run.finished_at = utc_now()
    scan_run.summary_json = json.dumps(summary, ensure_ascii=False)
    db.commit()
    db.refresh(scan_run)
    return scan_run
