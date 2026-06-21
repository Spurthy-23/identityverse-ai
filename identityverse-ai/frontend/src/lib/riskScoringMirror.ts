import type { PlatformAccount, RiskBand } from "@/types";

/**
 * Client-side mirror of backend/app/services/risk_scoring.py.
 *
 * Why a mirror instead of calling the backend on every toggle: the
 * Revocation Simulator needs instant feedback as the user clicks through
 * "what if I remove this" options, and the backend doesn't have a
 * what-if/dry-run endpoint (we're not adding one, per "don't change
 * existing APIs"). The real identity data and the real persisted score
 * always come from the backend; this mirror only powers the *preview*.
 * Point values and thresholds below are kept identical to the Python
 * source on purpose -- if those ever change, update both places.
 */

const CROSS_PLATFORM_ADMIN_POINTS = 30;
const DORMANT_ADMIN_POINTS = 25;
const OLD_TOKEN_POINTS = 20;
const ORPHAN_ACCOUNT_POINTS = 40;

const DORMANT_DAYS_THRESHOLD = 90;
const OLD_TOKEN_DAYS_THRESHOLD = 365;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export interface SimulatedRisk {
  riskScore: number;
  riskBand: RiskBand;
  factors: string[];
  isCrossPlatformAdmin: boolean;
  isDormantAdmin: boolean;
  isOrphan: boolean;
  hasOldToken: boolean;
}

export function scoreAccounts(accounts: PlatformAccount[]): SimulatedRisk {
  let score = 0;
  const factors: string[] = [];

  const adminPlatforms = [...new Set(accounts.filter((a) => a.is_admin).map((a) => a.platform))];
  const isCrossPlatformAdmin = adminPlatforms.length >= 2;
  if (isCrossPlatformAdmin) {
    score += CROSS_PLATFORM_ADMIN_POINTS;
    factors.push(`Admin on ${adminPlatforms.length} platforms (${adminPlatforms.join(", ")})`);
  }

  let isDormantAdmin = false;
  for (const a of accounts) {
    if (a.is_admin && daysSince(a.last_login) > DORMANT_DAYS_THRESHOLD) {
      isDormantAdmin = true;
      score += DORMANT_ADMIN_POINTS;
      factors.push(`Dormant admin on ${a.platform} (${daysSince(a.last_login)} days inactive)`);
      break;
    }
  }

  let hasOldToken = false;
  for (const a of accounts) {
    if (a.token_age_days > OLD_TOKEN_DAYS_THRESHOLD) {
      hasOldToken = true;
      score += OLD_TOKEN_POINTS;
      factors.push(`Stale credential on ${a.platform} (${a.token_age_days} days old)`);
      break;
    }
  }

  const statusByPlatform: Record<string, string> = {};
  for (const a of accounts) statusByPlatform[a.platform] = a.status;
  const isOrphan =
    statusByPlatform["AD"] === "Disabled" &&
    Object.entries(statusByPlatform).some(([p, s]) => p !== "AD" && s === "Active");
  if (isOrphan) {
    score += ORPHAN_ACCOUNT_POINTS;
    const activeElsewhere = Object.entries(statusByPlatform)
      .filter(([p, s]) => p !== "AD" && s === "Active")
      .map(([p]) => p);
    factors.push(`Orphan account: disabled in AD but active in ${activeElsewhere.join(", ")}`);
  }

  score = Math.min(score, 100);
  const band: RiskBand = score >= 70 ? "CRITICAL" : score >= 45 ? "HIGH" : score >= 20 ? "MEDIUM" : "LOW";

  if (factors.length === 0) factors.push("No elevated risk factors detected");

  return {
    riskScore: score,
    riskBand: band,
    factors,
    isCrossPlatformAdmin,
    isDormantAdmin,
    isOrphan,
    hasOldToken,
  };
}
