import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCw } from "lucide-react";
import { loadForecastData, type ForecastResult } from "@/lib/forecastMetrics";
import { PageHeader } from "@/components/Shared";
import { Card, CardHeader } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";
import { SignalTrajectory } from "@/components/SignalTrajectory";

function DirectionGlyph({ direction, color }: { direction: ForecastResult["direction"]; color: string }) {
  const points = direction === "up" ? "2,16 9,4 16,16" : direction === "down" ? "2,4 9,16 16,4" : "2,10 16,10";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function ForecastEnginePage() {
  const [data, setData] = useState<ForecastResult | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    loadForecastData()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <Loading label="Projecting risk trajectory" />;

  if (error && !data) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <AlertTriangle size={28} className="text-[var(--color-risk-high)] mb-3" />
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Couldn't reach the backend. Confirm uvicorn is still running on port 8000.
        </p>
        <Button variant="secondary" onClick={load}><RotateCw size={14} /> Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  const dirColor = data.direction === "up" ? "var(--color-risk-critical)" : data.direction === "down" ? "var(--color-risk-low)" : "var(--color-risk-medium)";

  return (
    <div>
      <PageHeader
        title="Forecast Engine"
        subtitle="Projected 30/90-day risk trend based on current posture and privilege-change velocity."
      />

      <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-elevated)]/60 border border-[var(--color-border-soft)] w-fit">
        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
          ⚠ Heuristic projection from recent privilege-activity velocity — not a trained time-series model.
        </span>
      </div>

      <Card glow="ai" className="mb-6">
        <CardHeader title="Risk Trajectory" subtitle="Solid = real audit-derived activity. Dashed = projected, shaded region = uncertainty." />
        <SignalTrajectory data={data} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card>
          <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Current Risk</span>
          <div className="font-mono-tabular text-3xl font-bold text-[var(--color-text-primary)] mt-2">
            {data.current.toFixed(1)}
          </div>
        </Card>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card glow={data.direction === "up" ? "none" : "identity"} className={data.direction === "up" ? "ring-glow-critical" : ""}>
            <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">30-Day Projection</span>
            <div className="flex items-center gap-2 mt-2">
              <DirectionGlyph direction={data.direction} color={dirColor} />
              <span className="font-mono-tabular text-3xl font-bold" style={{ color: dirColor }}>
                {data.projected30.toFixed(1)}
              </span>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card glow={data.direction === "up" ? "none" : "identity"} className={data.direction === "up" ? "ring-glow-critical" : ""}>
            <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">90-Day Projection</span>
            <div className="flex items-center gap-2 mt-2">
              <DirectionGlyph direction={data.direction} color={dirColor} />
              <span className="font-mono-tabular text-3xl font-bold" style={{ color: dirColor }}>
                {data.projected90.toFixed(1)}
              </span>
            </div>
          </Card>
        </motion.div>
      </div>

      <Card className="mt-5">
        <CardHeader title="Trend Direction" />
        <div className="flex items-center gap-3">
          <DirectionGlyph direction={data.direction} color={dirColor} />
          <span className="font-display text-lg font-semibold" style={{ color: dirColor }}>
            {data.direction === "up" ? "Escalating" : data.direction === "down" ? "Improving" : "Stable"}
          </span>
          <span className="text-xs text-[var(--color-text-muted)] font-mono ml-2">
            privilege-activity velocity: {data.velocityDelta > 0 ? "+" : ""}{data.velocityDelta}
          </span>
        </div>
      </Card>
    </div>
  );
}
