import { api } from "@/lib/api";
import type { IdentityListItem, TimelineResponse } from "@/types";

/**
 * Every metric here is derived from data the existing backend already
 * returns -- nothing here calls a new endpoint. Where the source brief
 * asks for something the backend doesn't expose directly (org-wide audit
 * trend, attack surface size), it's computed client-side from the list/
 * timeline endpoints that do exist. Comments below mark exactly which
 * existing endpoint each number comes from.
 */

export interface CommandCenterMetrics {
  securityHealthScore: number;     // derived from /dashboard/summary avg_risk_score
  compromiseProbability: number;   // high_risk_users / total_users, from /dashboard/summary
  attackSurfaceSize: number;       // sum of platform accounts, from /identities
  systemsExposed: number;          // distinct platforms touched by HIGH/CRITICAL identities
  mostDangerousIdentity: IdentityListItem | null;
  mostDangerousDepartment: { department: string; avg_risk_score: number } | null;
  criticalRisks: number;
  orphanAccounts: number;
  dormantAdmins: number;
  totalIdentities: number;
}

export interface HeatmapCell {
  department: string;
  band: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  count: number;
}

export interface TrendPoint {
  month: string; // "2026-01"
  roleChanges: number;
  permissionGrants: number;
}

export interface FeedItem {
  id: string;
  text: string;
  band: string;
}

export async function loadCommandCenterData() {
  // Each call gets its own timeout (set on the shared axios client) so a
  // single slow request can't hang the whole page indefinitely -- it'll
  // reject within 15s and the caller (CommandCenter.tsx) shows a real
  // error instead of an endless spinner.
  const [summary, distribution, deptRisk, allIdentities] = await Promise.all([
    api.dashboardSummary(),
    api.riskDistribution(),
    api.departmentRisk(),
    api.listIdentities({ limit: 500 }),
  ]);

  const metrics = computeMetrics(summary, deptRisk, allIdentities);
  const heatmap = computeHeatmap(allIdentities);
  const feed = computeFeed(allIdentities);
  const securityStory = await buildSecurityStory(metrics.mostDangerousIdentity);

  // Trend: fetch /timeline for the top 15 riskiest identities in parallel
  // and bucket their role-change/permission-grant events by month. This is
  // real audit-log-derived activity, not a fabricated series -- just
  // assembled client-side since there's no org-wide audit endpoint.
  const topForTrend = [...allIdentities]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 15);
  const timelineResults = await Promise.allSettled(
    topForTrend.map((i) => api.getTimeline(i.identity_id))
  );
  const timelines = timelineResults
    .filter((r): r is PromiseFulfilledResult<TimelineResponse> => r.status === "fulfilled")
    .map((r) => r.value);
  const trend = computeTrend(timelines);

  return { summary, distribution, deptRisk, allIdentities, metrics, heatmap, feed, trend, securityStory };
}

/**
 * "Today's Security Story" -- a one-sentence narrative built from the
 * single riskiest identity's real blast radius data. Not AI-generated text
 * (no Groq call here, so it's instant and never fails) -- it's a template
 * filled in with real numbers from GET /blast-radius/{id}. The graph is a
 * fixed-depth User->Role->Permission->Resource model, so "hops" is reported
 * honestly as platform/resource counts rather than an invented path length.
 */
async function buildSecurityStory(topIdentity: IdentityListItem | null): Promise<string | null> {
  if (!topIdentity) return null;
  try {
    const blast = await api.getBlastRadius(topIdentity.identity_id);
    const reasonClause = topIdentity.is_orphan
      ? "orphaned account"
      : topIdentity.is_dormant_admin
      ? "dormant admin account"
      : "elevated-privilege account";

    if (blast.systems_impacted === 0) {
      return `${topIdentity.full_name}'s ${reasonClause} is currently risk-flagged but has no reachable downstream systems on record.`;
    }

    const dataClause = blast.customer_data_exposed ? ", including customer data" : "";
    return `${topIdentity.full_name}'s ${reasonClause} can reach ${blast.critical_resources} critical resource${blast.critical_resources === 1 ? "" : "s"} across ${blast.systems_impacted} platform${blast.systems_impacted === 1 ? "" : "s"}${dataClause} if compromised.`;
  } catch {
    return null;
  }
}

