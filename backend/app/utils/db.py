from typing import TypeVar

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db import Base

M = TypeVar("M", bound=Base)


def get_or_404(db: Session, model: type[M], obj_id: int) -> M:
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} no encontrado")
    return obj
