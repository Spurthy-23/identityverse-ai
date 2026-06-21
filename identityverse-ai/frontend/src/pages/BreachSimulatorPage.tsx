import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Radio, FileWarning } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/Shared";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Loading } from "@/components/ui/Misc";
import { loadRealIncidents, type RealIncident } from "@/lib/realIncidents";
import type { IdentityListItem, IdentityDetail, BlastRadiusResponse } from "@/types";

interface Stage {
  id: string;
  time: string;
  title: string;
  detail: string;
}

const POINTS = { crossPlatform: 30, dormantAdmin: 25, oldToken: 20, orphan: 40 };

function buildStages(identity: IdentityDetail, blast: BlastRadiusResponse): Stage[] {
  const stages: Stage[] = [
    {
      id: "theft",
      time: "T+00:00",
      title: "CREDENTIAL THEFT",
      detail: identity.has_old_token
        ? `Stale credential exploited — token unrotated for ${Math.max(...identity.platform_accounts.map((a) => a.token_age_days))} days.`
        : `Credential phished or leaked for ${identity.full_name}'s primary account.`,
    },
    {
      id: "escalation",
      time: "T+00:02",
      title: "PRIVILEGE ESCALATION",
      detail: identity.is_cross_platform_admin
        ? `Existing admin rights on ${[...new Set(identity.platform_accounts.filter((a) => a.is_admin).map((a) => a.platform))].join(", ")} require no further escalation.`
        : `Standard access only — escalation path blocked at this stage.`,
    },
    {
      id: "lateral",
      time: "T+00:05",
      title: "LATERAL MOVEMENT",
      detail: `Reachable across ${blast.systems_impacted} platform${blast.systems_impacted !== 1 ? "s" : ""} via existing role/permission graph.`,
    },
    {
      id: "access",
      time: "T+00:08",
      title: "SENSITIVE RESOURCE ACCESS",
      detail: blast.reachable_resources.length
        ? `Reached: ${blast.reachable_resources.join(", ")}.`
        : `No sensitive resources reachable from this identity's current access.`,
    },
    {
      id: "impact",
      time: "T+00:12",
      title: blast.customer_data_exposed ? "CUSTOMER DATA EXPOSURE" : "CONTAINED",
      detail: blast.customer_data_exposed
        ? `Customer data exposure confirmed. Impact classification: ${blast.impact_level}.`
        : `No customer data reachable. Impact classification: ${blast.impact_level}.`,
    },
  ];
  return stages;
}

