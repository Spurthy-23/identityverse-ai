"""
Privilege Creep Timeline -- built from ROLE_CHANGE events in the audit log,
sorted chronologically per identity. (Simplified vs. a dedicated historical
snapshot table -- good enough to show real privilege growth over time, and
honest about being derived from audit events rather than a separate
time-series store.)
"""
from fastapi import APIRouter, HTTPException
from app import db

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("/{identity_id}")
def get_privilege_timeline(identity_id: str):
    identity = db.unified_identities.find_one(identity_id=identity_id)
    if not identity:
        raise HTTPException(status_code=404, detail="Identity not found")

    events = [
        e for e in db.audit_logs.find(user_id=identity_id)
        if e["action"] in ("ROLE_CHANGE", "PERMISSION_GRANT")
    ]
    events.sort(key=lambda e: e["timestamp"])

    return {
        "identity_id": identity_id,
        "full_name": identity["full_name"],
        "events": [
            {"timestamp": e["timestamp"], "platform": e["platform"], "action": e["action"]}
            for e in events
        ],
    }
