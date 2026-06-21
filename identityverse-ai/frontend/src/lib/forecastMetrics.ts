import { api } from "@/lib/api";
import type { TimelineResponse } from "@/types";

/**
 * Heuristic risk projection -- explicitly NOT a trained time-series model.
 * There's no historical risk-snapshot store in the backend, so "30/90-day
 * prediction" is built from a defensible proxy: how fast privilege-change
 * activity (role changes + permission grants) is accelerating or
 * decelerating across the riskiest identities, applied as a velocity
 * adjustment to the current average risk score. This is disclosed in the
 * UI, not just in code comments -- overclaiming a "forecast" here would be
 * presenting a guess as a measurement.
 */

export interface ForecastResult {
  current: number;
  projected30: number;
  projected90: number;
  direction: "up" | "down" | "flat";
  monthlyActivity: { month: string; index: number }[]; // last 6 months, 0-100 normalized
  velocityDelta: number;
}

export async function loadForecastData(): Promise<ForecastResult> {
  const [summary, allIdentities] = await Promise.all([
    api.dashboardSummary(),
    api.listIdentities({ limit: 500 }),
  ]);

  const top30 = [...allIdentities].sort((a, b) => b.risk_score - a.risk_score).slice(0, 30);
  const timelines = await Promise.all(
    top30.map((i) => api.getTimeline(i.identity_id).catch(() => null))
  );
  const valid = timelines.filter((t): t is TimelineResponse => !!t);

  const monthCounts = bucketByMonth(valid, 6);
  const counts = monthCounts.map((m) => m.count);
  const maxCount = Math.max(...counts, 1);
  const monthlyActivity = monthCounts.map((m) => ({
    month: m.month,
    index: Math.round((m.count / maxCount) * 100),
  }));

  const recent = counts.slice(-3).reduce((a, b) => a + b, 0);
  const prior = counts.slice(0, 3).reduce((a, b) => a + b, 0);
  const velocityRatio = recent / Math.max(prior, 1);
  const velocityDelta = clamp((velocityRatio - 1) * 10, -15, 15);

  const current = summary.avg_risk_score;
  const projected30 = clampScore(current + velocityDelta * 0.5);
  const projected90 = clampScore(current + velocityDelta * 1.5);

  return {
    current,
    projected30,
    projected90,
    direction: velocityDelta > 2 ? "up" : velocityDelta < -2 ? "down" : "flat",
    monthlyActivity,
    velocityDelta: Math.round(velocityDelta * 10) / 10,
  };
}

function bucketByMonth(timelines: TimelineResponse[], months: number) {
  const now = new Date();
  const buckets: { month: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, count: 0 });
  }
  const index = new Map(buckets.map((b) => [b.month, b]));
  for (const t of timelines) {
    for (const e of t.events) {
      const d = new Date(e.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = index.get(key);
      if (bucket) bucket.count += 1;
    }
  }
  return buckets;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function clampScore(n: number) {
  return Math.round(clamp(n, 0, 100) * 10) / 10;
}
