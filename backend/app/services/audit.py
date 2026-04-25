import json
from typing import Any

from sqlmodel import Session

from app.models import AuditEvent, AuditLog, User


def write_audit_log(
    session: Session,
    *,
    actor: User,
    event_type: AuditEvent,
    entity_type: str,
    entity_id: int | None,
    summary: str,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    record = AuditLog(
        actor_user_id=actor.id,
        actor_name=actor.full_name,
        actor_role=actor.role.value,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        summary=summary,
        metadata_json=json.dumps(metadata or {}, ensure_ascii=False),
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def parse_audit_metadata(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        payload = json.loads(raw)
        return payload if isinstance(payload, dict) else {}
    except json.JSONDecodeError:
        return {}
