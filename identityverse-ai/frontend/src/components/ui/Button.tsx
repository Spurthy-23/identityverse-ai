import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-[var(--color-identity)] text-[#062420] hover:brightness-110",
        variant === "secondary" &&
          "bg-[var(--color-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]",
        variant === "ghost" &&
          "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]",
        className
      )}
      {...props}
    />
  );
}
