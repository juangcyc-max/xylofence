from dataclasses import dataclass, field
from typing import Any, Protocol

from app.models import Asset
from app.utils.http_client import SafeHttpClient

SEVERITY_ORDER = ["info", "low", "medium", "high", "critical"]


@dataclass
class CheckFinding:
    check_name: str
    title: str
    description: str
    severity: str = "info"
    evidence: dict[str, Any] = field(default_factory=dict)
    remediation: str | None = None


class Check(Protocol):
    name: str
    active: bool

    async def run(self, asset: Asset, client: SafeHttpClient) -> list[CheckFinding]: ...


def max_severity(findings: list[CheckFinding]) -> str:
    if not findings:
        return "info"
    return max((f.severity for f in findings), key=lambda s: SEVERITY_ORDER.index(s))
