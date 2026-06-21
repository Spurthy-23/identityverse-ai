import { cn } from "@/lib/utils";
import type { RiskBand } from "@/types";

const BAND_STYLES: Record<RiskBand, string> = {
  LOW: "bg-[#34D39920] text-[#34D399] border-[#34D39940]",
  MEDIUM: "bg-[#FBBF2420] text-[#FBBF24] border-[#FBBF2440]",
  HIGH: "bg-[#FB8B3C20] text-[#FB8B3C] border-[#FB8B3C40]",
  CRITICAL: "bg-[#FB476820] text-[#FB4768] border-[#FB476840]",
};

export function RiskBadge({ band, className }: { band: RiskBand; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold font-mono tracking-wide",
        BAND_STYLES[band],
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          band === "CRITICAL" && "animate-pulse"
        )}
        style={{ background: "currentColor" }}
      />
      {band}
    </span>
  );
}
