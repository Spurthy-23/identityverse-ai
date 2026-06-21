import { api } from "@/lib/api";
import type { IdentityListItem, IdentityDetail } from "@/types";

/**
 * Matches 4 well-known identity-security incident patterns to REAL
 * identities in your actual dataset (not scripted/fictional examples).
 * Matching is based on the same boolean flags the risk scoring engine
 * already computes -- is_orphan, is_dormant_admin, is_cross_platform_admin,
 * has_old_token -- so every case links through to a real, clickable
 * identity profile.
 */

export interface RealIncident {
  caseLabel: string;
  title: string;
  narrative: string;
  identity: IdentityListItem | null;
}

export async function loadRealIncidents(): Promise<RealIncident[]> {
  const allIdentities = await api.listIdentities({ limit: 500 });

  // Cases 1 & 4 can be matched directly from list-level flags.
  const orphanMatch = allIdentities.find((i) => i.is_orphan) ?? null;
  const dormantMatch = allIdentities.find((i) => i.is_dormant_admin) ?? null;

  // Cases 2 & 3 need is_cross_platform_admin / has_old_token, which only
  // exist on the detail endpoint -- sample the top 30 by risk score rather
  // than fetching all 500 individually.
  const sample = [...allIdentities].sort((a, b) => b.risk_score - a.risk_score).slice(0, 30);
  const details = await Promise.all(
    sample.map((i) => api.getIdentity(i.identity_id).catch(() => null))
  );
  const validDetails = details.filter((d): d is IdentityDetail => !!d);

  const escalationDetail =
    validDetails.find((d) => d.is_cross_platform_admin && d.manager === null) ??
    validDetails.find((d) => d.is_cross_platform_admin) ??
    null;
  const tokenDetail = validDetails.find((d) => d.has_old_token) ?? null;

  const toListItem = (d: IdentityDetail | null): IdentityListItem | null =>
    d
      ? {
          identity_id: d.identity_id,
          full_name: d.full_name,
          department: d.department,
          platforms: [...new Set(d.platform_accounts.map((a) => a.platform))],
          risk_score: d.final_risk_score,
          risk_band: d.risk_band,
          is_orphan: d.is_orphan,
          is_dormant_admin: d.is_dormant_admin,
        }
      : null;

  return [
    {
      caseLabel: "CASE 1",
      title: "Identity Lifecycle Drift",
      narrative: orphanMatch
        ? `${orphanMatch.full_name} (${orphanMatch.department}) was disabled in AD, but remains active on at least one other platform — the classic offboarding-failure pattern: a contractor or employee leaves, AD gets disabled, but nobody propagates that to AWS, Okta, or Salesforce.`
        : "No identity in the current dataset matches this pattern.",
      identity: orphanMatch,
    },
    {
      caseLabel: "CASE 2",
      title: "Privilege Escalation Across Platforms",
      narrative: escalationDetail
        ? `${escalationDetail.full_name}${escalationDetail.manager === null ? " (service account, no owner on record)" : ` (${escalationDetail.department})`} holds administrative roles on ${[...new Set(escalationDetail.platform_accounts.filter((a) => a.is_admin).map((a) => a.platform))].join(" + ")} simultaneously — privilege accumulated independently per platform rather than through a single reviewed grant.`
        : "No identity in the current dataset matches this pattern.",
      identity: toListItem(escalationDetail),
    },
    {
      caseLabel: "CASE 3",
      title: "Credential Exposure Risk",
      narrative: tokenDetail
        ? `${tokenDetail.full_name} (${tokenDetail.department}) has a credential ${Math.max(...tokenDetail.platform_accounts.map((a) => a.token_age_days))} days old with no rotation on record — the exact window in which a vendor breach or leak turns into standing unauthorized access.`
        : "No identity in the current dataset matches this pattern.",
      identity: toListItem(tokenDetail),
    },
    {
      caseLabel: "CASE 4",
      title: "Exception Expiry Violation",
      narrative: dormantMatch
        ? `${dormantMatch.full_name} (${dormantMatch.department}) retains administrative access with no login in over 90 days — privilege that was very likely granted for a specific, now-expired reason and simply never revoked.`
        : "No identity in the current dataset matches this pattern.",
      identity: dormantMatch,
    },
  ];
}
