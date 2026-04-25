from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.security import require_roles
from app.db import get_session
from app.models import AuditLog, User, UserRole
from app.schemas import AuditLogRead
from app.services.audit import parse_audit_metadata


router = APIRouter(prefix="/audit", tags=["audit"])


def to_audit_read(record: AuditLog) -> AuditLogRead:
    return AuditLogRead(
        id=record.id,
        actor_user_id=record.actor_user_id,
        actor_name=record.actor_name,
        actor_role=record.actor_role,
        event_type=record.event_type,
        entity_type=record.entity_type,
        entity_id=record.entity_id,
        summary=record.summary,
        metadata=parse_audit_metadata(record.metadata_json),
        created_at=record.created_at.isoformat(),
    )


@router.get("", response_model=list[AuditLogRead])
def list_audit_logs(
    limit: int = 100,
    session: Session = Depends(get_session),
    _: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    statement = select(AuditLog).order_by(AuditLog.created_at.desc())
    logs = session.exec(statement.limit(min(max(limit, 1), 300))).all()
    return [to_audit_read(record) for record in logs]
