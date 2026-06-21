from fastapi import APIRouter, HTTPException
from app import db
from app.services import graph_engine
from app.models.schemas import BlastRadiusResponse

router = APIRouter(prefix="/blast-radius", tags=["blast-radius"])


@router.get("/{identity_id}", response_model=BlastRadiusResponse)
def get_blast_radius(identity_id: str):
    identity = db.unified_identities.find_one(identity_id=identity_id)
    if not identity:
        raise HTTPException(status_code=404, detail="Identity not found")

    result = graph_engine.calculate_blast_radius(identity)
    return BlastRadiusResponse(**result)
