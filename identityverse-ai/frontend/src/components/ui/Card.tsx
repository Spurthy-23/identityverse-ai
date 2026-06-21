import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: "identity" | "ai" | "none";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--color-surface-solid)] border-[var(--color-border)] p-5",
        glow === "identity" && "shadow-[0_0_40px_-12px_rgba(45,226,200,0.25)]",
        glow === "ai" && "shadow-[0_0_40px_-12px_rgba(155,123,255,0.25)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="font-display text-sm font-semibold tracking-wide text-[var(--color-text-primary)] uppercase">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
