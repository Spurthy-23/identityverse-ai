import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/Shared";
import { Card } from "@/components/ui/Card";
import { Loading, EmptyState } from "@/components/ui/Misc";
import type { IdentityListItem, TimelineResponse } from "@/types";

const ACTION_COLOR: Record<string, string> = {
  ROLE_CHANGE: "#9B7BFF",
  PERMISSION_GRANT: "#FBBF24",
};

export default function PrivilegeCreepPage() {
  const [identities, setIdentities] = useState<IdentityListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.listIdentities({ limit: 200 }).then((list) => {
      setIdentities(list);
      if (list.length > 0) {
        const riskiest = [...list].sort((a, b) => b.risk_score - a.risk_score)[0];
        setSelectedId(riskiest.identity_id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    api.getTimeline(selectedId).then(setTimeline).finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <div>
      <PageHeader
        title="Privilege Creep Timeline"
        subtitle="Role changes and permission grants for an identity, in chronological order — built from audit log events rather than a separate snapshot history."
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

      <Card>
        {loading || !timeline ? (
          <Loading label="Reconstructing privilege history" />
        ) : timeline.events.length === 0 ? (
          <EmptyState title="No role or permission changes recorded for this identity" />
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--color-border)]" />
            <div className="space-y-5">
              {timeline.events.map((e, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative"
                >
                  <span
                    className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-[var(--color-base)]"
                    style={{ background: ACTION_COLOR[e.action] ?? "#9AA5BD" }}
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">
                      {new Date(e.timestamp).toLocaleDateString(undefined, {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </span>
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{
                        color: ACTION_COLOR[e.action] ?? "#9AA5BD",
                        background: `${ACTION_COLOR[e.action] ?? "#9AA5BD"}15`,
                      }}
                    >
                      {e.action.replace("_", " ")}
                    </span>
                    <span className="text-xs font-mono text-[var(--color-text-secondary)]">{e.platform}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
