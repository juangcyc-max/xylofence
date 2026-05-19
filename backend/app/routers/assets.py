from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Asset, User
from app.schemas import AssetCreate, AssetOut
from app.security.allowlist import host_matches_allowlist, normalize_hostname
from app.security.auth import get_current_user, require_admin, require_manager
from app.config import get_settings
from app.utils.db import get_or_404

router = APIRouter(prefix="/assets", tags=["seguridad-activos"])


@router.post("", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: AssetCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_manager)],
) -> Asset:
    settings = get_settings()
    base_url = str(payload.base_url).rstrip("/")
    host = normalize_hostname(base_url)

    if not payload.authorized and not host_matches_allowlist(host, settings.allowed_host_list):
        raise HTTPException(
            status_code=403,
            detail=f"Host '{host}' fuera de ALLOWED_HOSTS. Marca el activo como autorizado para confirmar que tienes permiso.",
        )

    existing = db.scalar(select(Asset).where(Asset.base_url == base_url))
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un activo con esa base_url.")

    asset = Asset(
        name=payload.name,
        base_url=base_url,
        environment=payload.environment,
        owner=payload.owner,
        owner_user_id=payload.owner_user_id,
        authorized=payload.authorized,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("", response_model=list[AssetOut])
def list_assets(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Asset]:
    query = select(Asset).order_by(Asset.created_at.desc())
    if current_user.role == "client":
        query = query.where(Asset.owner_user_id == current_user.id)
    return list(db.scalars(query).all())


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(
    asset_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Asset:
    return get_or_404(db, Asset, asset_id)


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: int,
    payload: AssetCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_manager)],
) -> Asset:
    asset = get_or_404(db, Asset, asset_id)
    asset.name = payload.name
    asset.environment = payload.environment
    asset.owner = payload.owner
    asset.owner_user_id = payload.owner_user_id
    asset.authorized = payload.authorized
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=204)
def delete_asset(
    asset_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_manager)],
):
    asset = get_or_404(db, Asset, asset_id)
    db.delete(asset)
    db.commit()
