"""
ML Anomaly Detection -- Isolation Forest, blended as a secondary signal
on top of the deterministic risk score (see risk_scoring.py docstring for
why it's secondary, not primary).
"""
from datetime import datetime, timezone

import numpy as np
from sklearn.ensemble import IsolationForest

from app import db

FEATURE_NAMES = [
    "login_frequency_30d",   # audit log events in last 30 days
    "privilege_count",       # number of admin roles held
    "platform_spread",       # number of distinct platforms
    "dormancy_days",         # days since most recent login, any platform
    "max_token_age_days",
]


def _days_since(iso_timestamp: str) -> int:
    dt = datetime.fromisoformat(iso_timestamp)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt).days


def _extract_features(identity: dict, audit_logs_by_user: dict) -> list[float]:
    accounts = identity["platform_accounts"]
    logins = audit_logs_by_user.get(identity["identity_id"], [])
    recent_logins = [
        l for l in logins
        if l["action"] == "LOGIN" and _days_since(l["timestamp"]) <= 30
    ]
    privilege_count = sum(1 for a in accounts if a.get("is_admin"))
    platform_spread = len(set(a["platform"] for a in accounts))
    dormancy_days = min(_days_since(a["last_login"]) for a in accounts) if accounts else 0
    max_token_age = max((a.get("token_age_days", 0) for a in accounts), default=0)

    return [
        len(recent_logins),
        privilege_count,
        platform_spread,
        dormancy_days,
        max_token_age,
    ]


def run_anomaly_detection(unified_identities: list[dict]) -> dict[str, float]:
    """Returns {identity_id: anomaly_score 0-100} where higher = more anomalous."""
    if not unified_identities:
        return {}

    logs = db.audit_logs.all()
    audit_logs_by_user: dict[str, list] = {}
    for log in logs:
        audit_logs_by_user.setdefault(log["user_id"], []).append(log)

    feature_matrix = []
    ids = []
    for identity in unified_identities:
        feature_matrix.append(_extract_features(identity, audit_logs_by_user))
        ids.append(identity["identity_id"])

    X = np.array(feature_matrix)

    # contamination matches the ~15% combined anomaly rate baked into the
    # synthetic data generator
    model = IsolationForest(
        n_estimators=150, contamination=0.15, random_state=42
    )
    model.fit(X)

    # decision_function: higher = more normal. Flip + rescale to 0-100
    # where 100 = most anomalous, for an intuitive "anomaly score".
    raw_scores = model.decision_function(X)
    normalized = (raw_scores.max() - raw_scores) / (raw_scores.max() - raw_scores.min() + 1e-9)
    anomaly_scores = (normalized * 100).round(1)

    return {uid: float(score) for uid, score in zip(ids, anomaly_scores)}
