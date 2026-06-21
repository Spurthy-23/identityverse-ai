import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Target, Network, Server, Skull, Building2, UserX, Clock, AlertTriangle, RotateCw,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { loadCommandCenterData, type HeatmapCell, type FeedItem, type TrendPoint } from "@/lib/commandCenterMetrics";
import { Card, CardHeader } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Misc";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Button } from "@/components/ui/Button";
import { PostureGauge } from "@/components/PostureGauge";

const BAND_COLORS: Record<string, string> = {
  LOW: "#34D399",
  MEDIUM: "#FBBF24",
  HIGH: "#FB8B3C",
  CRITICAL: "#FB4768",
};

export default function CommandCenter() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadCommandCenterData>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    loadCommandCenterData()
      .then(setData)
      .catch((err) => {
        const reachable = err?.code !== "ERR_NETWORK";
        setError(
          reachable
            ? "The backend responded but something failed loading this data. Check that uvicorn is still running without errors in its terminal."
            : "Can't reach the backend at all. Make sure uvicorn is running on port 8000, and that VITE_API_URL matches it."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <Loading label="Establishing command center uplink" />;

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
        <AlertTriangle size={32} className="text-[var(--color-risk-high)] mb-4" />
        <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          Couldn't load Command Center
        </h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">{error}</p>
        <Button variant="secondary" onClick={load}>
          <RotateCw size={14} /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, heatmap, feed, trend, securityStory } = data;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-2 w-2">
            <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-[var(--color-risk-low)]" />
          </span>
          <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
            Live · {metrics.totalIdentities} identities under watch
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
          Command Center
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 max-w-2xl">
          Predictive identity attack intelligence — how attackers could exploit, escalate, and
          move laterally through this environment before it happens.
        </p>
      </div>

      {securityStory && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl p-5 flex items-start gap-3"
          style={{
            background: "linear-gradient(90deg, rgba(251,71,104,0.08), rgba(155,123,255,0.05))",
            border: "1px solid rgba(251,71,104,0.25)",
          }}
        >
          <Skull size={18} className="text-[var(--color-risk-critical)] shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] uppercase tracking-wide text-[var(--color-risk-critical)] font-mono font-semibold">
              Today's Security Story
            </span>
            <p className="text-sm text-[var(--color-text-primary)] mt-1 leading-relaxed">{securityStory}</p>
          </div>
        </motion.div>
      )}

      {/* Top metric row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <Card glow="identity" className="lg:col-span-1 flex items-center justify-center">
          <PostureGauge score={metrics.securityHealthScore} label="Security Health" />
        </Card>
        <MetricCard
          label="Compromise Probability"
          value={`${metrics.compromiseProbability}%`}
          icon={<Target size={18} />}
          accent={metrics.compromiseProbability > 30 ? "critical" : "identity"}
        />
        <MetricCard
          label="Critical Risks"
          value={metrics.criticalRisks}
          icon={<Skull size={18} />}
          accent="critical"
        />
        <MetricCard
          label="Attack Surface"
          value={metrics.attackSurfaceSize}
          icon={<Server size={18} />}
          accent="ai"
        />
        <MetricCard
          label="Systems Exposed"
          value={metrics.systemsExposed}
          icon={<Network size={18} />}
          accent="ai"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link to={metrics.mostDangerousIdentity ? `/identities/${metrics.mostDangerousIdentity.identity_id}` : "/identities"}>
          <Card className="hover:border-[var(--color-risk-critical)] transition-colors h-full" glow="none">
            <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Skull size={13} /> Most Dangerous Identity
            </span>
            <div className="font-display text-lg font-bold text-[var(--color-text-primary)] mt-2 truncate">
              {metrics.mostDangerousIdentity?.full_name ?? "—"}
            </div>
            {metrics.mostDangerousIdentity && (
              <div className="mt-1.5">
                <RiskBadge band={metrics.mostDangerousIdentity.risk_band} />
              </div>
            )}
          </Card>
        </Link>

        <Card>
          <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] flex items-center gap-1.5">
            <Building2 size={13} /> Most Dangerous Department
          </span>
          <div className="font-display text-lg font-bold text-[var(--color-text-primary)] mt-2">
            {metrics.mostDangerousDepartment?.department ?? "—"}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">
            avg score {metrics.mostDangerousDepartment?.avg_risk_score.toFixed(0) ?? "—"}
          </div>
        </Card>

        <Link to="/orphans">
          <Card className="hover:border-[var(--color-risk-high)] transition-colors h-full">
            <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] flex items-center gap-1.5">
              <UserX size={13} /> Orphan Accounts
            </span>
            <div className="font-mono-tabular text-2xl font-bold text-[var(--color-text-primary)] mt-2">
              {metrics.orphanAccounts}
            </div>
          </Card>
        </Link>

        <Link to="/dormant-admins">
          <Card className="hover:border-[var(--color-risk-medium)] transition-colors h-full">
            <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Clock size={13} /> Dormant Admins
            </span>
            <div className="font-mono-tabular text-2xl font-bold text-[var(--color-text-primary)] mt-2">
              {metrics.dormantAdmins}
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Card glow="identity">
          <CardHeader title="Risk Heatmap" subtitle="Identity concentration by department × risk band" />
          <RiskHeatmap cells={heatmap} />
        </Card>

        <Card glow="ai">
          <CardHeader
            title="Privilege Activity Trend"
            subtitle="Role changes & permission grants, top 40 highest-risk identities, last 12 months"
          />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C2536" />
              <XAxis
                dataKey="month"
                tick={{ fill: "#6B7790", fontSize: 10 }}
                tickFormatter={(m: string) => m.slice(5)}
              />
              <YAxis tick={{ fill: "#6B7790", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#131A28", border: "1px solid #232E45", borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="roleChanges" stroke="#9B7BFF" strokeWidth={2} dot={false} name="Role Changes" />
              <Line type="monotone" dataKey="permissionGrants" stroke="#2DE2C8" strokeWidth={2} dot={false} name="Permission Grants" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center text-xs text-[var(--color-text-secondary)] mt-1">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-ai)]" /> Role Changes</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-identity)]" /> Permission Grants</span>
          </div>
        </Card>
      </div>

      <Card glow="ai" className="overflow-hidden">
        <CardHeader
          title="Live Risk Feed"
          subtitle="Highest-risk identities in this environment, cycling — not a push feed, refreshes on reload"
          action={
            <span className="flex items-center gap-1.5 text-xs font-mono text-[var(--color-risk-low)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-[var(--color-risk-low)]" />
              </span>
              streaming
            </span>
          }
        />
        <div className="h-64 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[var(--color-surface-solid)] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--color-surface-solid)] to-transparent z-10 pointer-events-none" />
          <div className="ticker-track space-y-2">
            {[...feed, ...feed].map((item: FeedItem, i: number) => (
              <div
                key={`${item.id}-${i}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--color-elevated)]/40 text-sm"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: BAND_COLORS[item.band] }}
                />
                <span className="font-mono text-[10px] text-[var(--color-text-muted)] shrink-0">
                  [{item.band}]
                </span>
                <span className="text-[var(--color-text-secondary)] truncate">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({
  label, value, icon, accent,
}: { label: string; value: number | string; icon: React.ReactNode; accent: "identity" | "ai" | "critical" }) {
  const color = { identity: "var(--color-identity)", ai: "var(--color-ai)", critical: "var(--color-risk-critical)" }[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel-deep rounded-xl p-5 relative overflow-hidden"
    >
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: color }} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">{label}</span>
        <span style={{ color }} className="opacity-80">{icon}</span>
      </div>
      <div className="font-mono-tabular text-3xl font-semibold text-[var(--color-text-primary)]">{value}</div>
    </motion.div>
  );
}

function RiskHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const departments = [...new Set(cells.map((c) => c.department))];
  const bands: HeatmapCell["band"][] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const maxCount = Math.max(...cells.map((c) => c.count), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left pb-2 text-[var(--color-text-muted)] uppercase tracking-wide font-medium">Dept</th>
            {bands.map((b) => (
              <th key={b} className="pb-2 text-[var(--color-text-muted)] uppercase tracking-wide font-medium">{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept}>
              <td className="py-1.5 pr-3 text-[var(--color-text-secondary)] font-medium whitespace-nowrap">{dept}</td>
              {bands.map((band) => {
                const cell = cells.find((c) => c.department === dept && c.band === band);
                const count = cell?.count ?? 0;
                const intensity = count / maxCount;
                return (
                  <td key={band} className="px-1 py-1.5">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="rounded-md flex items-center justify-center font-mono-tabular font-semibold"
                      style={{
                        height: 34,
                        background: `${BAND_COLORS[band]}${Math.round(15 + intensity * 35).toString(16)}`,
                        color: intensity > 0.3 ? BAND_COLORS[band] : "var(--color-text-muted)",
                        border: `1px solid ${BAND_COLORS[band]}30`,
                      }}
                    >
                      {count}
                    </motion.div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
