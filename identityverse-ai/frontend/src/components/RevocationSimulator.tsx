import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldOff, KeyRound, Power, RotateCcw, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { scoreAccounts } from "@/lib/riskScoringMirror";
import { calculateBlastRadius } from "@/lib/blastRadiusMirror";
import type { IdentityDetail, GraphResponse, PlatformAccount } from "@/types";

/**
 * Live "what-if" governance tool: toggle privilege removals and watch the
 * risk score and blast radius recompute instantly. Both numbers come from
 * real re-derivation (riskScoringMirror.ts mirrors the backend's rule
 * engine, blastRadiusMirror.ts re-traverses the real /graph/{id} data) --
 * nothing here is a canned "-46" demo number.
 */
export function RevocationSimulator({ identity }: { identity: IdentityDetail }) {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [removedAdminPlatforms, setRemovedAdminPlatforms] = useState<Set<string>>(new Set());
  const [disabledPlatforms, setDisabledPlatforms] = useState<Set<string>>(new Set());
  const [tokensRotated, setTokensRotated] = useState(false);

  useEffect(() => {
    api.getGraph(identity.identity_id).then(setGraph).catch(() => setGraph(null));
  }, [identity.identity_id]);

  const adminPlatforms = useMemo(
    () => [...new Set(identity.platform_accounts.filter((a) => a.is_admin).map((a) => a.platform))],
    [identity]
  );
  const orphanActivePlatforms = useMemo(() => {
    const adAccount = identity.platform_accounts.find((a) => a.platform === "AD");
    if (adAccount?.status !== "Disabled") return [];
    return identity.platform_accounts.filter((a) => a.platform !== "AD" && a.status === "Active").map((a) => a.platform);
  }, [identity]);

  const simulatedAccounts: PlatformAccount[] = identity.platform_accounts.map((a) => ({
    ...a,
    is_admin: removedAdminPlatforms.has(a.platform) ? false : a.is_admin,
    status: disabledPlatforms.has(a.platform) ? "Disabled" : a.status,
    token_age_days: tokensRotated ? 0 : a.token_age_days,
  }));

  const before = scoreAccounts(identity.platform_accounts);
  const after = scoreAccounts(simulatedAccounts);

  const removedRoleNodeIds = useMemo(() => {
    if (!graph) return new Set<string>();
    const ids = new Set<string>();
    for (const a of identity.platform_accounts) {
      if (removedAdminPlatforms.has(a.platform) || disabledPlatforms.has(a.platform)) {
        ids.add(`${a.platform}:${a.role}`);
      }
    }
    return ids;
  }, [graph, identity, removedAdminPlatforms, disabledPlatforms]);

  const beforeBlast = graph ? calculateBlastRadius(graph.nodes, graph.edges, new Set()) : null;
  const afterBlast = graph ? calculateBlastRadius(graph.nodes, graph.edges, removedRoleNodeIds) : null;

  const hasChanges = removedAdminPlatforms.size > 0 || disabledPlatforms.size > 0 || tokensRotated;
  const riskReduction = before.riskScore - after.riskScore;
  const blastReductionPct =
    beforeBlast && afterBlast && beforeBlast.criticalResources > 0
      ? Math.round(((beforeBlast.criticalResources - afterBlast.criticalResources) / beforeBlast.criticalResources) * 100)
      : 0;
  const resourcesRemoved = beforeBlast && afterBlast ? beforeBlast.criticalResources - afterBlast.criticalResources : 0;

  const reset = () => {
    setRemovedAdminPlatforms(new Set());
    setDisabledPlatforms(new Set());
    setTokensRotated(false);
  };

  return (
    <Card glow={hasChanges ? "identity" : "none"}>
      <CardHeader
        title="Privilege Revocation Simulator"
        subtitle="Toggle real privilege removals — risk score and blast radius recompute live from actual graph data"
        action={
          hasChanges && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )
        }
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {adminPlatforms.map((platform) => {
          const role = identity.platform_accounts.find((a) => a.platform === platform)?.role;
          const active = removedAdminPlatforms.has(platform);
          return (
            <button
              key={platform}
              onClick={() =>
                setRemovedAdminPlatforms((prev) => {
                  const next = new Set(prev);
                  next.has(platform) ? next.delete(platform) : next.add(platform);
                  return next;
                })
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                active
                  ? "bg-[var(--color-risk-critical)]/15 border-[var(--color-risk-critical)]/40 text-[var(--color-risk-critical)]"
                  : "bg-[var(--color-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
              }`}
            >
              <ShieldOff size={13} /> Remove {role} on {platform}
            </button>
          );
        })}

        {orphanActivePlatforms.map((platform) => {
          const active = disabledPlatforms.has(platform);
          return (
            <button
              key={platform}
              onClick={() =>
                setDisabledPlatforms((prev) => {
                  const next = new Set(prev);
                  next.has(platform) ? next.delete(platform) : next.add(platform);
                  return next;
                })
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                active
                  ? "bg-[var(--color-risk-critical)]/15 border-[var(--color-risk-critical)]/40 text-[var(--color-risk-critical)]"
                  : "bg-[var(--color-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
              }`}
            >
              <Power size={13} /> Disable {platform} Account
            </button>
          );
        })}

        {before.hasOldToken && (
          <button
            onClick={() => setTokensRotated((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              tokensRotated
                ? "bg-[var(--color-identity)]/15 border-[var(--color-identity)]/40 text-[var(--color-identity)]"
                : "bg-[var(--color-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
            }`}
          >
            <KeyRound size={13} /> Rotate All Credentials
          </button>
        )}

        {adminPlatforms.length === 0 && orphanActivePlatforms.length === 0 && !before.hasOldToken && (
          <p className="text-sm text-[var(--color-text-muted)]">
            No revocable privilege, orphan, or credential-age findings on this identity.
          </p>
        )}
      </div>

      <AnimatePresence>
        {graph && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-5 border-t border-[var(--color-border-soft)]"
          >
            <ResultStat
              label="Risk Score"
              before={before.riskScore}
              after={after.riskScore}
              changed={hasChanges}
              goodWhenLower
            />
            <ResultStat
              label="Risk Reduction"
              value={hasChanges ? `-${riskReduction}` : "—"}
              accent={riskReduction > 0 ? "identity" : "neutral"}
            />
            <ResultStat
              label="Blast Radius Reduction"
              value={hasChanges ? `-${blastReductionPct}%` : "—"}
              accent={blastReductionPct > 0 ? "identity" : "neutral"}
            />
            <ResultStat
              label="Critical Resources Removed"
              value={hasChanges ? resourcesRemoved : "—"}
              accent={resourcesRemoved > 0 ? "identity" : "neutral"}
            />
            <ResultStat
              label="Systems Impacted"
              before={beforeBlast?.systemsImpacted ?? 0}
              after={afterBlast?.systemsImpacted ?? 0}
              changed={hasChanges}
              goodWhenLower
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function ResultStat({
  label, before, after, value, changed, goodWhenLower, accent = "neutral",
}: {
  label: string;
  before?: number;
  after?: number;
  value?: string | number;
  changed?: boolean;
  goodWhenLower?: boolean;
  accent?: "identity" | "neutral";
}) {
  const color = accent === "identity" ? "var(--color-identity)" : "var(--color-text-primary)";
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] block mb-1.5">
        {label}
      </span>
      {value !== undefined ? (
        <span className="font-mono-tabular text-xl font-bold" style={{ color }}>
          {value}
        </span>
      ) : (
        <div className="flex items-center gap-1.5 font-mono-tabular text-xl font-bold">
          <span className="text-[var(--color-text-muted)]">{before}</span>
          {changed && (
            <>
              <ArrowRight size={14} className="text-[var(--color-text-muted)]" />
              <span style={{ color: goodWhenLower && (after ?? 0) < (before ?? 0) ? "var(--color-identity)" : "var(--color-text-primary)" }}>
                {after}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
