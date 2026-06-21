import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function SummaryTile({
  label,
  value,
  icon,
  accent = "identity",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: "identity" | "ai" | "critical" | "neutral";
}) {
  const accentColor = {
    identity: "var(--color-identity)",
    ai: "var(--color-ai)",
    critical: "var(--color-risk-critical)",
    neutral: "var(--color-text-secondary)",
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border bg-[var(--color-surface-solid)] border-[var(--color-border)] p-5 relative overflow-hidden"
    >
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20"
        style={{ background: accentColor }}
      />
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium">
          {label}
        </span>
        {icon && (
          <span style={{ color: accentColor }} className="opacity-80">
            {icon}
          </span>
        )}
      </div>
      <div className="font-mono-tabular text-3xl font-semibold text-[var(--color-text-primary)]">
        {value}
      </div>
    </motion.div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-[var(--color-text-muted)] text-sm py-12 justify-center">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-identity)] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-identity)]" />
      </span>
      {label}...
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-[var(--color-text-secondary)] font-medium">{title}</p>
      {hint && <p className="text-[var(--color-text-muted)] text-sm mt-1">{hint}</p>}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-muted)] font-mono font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}
