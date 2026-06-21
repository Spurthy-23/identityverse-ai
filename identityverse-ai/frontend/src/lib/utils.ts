import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function riskColor(band: string): string {
  switch (band) {
    case "CRITICAL":
      return "var(--color-risk-critical)";
    case "HIGH":
      return "var(--color-risk-high)";
    case "MEDIUM":
      return "var(--color-risk-medium)";
    default:
      return "var(--color-risk-low)";
  }
}

export function formatRelativeDays(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
