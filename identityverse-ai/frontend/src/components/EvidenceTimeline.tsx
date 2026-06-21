import { motion } from "framer-motion";
import { FileSearch, GitBranch, Clock as ClockIcon, KeyRound, UserX } from "lucide-react";
import type { EvidenceEntry } from "@/lib/evidenceTimeline";

const ACTION_ICON: Record<string, typeof FileSearch> = {
  ROLE_CHANGE: GitBranch,
  PERMISSION_GRANT: GitBranch,
  DORMANCY_DETECTED: ClockIcon,
  OFFBOARDING_GAP: UserX,
  STALE_CREDENTIAL: KeyRound,
};

export function EvidenceTimeline({ entries }: { entries: EvidenceEntry[] }) {
  const totalAttributed = entries.reduce((sum, e) => sum + e.riskContribution, 0);

  return (
    <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-3 bg-[var(--color-elevated)] border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSearch size={15} className="text-[var(--color-identity)]" />
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-secondary)]">
            Evidence Ledger — {entries.length} record{entries.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-xs font-mono text-[var(--color-text-muted)]">
          attributed: <span className="text-[var(--color-risk-high)] font-semibold">+{totalAttributed}</span>
        </span>
      </div>

      <div className="divide-y divide-[var(--color-border-soft)]">
        {entries.map((e, i) => {
          const Icon = ACTION_ICON[e.action] ?? GitBranch;
          return (
            <motion.div
              key={e.eventId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="px-4 py-3 flex items-start gap-3 hover:bg-[var(--color-surface)] transition-colors"
            >
              <div
                className="mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0 border"
                style={{
                  borderColor: e.riskContribution > 0 ? "rgba(251,71,104,0.35)" : "var(--color-border)",
                  background: e.riskContribution > 0 ? "rgba(251,71,104,0.08)" : "var(--color-elevated)",
                }}
              >
                <Icon size={13} className={e.riskContribution > 0 ? "text-[var(--color-risk-critical)]" : "text-[var(--color-text-muted)]"} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                    {e.eventId}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                    {new Date(e.timestamp).toLocaleString(undefined, {
                      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wide"
                    style={{
                      color: e.source === "audit_log" ? "var(--color-identity)" : "var(--color-ai)",
                      background: e.source === "audit_log" ? "rgba(45,226,200,0.08)" : "rgba(155,123,255,0.08)",
                    }}
                  >
                    {e.source === "audit_log" ? "audit trail" : "current state"}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-primary)]">{e.description}</p>
              </div>

              <div className="shrink-0 text-right">
                {e.riskContribution > 0 ? (
                  <span className="font-mono-tabular text-sm font-bold text-[var(--color-risk-critical)]">
                    +{e.riskContribution}
                  </span>
                ) : (
                  <span className="font-mono text-xs text-[var(--color-text-muted)]">context</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
