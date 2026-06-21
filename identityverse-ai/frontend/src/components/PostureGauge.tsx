import { motion } from "framer-motion";

function scoreColor(score: number): string {
  if (score >= 70) return "#34D399";
  if (score >= 45) return "#FBBF24";
  if (score >= 25) return "#FB8B3C";
  return "#FB4768";
}

/** Semi-circle posture gauge. score is 0-100, higher = healthier. */
export function PostureGauge({ score, label }: { score: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 80;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = scoreColor(clamped);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" width="100%" height="140" style={{ maxWidth: 240 }}>
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--color-elevated)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <motion.path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
        <text
          x="100" y="88"
          textAnchor="middle"
          fontFamily="IBM Plex Mono, monospace"
          fontSize="34"
          fontWeight="700"
          fill="var(--color-text-primary)"
        >
          {Math.round(clamped)}
        </text>
      </svg>
      <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide -mt-2">
        {label}
      </span>
    </div>
  );
}
