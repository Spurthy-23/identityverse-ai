import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Sparkles, RotateCw } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/Shared";
import { Card, CardHeader } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Button } from "@/components/ui/Button";
import { Loading, EmptyState } from "@/components/ui/Misc";
import type { IdentityListItem, RemediationResponse } from "@/types";

interface RemediationItem {
  identity: IdentityListItem;
  remediation: RemediationResponse | null;
  resolvedSteps: boolean[];
}

export default function RemediationCenterPage() {
  const [items, setItems] = useState<RemediationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const loadQueue = () => {
    setLoading(true);
    api
      .listIdentities({ limit: 200 })
      .then((list) => {
        const flagged = list
          .filter((i) => i.risk_band === "HIGH" || i.risk_band === "CRITICAL")
          .slice(0, 10);
        setItems(
          flagged.map((identity) => ({
            identity,
            remediation: null,
            resolvedSteps: [],
          }))
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadQueue, []);

  const loadRemediation = async (idx: number) => {
    const id = items[idx].identity.identity_id;
    const res = await api.getRemediation(id);
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, remediation: res, resolvedSteps: res.remediation_steps.map(() => false) } : it
      )
    );
  };

  const toggleStep = (idx: number, stepIdx: number) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              resolvedSteps: it.resolvedSteps.map((v, j) => (j === stepIdx ? !v : v)),
            }
          : it
      )
    );
  };

  const recompute = async () => {
    setRecomputing(true);
    await api.recompute();
    loadQueue();
    setRecomputing(false);
  };

  return (
    <div>
      <PageHeader
        title="Remediation Center"
        subtitle="High and critical risk identities queued for action, with AI-generated remediation plans."
        action={
          <Button variant="secondary" onClick={recompute} disabled={recomputing}>
            <RotateCw size={14} className={recomputing ? "animate-spin" : ""} />
            {recomputing ? "Recomputing..." : "Recompute Risk"}
          </Button>
        }
      />

      {loading ? (
        <Loading label="Building remediation queue" />
      ) : items.length === 0 ? (
        <EmptyState title="No high or critical risk identities right now" hint="The environment is in good shape." />
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const resolvedCount = item.resolvedSteps.filter(Boolean).length;
            const totalSteps = item.resolvedSteps.length;
            return (
              <Card key={item.identity.identity_id}>
                <CardHeader
                  title={item.identity.full_name}
                  subtitle={`${item.identity.department} · Risk score ${item.identity.risk_score.toFixed(0)}`}
                  action={
                    <div className="flex items-center gap-3">
                      <RiskBadge band={item.identity.risk_band} />
                      {!item.remediation && (
                        <Button variant="secondary" onClick={() => loadRemediation(idx)}>
                          <Sparkles size={14} /> Generate Plan
                        </Button>
                      )}
                    </div>
                  }
                />
                <AnimatePresence>
                  {item.remediation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-[var(--color-text-secondary)] mb-4">{item.remediation.summary}</p>
                      <div className="space-y-2">
                        {item.remediation.remediation_steps.map((step, stepIdx) => {
                          const done = item.resolvedSteps[stepIdx];
                          return (
                            <button
                              key={stepIdx}
                              onClick={() => toggleStep(idx, stepIdx)}
                              className="w-full flex items-start gap-2.5 text-left px-3 py-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                            >
                              {done ? (
                                <CheckCircle2 size={17} className="text-[var(--color-risk-low)] shrink-0 mt-0.5" />
                              ) : (
                                <Circle size={17} className="text-[var(--color-text-muted)] shrink-0 mt-0.5" />
                              )}
                              <span
                                className={`text-sm ${
                                  done
                                    ? "text-[var(--color-text-muted)] line-through"
                                    : "text-[var(--color-text-primary)]"
                                }`}
                              >
                                {step}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {totalSteps > 0 && (
                        <div className="mt-4 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--color-elevated)] overflow-hidden">
                            <motion.div
                              className="h-full bg-[var(--color-risk-low)]"
                              initial={{ width: 0 }}
                              animate={{ width: `${(resolvedCount / totalSteps) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-[var(--color-text-muted)]">
                            {resolvedCount}/{totalSteps}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
