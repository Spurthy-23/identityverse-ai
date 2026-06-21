"""
Pipeline: runs Identity Resolver -> Risk Scoring -> Anomaly Detection and
writes the combined result into db.unified_identities. This is what the
API routers read from -- they never call the individual services directly,
so the whole computation only needs to run once (at startup, or on demand
via POST /identities/recompute) rather than on every request.
"""
from app import db
from app.services import identity_resolver, risk_scoring, anomaly_detection


def run_pipeline() -> list[dict]:
    identities = identity_resolver.resolve_identities()

    for identity in identities:
        risk = risk_scoring.score_identity(identity["platform_accounts"])
        identity.update(risk)

    anomaly_scores = anomaly_detection.run_anomaly_detection(identities)
    for identity in identities:
        anomaly_score = anomaly_scores.get(identity["identity_id"], 0.0)
        identity["anomaly_score"] = anomaly_score
        # Blend: 70% deterministic rule score + 30% anomaly score, capped at 100
        identity["final_risk_score"] = round(
            min(100, 0.7 * identity["risk_score"] + 0.3 * anomaly_score), 1
        )

    db.unified_identities.truncate()
    db.unified_identities.insert_many(identities)
    db.flush()
    return identities
