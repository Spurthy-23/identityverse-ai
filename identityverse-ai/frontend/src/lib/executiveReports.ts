import { api } from "@/lib/api";
import type { IdentityListItem, IdentityDetail, BlastRadiusResponse, RemediationResponse } from "@/types";

/**
 * All report content is built from existing endpoints -- dashboard
 * summary/distribution, the identity list, and (for the small number of
 * incidents featured in the Incident Report) the per-identity detail,
 * blast-radius, and remediation endpoints. No new backend routes.
 */

export interface IncidentEntry {
  identity: IdentityDetail;
  blastRadius: BlastRadiusResponse | null;
  remediation: RemediationResponse | null;
}

export interface ExecutiveReportData {
  generatedAt: string;
  totalIdentities: number;
  highRiskCount: number;
  orphanCount: number;
  dormantAdminCount: number;
  crossPlatformAdminCount: number;
  avgRiskScore: number;
  mostDangerousDepartment: { department: string; avg_risk_score: number } | null;
  riskByBand: Record<string, number>;
  topIdentities: IdentityListItem[];
  incidents: IncidentEntry[];
}

const INCIDENT_SAMPLE_SIZE = 6;

export async function loadReportData(): Promise<ExecutiveReportData> {
  const [summary, distribution, deptRisk, allIdentities] = await Promise.all([
    api.dashboardSummary(),
    api.riskDistribution(),
    api.departmentRisk(),
    api.listIdentities({ limit: 500 }),
  ]);

  const topIdentities = [...allIdentities]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 10);

  const incidentCandidates = topIdentities.slice(0, INCIDENT_SAMPLE_SIZE);
  const incidents: IncidentEntry[] = await Promise.all(
    incidentCandidates.map(async (i) => {
      const [identity, blastRadius, remediation] = await Promise.all([
        api.getIdentity(i.identity_id),
        api.getBlastRadius(i.identity_id).catch(() => null),
        api.getRemediation(i.identity_id).catch(() => null),
      ]);
      return { identity, blastRadius, remediation };
    })
  );

  const riskByBand: Record<string, number> = {};
  for (const d of distribution) riskByBand[d.band] = d.count;

  const mostDangerousDepartment =
    [...deptRisk].sort((a, b) => b.avg_risk_score - a.avg_risk_score)[0] ?? null;

  return {
    generatedAt: new Date().toISOString(),
    totalIdentities: summary.total_users,
    highRiskCount: summary.high_risk_users,
    orphanCount: summary.orphan_accounts,
    dormantAdminCount: summary.dormant_admins,
    crossPlatformAdminCount: summary.cross_platform_admins,
    avgRiskScore: summary.avg_risk_score,
    mostDangerousDepartment,
    riskByBand,
    topIdentities,
    incidents,
  };
}

const COMPLIANCE_MAP = [
  { control: "NIST SP 800-53 AC-2", concern: "Account Management", relevantTo: "orphan accounts and offboarding gaps" },
  { control: "NIST SP 800-53 AC-6", concern: "Least Privilege", relevantTo: "cross-platform admins and privilege creep" },
  { control: "CIS Control 5", concern: "Account Management", relevantTo: "dormant admin accounts" },
  { control: "CIS Control 6", concern: "Access Control Management", relevantTo: "stale credentials and token rotation" },
  { control: "GDPR Article 32", concern: "Security of Processing", relevantTo: "identities with customer data exposure" },
];

export function getComplianceMap() {
  return COMPLIANCE_MAP;
}

export function rootCauseFor(identity: IdentityDetail): string {
  if (identity.is_orphan) return "Offboarding gap — account disabled in AD but never disabled on other platforms.";
  if (identity.is_dormant_admin) return "Standing administrative privilege with no corresponding usage or periodic access review.";
  if (identity.is_cross_platform_admin) return "Administrative roles granted independently across multiple platforms without centralized review.";
  if (identity.has_old_token) return "Credential issued without an enforced rotation policy.";
  return "Elevated risk score from combined minor factors; no single dominant cause.";
}
