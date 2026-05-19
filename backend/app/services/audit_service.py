from sqlalchemy.orm import Session

from app.models import AuditLog, User


def audit(
    db: Session,
    actor: User | None,
    action: str,
    target_type: str,
    target_id: int | None = None,
    detail: str | None = None,
) -> AuditLog:
    log = AuditLog(
        actor_user_id=actor.id if actor else None,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
