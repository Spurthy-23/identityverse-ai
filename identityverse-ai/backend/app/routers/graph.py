from fastapi import APIRouter, HTTPException
from app import db
from app.services import graph_engine
from app.models.schemas import GraphResponse

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/{identity_id}", response_model=GraphResponse)
def get_identity_graph(identity_id: str):
    identity = db.unified_identities.find_one(identity_id=identity_id)
    if not identity:
        raise HTTPException(status_code=404, detail="Identity not found")

    G = graph_engine.build_graph_for_identity(identity)
    return graph_engine.graph_to_json(G)
