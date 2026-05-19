import asyncio
import json
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db
from app.models import HostPort, HostScan, User
from app.security.auth import require_admin
from app.services.audit_service import audit
from app.services.host_scanner import get_system_info, scan_host
from app.utils.time import utc_now

router = APIRouter(prefix="/host-scans", tags=["escaner-host"])


class HostScanCreate(BaseModel):
    target: str
    timeout: float = 0.5


class HostPortOut(BaseModel):
    id: int
    port: int
    protocol: str
    service: str
    banner: str | None
    severity: str
    risk_description: str | None

    model_config = {"from_attributes": True}


class HostScanOut(BaseModel):
    id: int
    target: str
    status: str
    total_ports_scanned: int
    open_ports_count: int
    risk_score: str | None
    started_at: str
    finished_at: str | None
    ports: list[HostPortOut] = []

    model_config = {"from_attributes": True}

    def model_post_init(self, __context):
        if hasattr(self, "started_at") and not isinstance(self.started_at, str):
            object.__setattr__(self, "started_at", self.started_at.isoformat())
        if hasattr(self, "finished_at") and self.finished_at and not isinstance(self.finished_at, str):
            object.__setattr__(self, "finished_at", self.finished_at.isoformat())


def _run_scan(scan_id: int, target: str, timeout: float):
    db = SessionLocal()
    try:
        scan = db.get(HostScan, scan_id)
        if not scan:
            return
        result = asyncio.run(scan_host(target, timeout))
        for p in result["open_ports"]:
            db.add(HostPort(
                scan_id=scan_id,
                port=p["port"],
                protocol=p["protocol"],
                service=p["service"],
                banner=p["banner"],
                severity=p["severity"],
                risk_description=p["risk_description"],
            ))
        scan.open_ports_count = len(result["open_ports"])
        scan.total_ports_scanned = result["total_ports_scanned"]
        scan.risk_score = result["risk_score"]
        scan.status = "completed"
        scan.finished_at = utc_now()
        db.commit()
    except Exception as exc:
        try:
            scan = db.get(HostScan, scan_id)
            if scan:
                scan.status = "failed"
                scan.finished_at = utc_now()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("", response_model=HostScanOut, status_code=202)
def start_scan(
    payload: HostScanCreate,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    target = payload.target.strip()
    if not target:
        raise HTTPException(status_code=422, detail="Target requerido")
    timeout = max(0.2, min(payload.timeout, 3.0))

    scan = HostScan(target=target, status="running", created_by=current_user.id)
    db.add(scan)
    db.commit()
    db.refresh(scan)
    audit(db, current_user, "host_scan.started", "host_scan", scan.id, detail=target)
    background_tasks.add_task(_run_scan, scan.id, target, timeout)
    return _scan_to_out(scan)


@router.get("", response_model=list[HostScanOut])
def list_scans(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    scans = db.scalars(select(HostScan).order_by(HostScan.id.desc()).limit(50)).all()
    return [_scan_to_out(s) for s in scans]


@router.get("/{scan_id}", response_model=HostScanOut)
def get_scan(
    scan_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    scan = db.get(HostScan, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Escaneo no encontrado")
    return _scan_to_out(scan, include_ports=True)


@router.delete("/{scan_id}", status_code=204)
def delete_scan(
    scan_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_admin)],
):
    scan = db.get(HostScan, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Escaneo no encontrado")
    db.delete(scan)
    db.commit()


@router.get("/system/info")
def system_info(current_user: Annotated[User, Depends(require_admin)]):
    return get_system_info()


def _scan_to_out(scan: HostScan, include_ports: bool = True) -> HostScanOut:
    return HostScanOut(
        id=scan.id,
        target=scan.target,
        status=scan.status,
        total_ports_scanned=scan.total_ports_scanned,
        open_ports_count=scan.open_ports_count,
        risk_score=scan.risk_score,
        started_at=scan.started_at.isoformat(),
        finished_at=scan.finished_at.isoformat() if scan.finished_at else None,
        ports=[
            HostPortOut(
                id=p.id, port=p.port, protocol=p.protocol, service=p.service,
                banner=p.banner, severity=p.severity, risk_description=p.risk_description,
            )
            for p in (scan.ports if include_ports else [])
        ],
    )
