"""
Audit Logging Service
Maintains immutable audit trail for clinical record views, role transitions,
consent grants/revocations, and prediction requests.
"""

import uuid
import datetime
from typing import Dict, Any, Optional

from backend.app.services.db_service import db


def log_audit_event(
    actor_uid: str,
    action: str,
    resource_type: str,
    resource_id: str,
    outcome: str = "SUCCESS",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    event_id = f"audit_{uuid.uuid4().hex[:12]}"
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    event = {
        "eventId": event_id,
        "actorUid": actor_uid,
        "action": action,
        "resourceType": resource_type,
        "resourceId": resource_id,
        "outcome": outcome,
        "timestamp": timestamp,
        "metadata": metadata or {}
    }

    try:
        db.set("audit_logs", event_id, event)
    except Exception as e:
        print(f"[Audit Log Error] Failed to persist audit entry {event_id}: {e}")

    return event
