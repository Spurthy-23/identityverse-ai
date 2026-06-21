from fastapi import APIRouter, HTTPException, Query
from app import db
from app.services import pipeline, ai_client
from app.models.schemas import RemediationResponse

router = APIRouter(prefix="/identities", tags=["identities"])


@router.post("/recompute")
def recompute():
    """Re-runs resolver + risk scoring + anomaly detection. Call this after
    regenerating synthetic data, or wire it to a button in the Remediation
    Center for a live demo moment."""
    identities = pipeline.run_pipeline()
    return {"status": "ok", "identities_processed": len(identities)}


@router.get("")
def list_identities(
    risk_band: str | None = Query(None, description="LOW | MEDIUM | HIGH | CRITICAL"),
    department: str | None = None,
    orphan_only: bool = False,
    dormant_admin_only: bool = False,
    sort_desc: bool = True,
    limit: int = 100,
):
    identities = db.unified_identities.all()

    if risk_band:
        identities = [i for i in identities if i["risk_band"] == risk_band.upper()]
    if department:
        identities = [i for i in identities if i["department"] == department]
    if orphan_only:
        identities = [i for i in identities if i.get("is_orphan")]
    if dormant_admin_only:
        identities = [i for i in identities if i.get("is_dormant_admin")]

    identities.sort(key=lambda x: x["final_risk_score"], reverse=sort_desc)
    identities = identities[:limit]

    return [
        {
            "identity_id": i["identity_id"],
            "full_name": i["full_name"],
            "department": i["department"],
            "platforms": sorted(set(a["platform"] for a in i["platform_accounts"])),
            "risk_score": i["final_risk_score"],
            "risk_band": i["risk_band"],
            "is_orphan": i.get("is_orphan", False),
            "is_dormant_admin": i.get("is_dormant_admin", False),
        }
        for i in identities
    ]


@router.get("/{identity_id}")
def get_identity(identity_id: str):
    identity = db.unified_identities.find_one(identity_id=identity_id)
    if not identity:
        raise HTTPException(status_code=404, detail="Identity not found")
    return identity


@router.get("/{identity_id}/remediation", response_model=RemediationResponse)
def get_remediation(identity_id: str):
    identity = db.unified_identities.find_one(identity_id=identity_id)
    if not identity:
        raise HTTPException(status_code=404, detail="Identity not found")

    risk = {
        "risk_score": identity["risk_score"],
        "risk_band": identity["risk_band"],
        "risk_factors": identity["risk_factors"],
        "is_cross_platform_admin": identity.get("is_cross_platform_admin"),
        "is_dormant_admin": identity.get("is_dormant_admin"),
        "is_orphan": identity.get("is_orphan"),
        "has_old_token": identity.get("has_old_token"),
    }
    result = ai_client.get_remediation(identity, risk)
    return RemediationResponse(identity_id=identity_id, **result)
