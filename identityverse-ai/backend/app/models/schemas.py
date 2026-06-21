"""Pydantic response/request models. Kept loose (lots of dict-like fields)
since this is a hackathon project -- strict schemas slow you down more than
they help when the data shape is still evolving."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class DashboardSummary(BaseModel):
    total_users: int
    high_risk_users: int
    dormant_admins: int
    orphan_accounts: int
    cross_platform_admins: int
    avg_risk_score: float


class IdentityListItem(BaseModel):
    identity_id: str
    full_name: str
    department: str
    platforms: List[str]
    risk_score: float
    risk_band: str
    is_orphan: bool
    is_dormant_admin: bool


class IdentityDetail(BaseModel):
    identity_id: str
    full_name: str
    department: str
    manager: Optional[str] = None
    platform_accounts: List[Dict[str, Any]]
    risk_score: float
    risk_band: str
    risk_factors: List[str]
    anomaly_score: Optional[float] = None
    merged_usernames: List[str]


class GraphResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class BlastRadiusResponse(BaseModel):
    identity_id: str
    systems_impacted: int
    critical_resources: int
    customer_data_exposed: bool
    impact_level: str
    reachable_resources: List[str]


class CopilotQuery(BaseModel):
    question: str


class CopilotResponse(BaseModel):
    answer: str
    data: Optional[Any] = None


class RemediationResponse(BaseModel):
    identity_id: str
    summary: str
    business_impact: str
    remediation_steps: List[str]
    source: str  # "groq" or "fallback_template"
