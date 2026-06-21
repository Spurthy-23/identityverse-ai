import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/Shared";
import { Card } from "@/components/ui/Card";
import { Loading, EmptyState } from "@/components/ui/Misc";
import { ForceGraph, GraphLegend } from "@/components/ForceGraph";
import type { IdentityListItem, GraphResponse } from "@/types";

export default function IdentityGraphPage() {
  const location = useLocation();
  const preselected = (location.state as { identityId?: string } | null)?.identityId;

  const [identities, setIdentities] = useState<IdentityListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(preselected ?? "");
  const [graph, setGraph] = useState<GraphResponse | null>(null);
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
    api.getGraph(selectedId).then(setGraph).finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <div>
      <PageHeader
        title="Identity Graph"
        subtitle="User → Role → Permission → Resource. The full access path an attacker could traverse from this identity."
      />

      <div className="flex items-center gap-3 mb-5">
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

      <Card glow="identity">
        {loading || !graph ? (
          <Loading label="Building access graph" />
        ) : graph.nodes.length === 0 ? (
          <EmptyState title="No graph data" hint="This identity has no resolved role mappings." />
        ) : (
          <>
            <ForceGraph nodes={graph.nodes} edges={graph.edges} />
            <div className="mt-4 pt-4 border-t border-[var(--color-border-soft)]">
              <GraphLegend />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
