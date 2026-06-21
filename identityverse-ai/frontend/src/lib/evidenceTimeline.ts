import type { IdentityDetail, TimelineEvent } from "@/types";

/**
 * Evidence Timeline -- answers "why does this risk score exist?" with
 * specific, attributable evidence instead of just a number.
 *
 * Every risk-contribution value below is copied directly from
 * backend/app/services/risk_scoring.py's point constants (30/25/20/40) --
 * this is NOT a separate scoring system, just the existing rule engine's
 * output re-attached to the specific evidence that triggered it.
 *
 * Two evidence sources, both honestly labeled:
 * - "audit_log": real events from the /timeline/{id} endpoint
 * - "current_state": derived from the identity's current snapshot (e.g.
 *   dormancy and orphan status aren't discrete events in the dataset --
 *   they're conditions observed at scoring time, so they're presented as
 *   "current state" evidence rather than disguised as audit events)
 */

export interface EvidenceEntry {
  eventId: string;
  timestamp: string;
  platform: string;
  action: string;
  description: string;
  riskContribution: number;
  source: "audit_log" | "current_state";
}

function hashToId(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return String(1000 + (h % 9000));
}

function platformPrefix(platform: string): string {
  return { AD: "AD", AWS: "AWS", Okta: "OKTA", Salesforce: "SFDC" }[platform] ?? platform.toUpperCase();
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function computeEvidenceTimeline(
  identity: IdentityDetail,
  timeline: TimelineEvent[]
): EvidenceEntry[] {
  const entries: EvidenceEntry[] = [];
  const adminPlatforms = identity.platform_accounts.filter((a) => a.is_admin).map((a) => a.platform);
  let crossPlatformCredited = false;

  const sortedEvents = [...timeline].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const e of sortedEvents) {
    let contribution = 0;
    let description = `${e.action === "ROLE_CHANGE" ? "Role changed" : "Permission granted"} on ${e.platform}`;

    // Attribute the +30 cross-platform-admin contribution to the first
    // qualifying role-change event, mirroring risk_scoring.py's
    // "count once" behavior for this rule.
    if (
      identity.is_cross_platform_admin &&
      !crossPlatformCredited &&
      adminPlatforms.includes(e.platform) &&
      e.action === "ROLE_CHANGE"
    ) {
      contribution = 30;
      description = `Role elevated to admin level on ${e.platform} — pushed this identity into cross-platform admin status`;
      crossPlatformCredited = true;
    }

    entries.push({
      eventId: `${platformPrefix(e.platform)}-${hashToId(e.timestamp + e.platform + e.action)}`,
      timestamp: e.timestamp,
      platform: e.platform,
      action: e.action,
      description,
      riskContribution: contribution,
      source: "audit_log",
    });
  }

  if (identity.is_dormant_admin) {
    const acct = identity.platform_accounts.find((a) => a.is_admin && daysSince(a.last_login) > 90);
    if (acct) {
      entries.push({
        eventId: `${platformPrefix(acct.platform)}-${hashToId("dormant" + acct.platform + identity.identity_id)}`,
        timestamp: acct.last_login,
        platform: acct.platform,
        action: "DORMANCY_DETECTED",
        description: `No login on ${acct.platform} since this date (${daysSince(acct.last_login)} days) while retaining admin privileges`,
        riskContribution: 25,
        source: "current_state",
      });
    }
  }

  if (identity.is_orphan) {
    const adAcct = identity.platform_accounts.find((a) => a.platform === "AD");
    const activeElsewhere = identity.platform_accounts.filter((a) => a.platform !== "AD" && a.status === "Active");
    entries.push({
      eventId: `AD-${hashToId("orphan" + identity.identity_id)}`,
      timestamp: adAcct?.last_login ?? new Date().toISOString(),
      platform: "AD",
      action: "OFFBOARDING_GAP",
      description: `Disabled in AD but still Active on ${activeElsewhere.map((a) => a.platform).join(", ") || "another platform"}`,
      riskContribution: 40,
      source: "current_state",
    });
  }

  if (identity.has_old_token) {
    const acct = identity.platform_accounts.find((a) => a.token_age_days > 365);
    if (acct) {
      entries.push({
        eventId: `${platformPrefix(acct.platform)}-${hashToId("token" + acct.platform + identity.identity_id)}`,
        timestamp: acct.last_login,
        platform: acct.platform,
        action: "STALE_CREDENTIAL",
        description: `Credential on ${acct.platform} is ${acct.token_age_days} days old and has never been rotated`,
        riskContribution: 20,
        source: "current_state",
      });
    }
  }

  return entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
