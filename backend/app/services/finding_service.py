import json

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Asset, Finding, Incident, ScanRun
from app.utils.time import utc_now
from app.scanners.base import CheckFinding, SEVERITY_ORDER


def should_create_incident(severity: str) -> bool:
    settings = get_settings()
    if not settings.auto_create_incidents:
        return False
    min_sev = settings.incident_min_severity
    return SEVERITY_ORDER.index(severity) >= SEVERITY_ORDER.index(min_sev)


def persist_finding(db: Session, asset: Asset, scan_run: ScanRun, check_finding: CheckFinding) -> Finding:
    finding = Finding(
        scan_run_id=scan_run.id,
        asset_id=asset.id,
        check_name=check_finding.check_name,
        title=check_finding.title,
        description=check_finding.description,
        severity=check_finding.severity,
        evidence_json=json.dumps(check_finding.evidence, ensure_ascii=False),
        remediation=check_finding.remediation,
    )
    db.add(finding)
    db.flush()

    if should_create_incident(check_finding.severity):
        incident = Incident(
            asset_id=asset.id,
            finding_id=finding.id,
            title=check_finding.title,
            description=check_finding.description,
            severity=check_finding.severity,
            status="open",
            owner=asset.owner,
            created_at=utc_now(),
        )
        db.add(incident)
        db.flush()

    return finding
