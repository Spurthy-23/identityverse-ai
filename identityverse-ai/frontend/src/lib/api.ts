import axios from "axios";
import type {
  DashboardSummary,
  RiskDistributionItem,
  DepartmentRiskItem,
  IdentityListItem,
  IdentityDetail,
  GraphResponse,
  BlastRadiusResponse,
  RemediationResponse,
  TimelineResponse,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

export const api = {
  health: () => client.get("/health").then((r) => r.data),

  dashboardSummary: () =>
    client.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),

  riskDistribution: () =>
    client.get<RiskDistributionItem[]>("/dashboard/risk-distribution").then((r) => r.data),

  departmentRisk: () =>
    client.get<DepartmentRiskItem[]>("/dashboard/department-risk").then((r) => r.data),

  listIdentities: (params?: {
    risk_band?: string;
    department?: string;
    orphan_only?: boolean;
    dormant_admin_only?: boolean;
    limit?: number;
  }) =>
    client
      .get<IdentityListItem[]>("/identities", { params })
      .then((r) => r.data),

  getIdentity: (id: string) =>
    client.get<IdentityDetail>(`/identities/${id}`).then((r) => r.data),

  getRemediation: (id: string) =>
    client.get<RemediationResponse>(`/identities/${id}/remediation`).then((r) => r.data),

  getGraph: (id: string) =>
    client.get<GraphResponse>(`/graph/${id}`).then((r) => r.data),

  getBlastRadius: (id: string) =>
    client.get<BlastRadiusResponse>(`/blast-radius/${id}`).then((r) => r.data),

  getTimeline: (id: string) =>
    client.get<TimelineResponse>(`/timeline/${id}`).then((r) => r.data),

  chatCopilot: (question: string) =>
    client
      .post<{ answer: string; data?: unknown }>("/copilot/chat", { question })
      .then((r) => r.data),

  recompute: () => client.post("/identities/recompute").then((r) => r.data),
};
