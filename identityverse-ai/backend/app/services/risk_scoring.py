"""
Risk Scoring Engine -- rule-based and deterministic by design (MVP 2).

Deliberately NOT ML-based for the core score: a hackathon judge can ask
"why is this score 92?" and you need a one-line, defensible answer. The
Isolation Forest anomaly score (anomaly_detection.py) is blended in as a
secondary signal, not the primary driver.
"""
from datetime import datetime, timezone

CROSS_PLATFORM_ADMIN_POINTS = 30
DORMANT_ADMIN_POINTS = 25
OLD_TOKEN_POINTS = 20
ORPHAN_ACCOUNT_POINTS = 40

DORMANT_DAYS_THRESHOLD = 90
OLD_TOKEN_DAYS_THRESHOLD = 365


def _days_since(iso_timestamp: str) -> int:
    dt = datetime.fromisoformat(iso_timestamp)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt).days


def score_identity(platform_accounts: list[dict]) -> dict:
    """Takes the list of platform_accounts (identity_snapshots) for one
    unified identity and returns the risk score + the human-readable
    factors that produced it."""
    score = 0
    factors = []

    admin_platforms = [a["platform"] for a in platform_accounts if a.get("is_admin")]
    is_cross_platform_admin = len(set(admin_platforms)) >= 2
    if is_cross_platform_admin:
        score += CROSS_PLATFORM_ADMIN_POINTS
        factors.append(f"Admin on {len(set(admin_platforms))} platforms "
                        f"({', '.join(sorted(set(admin_platforms)))})")

    is_dormant_admin = False
    for acct in platform_accounts:
        if acct.get("is_admin") and _days_since(acct["last_login"]) > DORMANT_DAYS_THRESHOLD:
            is_dormant_admin = True
            score += DORMANT_ADMIN_POINTS
            factors.append(
                f"Dormant admin on {acct['platform']} "
                f"({_days_since(acct['last_login'])} days inactive)"
            )
            break  # count once even if dormant on multiple platforms

    has_old_token = False
    for acct in platform_accounts:
        if acct.get("token_age_days", 0) > OLD_TOKEN_DAYS_THRESHOLD:
            has_old_token = True
            score += OLD_TOKEN_POINTS
            factors.append(
                f"Stale credential on {acct['platform']} "
                f"({acct['token_age_days']} days old, never rotated)"
            )
            break

    # Orphan: disabled on AD but active elsewhere
    statuses = {a["platform"]: a["status"] for a in platform_accounts}
    is_orphan = statuses.get("AD") == "Disabled" and any(
        s == "Active" for p, s in statuses.items() if p != "AD"
    )
    if is_orphan:
        score += ORPHAN_ACCOUNT_POINTS
        active_elsewhere = [p for p, s in statuses.items() if p != "AD" and s == "Active"]
        factors.append(
            f"Orphan account: disabled in AD but still active in "
            f"{', '.join(active_elsewhere)}"
        )

    score = min(score, 100)

    if score >= 70:
        band = "CRITICAL"
    elif score >= 45:
        band = "HIGH"
    elif score >= 20:
        band = "MEDIUM"
    else:
        band = "LOW"

    if not factors:
        factors.append("No elevated risk factors detected")

    return {
        "risk_score": score,
        "risk_band": band,
        "risk_factors": factors,
        "is_cross_platform_admin": is_cross_platform_admin,
        "is_dormant_admin": is_dormant_admin,
        "is_orphan": is_orphan,
        "has_old_token": has_old_token,
    }