export default function BreachSimulatorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const preselected = (location.state as { identityId?: string } | null)?.identityId;

  const [tab, setTab] = useState<"live" | "patterns">("live");
  const [incidents, setIncidents] = useState<RealIncident[] | null>(null);

  const [identities, setIdentities] = useState<IdentityListItem[]>([]);
  const [selectedId, setSelectedId] = useState(preselected ?? "");
  const [identity, setIdentity] = useState<IdentityDetail | null>(null);
  const [blast, setBlast] = useState<BlastRadiusResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);

  // Revocation simulator toggles
  const [revoke, setRevoke] = useState({ crossPlatform: false, dormantAdmin: false, oldToken: false, orphan: false });

  useEffect(() => {
    if (tab === "patterns" && !incidents) {
      loadRealIncidents().then(setIncidents);
    }
  }, [tab, incidents]);

  useEffect(() => {
    api.listIdentities({ limit: 200 }).then((list) => {
      setIdentities(list);
      if (!selectedId && list.length > 0) {
        setSelectedId([...list].sort((a, b) => b.risk_score - a.risk_score)[0].identity_id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setIdentity(null);
    setBlast(null);
    setRevealedCount(0);
    setRevoke({ crossPlatform: false, dormantAdmin: false, oldToken: false, orphan: false });
    Promise.all([api.getIdentity(selectedId), api.getBlastRadius(selectedId)]).then(([i, b]) => {
      setIdentity(i);
      setBlast(b);
    });
  }, [selectedId]);

  const runSimulation = () => {
    if (!identity || !blast) return;
    setRevealedCount(0);
    setRunning(true);
    const stages = buildStages(identity, blast);
    stages.forEach((_, i) => {
      setTimeout(() => setRevealedCount(i + 1), 700 * (i + 1));
    });
    setTimeout(() => setRunning(false), 700 * (stages.length + 1));
  };

  const projectedReduction =
    (revoke.crossPlatform && identity?.is_cross_platform_admin ? POINTS.crossPlatform : 0) +
    (revoke.dormantAdmin && identity?.is_dormant_admin ? POINTS.dormantAdmin : 0) +
    (revoke.oldToken && identity?.has_old_token ? POINTS.oldToken : 0) +
    (revoke.orphan && identity?.is_orphan ? POINTS.orphan : 0);

  const projectedScore = identity ? Math.max(0, identity.final_risk_score - projectedReduction) : 0;
  const blastReductionPct = identity?.final_risk_score
    ? Math.round((projectedReduction / identity.final_risk_score) * 100)
    : 0;

  const stages = identity && blast ? buildStages(identity, blast) : [];

  return (
    <div>
      <PageHeader
        title="Breach Simulator"
        subtitle='Answers: "what happens if this identity is compromised — and how much does fixing it actually help?"'
      />

      <div className="flex gap-1.5 mb-6">
        <button
          onClick={() => setTab("live")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono border transition-colors ${
            tab === "live"
              ? "bg-[var(--color-identity)] text-[#062420] border-[var(--color-identity)]"
              : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-identity)]"
          }`}
        >
          <Radio size={13} /> Live Simulation
        </button>
        <button
          onClick={() => setTab("patterns")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono border transition-colors ${
            tab === "patterns"
              ? "bg-[var(--color-identity)] text-[#062420] border-[var(--color-identity)]"
              : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-identity)]"
          }`}
        >
          <FileWarning size={13} /> Real Incident Patterns
        </button>
      </div>

      {tab === "patterns" ? (
        !incidents ? (
          <Loading label="Matching known patterns against live dataset" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {incidents.map((inc) => (
              <motion.div
                key={inc.caseLabel}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-solid)] p-5"
              >
                <span className="text-[10px] font-mono text-[var(--color-ai)] tracking-wide">{inc.caseLabel}</span>
                <h3 className="font-display text-base font-bold text-[var(--color-text-primary)] mt-1 mb-2">
                  {inc.title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">{inc.narrative}</p>
                {inc.identity && (
                  <button
                    onClick={() => {
                      setSelectedId(inc.identity!.identity_id);
                      setTab("live");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--color-identity)] hover:underline"
                  >
                    Run full simulation on {inc.identity.full_name} →
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )
      ) : (
        <>
      <div className="flex items-center gap-3 mb-6">
        <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">Identity</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-identity)] min-w-[260px]"
        >
          {identities
            .sort((a, b) => b.risk_score - a.risk_score)
            .map((i) => (
              <option key={i.identity_id} value={i.identity_id}>
                {i.full_name} — {i.risk_band} ({i.risk_score.toFixed(0)})
              </option>
            ))}
        </select>
        <button
          onClick={runSimulation}
          disabled={!identity || running}
          className="ml-auto px-5 py-2.5 rounded-lg font-mono text-xs tracking-[0.1em] uppercase border-2 disabled:opacity-40 transition-all hover:bg-[var(--color-risk-critical)]/10"
          style={{ borderColor: "var(--color-risk-critical)", color: "var(--color-risk-critical)" }}
        >
          {running ? "Simulating..." : "▶ Simulate Attack"}
        </button>
      </div>

      {!identity || !blast ? (
        <Loading label="Pulling identity dossier" />
      ) : (
        <>
          {/* Dossier panel */}
          <div
            className="relative rounded-xl p-7 mb-6 overflow-hidden font-mono"
            style={{
              background: "repeating-linear-gradient(0deg, #0D1018, #0D1018 27px, #11151F 28px)",
              border: "1px solid #232E45",
            }}
          >
            <div
              className="absolute top-4 right-6 text-[10px] tracking-[0.3em] opacity-25 select-none rotate-[8deg] font-bold"
              style={{ color: "var(--color-risk-critical)" }}
            >
              SIMULATION · NOT A REAL INCIDENT
            </div>

            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#232E45]">
              <div>
                <div className="text-[10px] tracking-[0.2em] text-[var(--color-text-muted)]">CASE FILE</div>
                <div className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{identity.full_name}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{identity.department}</div>
              </div>
              <RiskBadge band={identity.risk_band} />
            </div>

            <div className="space-y-1">
              {stages.map((stage, i) => {
                const revealed = i < revealedCount;
                return (
                  <div key={stage.id} className="flex gap-4 py-2.5">
                    <div className="w-16 shrink-0 text-[10px] text-[var(--color-text-muted)] pt-0.5">
                      {stage.time}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: revealed ? "var(--color-risk-critical)" : "#374256" }}
                        />
                        <span
                          className="text-xs font-bold tracking-wide"
                          style={{ color: revealed ? "var(--color-text-primary)" : "#374256" }}
                        >
                          {stage.title}
                        </span>
                      </div>
                      <AnimatePresence mode="wait">
                        {revealed ? (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.3 }}
                            className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed"
                          >
                            {stage.detail}
                          </motion.p>
                        ) : (
                          <div className="h-3.5 w-2/3 mt-1.5 rounded bg-[#1A2030]" />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>

            {revealedCount === stages.length && stages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-5 pt-4 border-t border-[#232E45] flex items-center gap-3"
              >
                <span
                  className="px-3 py-1.5 rounded border-2 text-xs font-bold tracking-[0.15em] -rotate-1"
                  style={{
                    borderColor: "var(--color-risk-critical)",
                    color: "var(--color-risk-critical)",
                  }}
                >
                  IMPACT: {blast.impact_level}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {blast.systems_impacted} systems · {blast.critical_resources} critical resources
                </span>
              </motion.div>
            )}
          </div>

          {/* Revocation simulator */}
          <div className="rounded-xl p-6 border border-[var(--color-border)] bg-[var(--color-surface-solid)]">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-[var(--color-identity)]" />
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
                Revocation Simulator
              </h3>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mb-5">
              Toggle remediation actions to see the projected risk reduction before applying anything for real.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <ToggleRow
                  label={`Remove cross-platform admin (−${POINTS.crossPlatform})`}
                  disabled={!identity.is_cross_platform_admin}
                  checked={revoke.crossPlatform}
                  onChange={(v) => setRevoke((r) => ({ ...r, crossPlatform: v }))}
                />
                <ToggleRow
                  label={`Suspend dormant admin access (−${POINTS.dormantAdmin})`}
                  disabled={!identity.is_dormant_admin}
                  checked={revoke.dormantAdmin}
                  onChange={(v) => setRevoke((r) => ({ ...r, dormantAdmin: v }))}
                />
                <ToggleRow
                  label={`Rotate stale credential (−${POINTS.oldToken})`}
                  disabled={!identity.has_old_token}
                  checked={revoke.oldToken}
                  onChange={(v) => setRevoke((r) => ({ ...r, oldToken: v }))}
                />
                <ToggleRow
                  label={`Resolve orphaned account (−${POINTS.orphan})`}
                  disabled={!identity.is_orphan}
                  checked={revoke.orphan}
                  onChange={(v) => setRevoke((r) => ({ ...r, orphan: v }))}
                />
              </div>

              <div className="flex flex-col justify-center gap-3 px-4 py-3 rounded-lg bg-[var(--color-elevated)]">
                <Row label="Current Risk" value={identity.final_risk_score.toFixed(0)} color="var(--color-risk-critical)" />
                <Row label="Projected After Revocation" value={projectedScore.toFixed(0)} color="var(--color-risk-low)" />
                <Row label="Risk Reduction" value={`−${projectedReduction}`} color="var(--color-identity)" />
                <Row label="Est. Blast Radius Reduction" value={`−${blastReductionPct}%`} color="var(--color-ai)" />
              </div>
            </div>
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}

function ToggleRow({
  label, checked, disabled, onChange,
}: { label: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border transition-colors ${
        disabled
          ? "border-[var(--color-border-soft)] opacity-35 cursor-not-allowed"
          : checked
          ? "border-[var(--color-identity)] bg-[var(--color-identity)]/10"
          : "border-[var(--color-border)] hover:border-[var(--color-identity)]/50"
      }`}
    >
      <span
        className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
        style={{
          borderColor: checked ? "var(--color-identity)" : "var(--color-border)",
          background: checked ? "var(--color-identity)" : "transparent",
        }}
      >
        {checked && <Radio size={10} className="text-[#062420]" />}
      </span>
      <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
      {disabled && <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">not applicable</span>}
    </button>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="font-mono-tabular text-lg font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