function computeMetrics(
  summary: { total_users: number; high_risk_users: number; avg_risk_score: number; orphan_accounts: number; dormant_admins: number },
  deptRisk: { department: string; avg_risk_score: number }[],
  allIdentities: IdentityListItem[]
): CommandCenterMetrics {
  const attackSurfaceSize = allIdentities.reduce((sum, i) => sum + i.platforms.length, 0);

  const exposedPlatforms = new Set<string>();
  for (const i of allIdentities) {
    if (i.risk_band === "HIGH" || i.risk_band === "CRITICAL") {
      i.platforms.forEach((p) => exposedPlatforms.add(p));
    }
  }

  const mostDangerousIdentity =
    [...allIdentities].sort((a, b) => b.risk_score - a.risk_score)[0] ?? null;
  const mostDangerousDepartment =
    [...deptRisk].sort((a, b) => b.avg_risk_score - a.avg_risk_score)[0] ?? null;
  const criticalRisks = allIdentities.filter((i) => i.risk_band === "CRITICAL").length;

  return {
    securityHealthScore: Math.max(0, Math.round(100 - summary.avg_risk_score)),
    compromiseProbability: summary.total_users
      ? Math.round((summary.high_risk_users / summary.total_users) * 100)
      : 0,
    attackSurfaceSize,
    systemsExposed: exposedPlatforms.size,
    mostDangerousIdentity,
    mostDangerousDepartment,
    criticalRisks,
    orphanAccounts: summary.orphan_accounts,
    dormantAdmins: summary.dormant_admins,
    totalIdentities: summary.total_users,
  };
}

function computeHeatmap(allIdentities: IdentityListItem[]): HeatmapCell[] {
  const cells = new Map<string, number>();
  for (const i of allIdentities) {
    const key = `${i.department}::${i.risk_band}`;
    cells.set(key, (cells.get(key) ?? 0) + 1);
  }
  const departments = [...new Set(allIdentities.map((i) => i.department))].sort();
  const bands: HeatmapCell["band"][] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const result: HeatmapCell[] = [];
  for (const department of departments) {
    for (const band of bands) {
      result.push({ department, band, count: cells.get(`${department}::${band}`) ?? 0 });
    }
  }
  return result;
}

function computeTrend(timelines: TimelineResponse[]): TrendPoint[] {
  const buckets = new Map<string, { roleChanges: number; permissionGrants: number }>();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { roleChanges: 0, permissionGrants: 0 });
  }

  for (const t of timelines) {
    for (const e of t.events) {
      const d = new Date(e.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (e.action === "ROLE_CHANGE") bucket.roleChanges += 1;
      else if (e.action === "PERMISSION_GRANT") bucket.permissionGrants += 1;
    }
  }

  return [...buckets.entries()].map(([month, v]) => ({ month, ...v }));
}

function computeFeed(allIdentities: IdentityListItem[]): FeedItem[] {
  const top = [...allIdentities].sort((a, b) => b.risk_score - a.risk_score).slice(0, 20);
  return top.map((i) => {
    let reason = "elevated risk score";
    if (i.is_orphan) reason = "orphaned account detected (disabled in AD, active elsewhere)";
    else if (i.is_dormant_admin) reason = "dormant admin privileges, no recent login";
    else if (i.platforms.length >= 3) reason = "cross-platform privilege spread";

    return {
      id: i.identity_id,
      text: `${i.full_name} (${i.department}) — ${reason}`,
      band: i.risk_band,
    };
  });
}
