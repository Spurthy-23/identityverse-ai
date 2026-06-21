export type RiskBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface DashboardSummary {
  total_users: number;
  high_risk_users: number;
  dormant_admins: number;
  orphan_accounts: number;
  cross_platform_admins: number;
  avg_risk_score: number;
}

export interface RiskDistributionItem {
  band: RiskBand;
  count: number;
}

export interface DepartmentRiskItem {
  department: string;
  avg_risk_score: number;
  count: number;
}

export interface IdentityListItem {
  identity_id: string;
  full_name: string;
  department: string;
  platforms: string[];
  risk_score: number;
  risk_band: RiskBand;
  is_orphan: boolean;
  is_dormant_admin: boolean;
}

export interface PlatformAccount {
  snapshot_id: string;
  user_id: string;
  platform: string;
  username: string;
  role: string;
  last_login: string;
  status: string;
  department: string;
  manager: string | null;
  token_age_days: number;
  is_admin: boolean;
}

export interface IdentityDetail {
  identity_id: string;
  full_name: string;
  department: string;
  manager: string | null;
  merged_usernames: string[];
  platform_accounts: PlatformAccount[];
  resolution_confidence: number;
  risk_score: number;
  risk_band: RiskBand;
  risk_factors: string[];
  is_cross_platform_admin: boolean;
  is_dormant_admin: boolean;
  is_orphan: boolean;
  has_old_token: boolean;
  anomaly_score: number;
  final_risk_score: number;
}

export interface GraphNode {
  id: string;
  type: "user" | "role" | "permission" | "resource";
  label: string;
  platform?: string;
  sensitive?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface BlastRadiusResponse {
  identity_id: string;
  systems_impacted: number;
  critical_resources: number;
  customer_data_exposed: boolean;
  impact_level: RiskBand;
  reachable_resources: string[];
}

export interface RemediationResponse {
  identity_id: string;
  summary: string;
  business_impact: string;
  remediation_steps: string[];
  source: "groq" | "fallback_template";
}

export interface CopilotMessage {
  role: "user" | "assistant";
  text: string;
  data?: unknown;
}

export interface TimelineEvent {
  timestamp: string;
  platform: string;
  action: string;
}

export interface TimelineResponse {
  identity_id: string;
  full_name: string;
  events: TimelineEvent[];
}
