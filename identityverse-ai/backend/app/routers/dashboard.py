from fastapi import APIRouter
from app import db
from app.models.schemas import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary():
    identities = db.unified_identities.all()
    total = len(identities)
    high_risk = sum(1 for i in identities if i["risk_band"] in ("HIGH", "CRITICAL"))
    dormant_admins = sum(1 for i in identities if i.get("is_dormant_admin"))
    orphans = sum(1 for i in identities if i.get("is_orphan"))
    cross_platform_admins = sum(1 for i in identities if i.get("is_cross_platform_admin"))
    avg_score = round(sum(i["final_risk_score"] for i in identities) / total, 1) if total else 0.0

    return DashboardSummary(
        total_users=total,
        high_risk_users=high_risk,
        dormant_admins=dormant_admins,
        orphan_accounts=orphans,
        cross_platform_admins=cross_platform_admins,
        avg_risk_score=avg_score,
    )


@router.get("/risk-distribution")
def get_risk_distribution():
    identities = db.unified_identities.all()
    bands = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    for i in identities:
        bands[i["risk_band"]] = bands.get(i["risk_band"], 0) + 1
    return [{"band": k, "count": v} for k, v in bands.items()]


@router.get("/department-risk")
def get_department_risk():
    identities = db.unified_identities.all()
    dept_scores: dict[str, list] = {}
    for i in identities:
        dept_scores.setdefault(i["department"], []).append(i["final_risk_score"])
    return [
        {"department": dept, "avg_risk_score": round(sum(scores) / len(scores), 1), "count": len(scores)}
        for dept, scores in dept_scores.items()
    ]
