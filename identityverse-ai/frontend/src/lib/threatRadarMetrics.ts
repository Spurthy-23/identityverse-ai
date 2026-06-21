import { api } from "@/lib/api";
import type { IdentityListItem } from "@/types";

/**
 * Six-category threat posture, all derived from existing endpoints --
 * no new backend routes. Two categories (Credential Exposure, Insider
 * Threat) need fields only present on the identity *detail* endpoint
 * (token age, per-platform admin status), which isn't returned by the
 * list endpoint. Rather than fetch all 500 identity details, we sample
 * the top 70 by risk score -- the categories are inherently about
 * "how risky is the risky end of the org", so sampling the risky tail
 * is honest, not a shortcut that misrepresents the data.
 */

export interface ThreatCategory {
  key: string;
  label: string;
  value: number; // 0-100
}

const SAMPLE_SIZE = 70;

export async function loadThreatRadarData(): Promise<{
  categories: ThreatCategory[];
  compositeIndex: number;
}> {
  const [summary, allIdentities] = await Promise.all([
    api.dashboardSummary(),
    api.listIdentities({ limit: 500 }),
  ]);

  const sample = [...allIdentities]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, SAMPLE_SIZE);

  const details = await Promise.all(
    sample.map((i) => api.getIdentity(i.identity_id).catch(() => null))
  );
  const validDetails = details.filter((d): d is NonNullable<typeof d> => !!d);

  const credentialExposure = validDetails.length
    ? (validDetails.filter((d) => d.has_old_token).length / validDetails.length) * 100
    : 0;

  const insiderThreat = validDetails.length
    ? (validDetails.filter(
        (d) =>
          d.platform_accounts.some((a) => a.is_admin) &&
          !d.is_dormant_admin &&
          !d.is_orphan
      ).length /
        validDetails.length) *
      100
    : 0;

  const lateralMovement = allIdentities.length
    ? (allIdentities.filter((i: IdentityListItem) => i.platforms.length >= 3).length /
        allIdentities.length) *
      100
    : 0;

  const categories: ThreatCategory[] = [
    {
      key: "dormancy",
      label: "Dormant Admin Risk",
      value: clamp((summary.dormant_admins / summary.total_users) * 100),
    },
    {
      key: "orphan",
      label: "Orphan Account Risk",
      value: clamp((summary.orphan_accounts / summary.total_users) * 100),
    },
    {
      key: "escalation",
      label: "Privilege Escalation Risk",
      value: clamp((summary.cross_platform_admins / summary.total_users) * 100),
    },
    {
      key: "credential",
      label: "Credential Exposure",
      value: clamp(credentialExposure),
    },
    {
      key: "lateral",
      label: "Lateral Movement Risk",
      value: clamp(lateralMovement),
    },
    {
      key: "insider",
      label: "Insider Threat Risk",
      value: clamp(insiderThreat),
    },
  ];

  const compositeIndex = Math.round(
    categories.reduce((sum, c) => sum + c.value, 0) / categories.length
  );

  return { categories, compositeIndex };
}

function clamp(n: number): number {
  return Math.round(Math.max(0, Math.min(100, n)));
}
