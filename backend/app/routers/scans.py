from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Asset, Finding, ScanRun, User
from app.schemas import FindingOut, ScanCreate, ScanOut
from app.security.allowlist import assert_asset_authorized
from app.security.auth import get_current_user, require_admin, require_manager
from app.utils.db import get_or_404
from app.services.scan_service import execute_scan

router = APIRouter(prefix="/scans", tags=["seguridad-escaneos"])


@router.post("", response_model=ScanOut, status_code=status.HTTP_201_CREATED)
async def create_scan(
    payload: ScanCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_manager)],
) -> ScanRun:
    asset = db.get(Asset, payload.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")

    assert_asset_authorized(asset)

    scan_run = ScanRun(asset_id=asset.id, profile=payload.profile.value, status="queued")
    db.add(scan_run)
    db.commit()
    db.refresh(scan_run)

    return await execute_scan(db, asset, scan_run)


@router.get("", response_model=list[ScanOut])
def list_scans(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ScanRun]:
    if current_user.role == "client":
        owned_ids = list(db.scalars(select(Asset.id).where(Asset.owner_user_id == current_user.id)).all())
        query = select(ScanRun).where(ScanRun.asset_id.in_(owned_ids))
    else:
        query = select(ScanRun)
    return list(db.scalars(query.order_by(ScanRun.id.desc())).all())


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan(
    scan_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ScanRun:
    return get_or_404(db, ScanRun, scan_id)


@router.get("/{scan_id}/findings", response_model=list[FindingOut])
def list_findings(
    scan_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Finding]:
    get_or_404(db, ScanRun, scan_id)
    return list(
        db.scalars(select(Finding).where(Finding.scan_run_id == scan_id).order_by(Finding.id.asc())).all()
    )
