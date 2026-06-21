import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCw } from "lucide-react";
import { loadThreatRadarData, type ThreatCategory } from "@/lib/threatRadarMetrics";
import { PageHeader } from "@/components/Shared";
import { SonarRadar } from "@/components/SonarRadar";
import { Loading } from "@/components/ui/Misc";
import { Button } from "@/components/ui/Button";

const SCOPE_GREEN = "#4AFF9C";

function severityLabel(value: number): string {
  if (value >= 60) return "CRITICAL";
  if (value >= 35) return "ELEVATED";
  if (value >= 15) return "GUARDED";
  return "LOW";
}

export default function ThreatRadarPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadThreatRadarData>> | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    loadThreatRadarData()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Threat Radar"
        subtitle="Six-category risk posture, scanned continuously across the identity estate."
      />

      {loading && !data ? (
        <Loading label="Sweeping for threats" />
      ) : error && !data ? (
        <div className="flex flex-col items-center text-center py-16">
          <AlertTriangle size={28} className="text-[var(--color-risk-high)] mb-3" />
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Couldn't reach the backend. Confirm uvicorn is still running on port 8000.
          </p>
          <Button variant="secondary" onClick={load}><RotateCw size={14} /> Retry</Button>
        </div>
      ) : data ? (
        <div
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at center, #0A1A12 0%, #050B08 100%)",
            border: `1px solid ${SCOPE_GREEN}25`,
          }}
        >
          <div className="absolute top-6 left-6 font-mono text-[10px] tracking-[0.2em]" style={{ color: SCOPE_GREEN }}>
            SCOPE ACTIVE
          </div>
          <div className="absolute top-6 right-6 font-mono text-[10px] tracking-[0.2em] text-right" style={{ color: SCOPE_GREEN }}>
            {data.categories.length} VECTORS TRACKED
          </div>

          <div className="flex flex-col items-center">
            <SonarRadar categories={data.categories} />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center mt-4"
            >
              <div className="font-mono text-[10px] tracking-[0.2em]" style={{ color: "#7FBF9C" }}>
                COMPOSITE THREAT INDEX
              </div>
              <div
                className="font-mono text-4xl font-bold mt-1"
                style={{ color: SCOPE_GREEN, textShadow: `0 0 20px ${SCOPE_GREEN}60` }}
              >
                {data.compositeIndex}
              </div>
              <div className="font-mono text-xs tracking-wide mt-1" style={{ color: "#7FBF9C" }}>
                {severityLabel(data.compositeIndex)}
              </div>
            </motion.div>
          </div>
        </div>
      ) : null}

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          {data.categories.map((c: ThreatCategory, i: number) => (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg p-4 border"
              style={{ background: "#0A1A1280", borderColor: `${SCOPE_GREEN}20` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wide" style={{ color: "#7FBF9C" }}>
                  {c.label}
                </span>
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{ color: SCOPE_GREEN, background: `${SCOPE_GREEN}15` }}
                >
                  {severityLabel(c.value)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: SCOPE_GREEN, boxShadow: `0 0 8px ${SCOPE_GREEN}` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${c.value}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
