import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { EmptyState } from "@/components/ui/Misc";
import type { IdentityListItem } from "@/types";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function IdentityTable({ identities }: { identities: IdentityListItem[] }) {
  const navigate = useNavigate();

  if (identities.length === 0) {
    return <EmptyState title="No identities match these filters" hint="Try widening the filter criteria." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-elevated)]">
            <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Identity</th>
            <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Department</th>
            <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Platforms</th>
            <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Risk Score</th>
            <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Band</th>
            <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Flags</th>
          </tr>
        </thead>
        <tbody>
          {identities.map((id, i) => (
            <motion.tr
              key={id.identity_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.015, 0.4) }}
              onClick={() => navigate(`/identities/${id.identity_id}`)}
              className="border-b border-[var(--color-border-soft)] last:border-0 cursor-pointer hover:bg-[var(--color-surface)] transition-colors"
            >
              <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{id.full_name}</td>
              <td className="px-4 py-3 text-[var(--color-text-secondary)]">{id.department}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1 flex-wrap">
                  {id.platforms.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 font-mono-tabular font-semibold text-[var(--color-text-primary)]">
                {id.risk_score.toFixed(0)}
              </td>
              <td className="px-4 py-3">
                <RiskBadge band={id.risk_band} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  {id.is_orphan && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FB476815] text-[#FB4768] border border-[#FB476830]">
                      ORPHAN
                    </span>
                  )}
                  {id.is_dormant_admin && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FBBF2415] text-[#FBBF24] border border-[#FBBF2430]">
                      DORMANT ADMIN
                    </span>
                  )}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
