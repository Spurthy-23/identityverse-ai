import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Server, Database, ShieldOff } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/Shared";
import { Card, CardHeader } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Loading } from "@/components/ui/Misc";
import type { IdentityListItem, BlastRadiusResponse } from "@/types";

export default function BlastRadiusPage() {
  const location = useLocation();
  const preselected = (location.state as { identityId?: string } | null)?.identityId;

  const [identities, setIdentities] = useState<IdentityListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(preselected ?? "");
  const [result, setResult] = useState<BlastRadiusResponse | null>(null);
  const [identityName, setIdentityName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listIdentities({ limit: 200 }).then((list) => {
      setIdentities(list);
      if (!selectedId && list.length > 0) {
        const riskiest = [...list].sort((a, b) => b.risk_score - a.risk_score)[0];
        setSelectedId(riskiest.identity_id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    const item = identities.find((i) => i.identity_id === selectedId);
    if (item) setIdentityName(item.full_name);
    api.getBlastRadius(selectedId).then(setResult).finally(() => setLoading(false));
  }, [selectedId, identities]);

  return (
    <div>
      <PageHeader
        title="Blast Radius Analysis"
        subtitle='Answers one question: "What happens if this identity is compromised?"'
      />

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
      </div>

      {loading || !result ? (
        <Loading label="Tracing reachable systems" />
      ) : (
        <>
          <Card glow={result.impact_level === "CRITICAL" ? "ai" : "none"} className="mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">If compromised</span>
                <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)] mt-1">
                  {identityName}
                </h2>
              </div>
              <RiskBadge band={result.impact_level} className="text-sm px-4 py-2" />
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {[
              { label: "Systems Impacted", value: result.systems_impacted, icon: Server, accent: "identity" as const },
              { label: "Critical Resources", value: result.critical_resources, icon: Database, accent: "ai" as const },
              {
                label: "Customer Data",
                value: result.customer_data_exposed ? "EXPOSED" : "Safe",
                icon: ShieldOff,
                accent: result.customer_data_exposed ? ("critical" as const) : ("identity" as const),
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                        {stat.label}
                      </span>
                      <div className="font-mono-tabular text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                        {stat.value}
                      </div>
                    </div>
                    <stat.icon size={28} className="opacity-30" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <Card>
            <CardHeader title="Reachable Resources" subtitle="Every resource accessible by traversing this identity's role and permission graph" />
            {result.reachable_resources.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">No resources reachable beyond this identity's direct roles.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.reachable_resources.map((r) => (
                  <span
                    key={r}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)]"
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
