import { motion } from "framer-motion";
import type { ThreatCategory } from "@/lib/threatRadarMetrics";

const SCOPE_GREEN = "#4AFF9C";
const SCOPE_GREEN_DIM = "#1E5C3A";

/**
 * Hand-built radar/sonar display -- deliberately not recharts' RadarChart,
 * which is what every other Claude-built dashboard reaches for by default.
 * A rotating conic-gradient sweep arm gives it the feel of an actual radar
 * instrument rather than a static polygon chart, and the whole component
 * runs on a dedicated phosphor-green palette instead of the app's usual
 * cyan/violet -- a deliberate "this is a different instrument" signal.
 */
export function SonarRadar({
  categories,
  size = 420,
}: {
  categories: ThreatCategory[];
  size?: number;
}) {
  const center = size / 2;
  const maxRadius = size / 2 - 56;
  const n = categories.length;
  const angleStep = (Math.PI * 2) / n;
  const angleOffset = -Math.PI / 2;

  const pointFor = (index: number, valueFraction: number) => {
    const angle = angleOffset + index * angleStep;
    const r = maxRadius * valueFraction;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)] as const;
  };

  const dataPoints = categories.map((c, i) => pointFor(i, c.value / 100));
  const polygonPath =
    "M " + dataPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ") + " Z";

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Rotating sweep arm, clipped to the circular scope */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{ width: maxRadius * 2 + 8, height: maxRadius * 2 + 8 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${SCOPE_GREEN}33 25deg, transparent 70deg)`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="relative">
        {/* Concentric range rings */}
        {rings.map((r) => (
          <circle
            key={r}
            cx={center} cy={center} r={maxRadius * r}
            fill="none"
            stroke={SCOPE_GREEN_DIM}
            strokeWidth={1}
            strokeDasharray={r === 1 ? undefined : "2 4"}
          />
        ))}

        {/* Spokes + axis labels */}
        {categories.map((c, i) => {
          const [x, y] = pointFor(i, 1.18);
          const [lx, ly] = pointFor(i, 1.0);
          return (
            <g key={c.key}>
              <line x1={center} y1={center} x2={lx} y2={ly} stroke={SCOPE_GREEN_DIM} strokeWidth={1} />
              <text
                x={x} y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9.5"
                fontFamily="IBM Plex Mono, monospace"
                fill="#7FBF9C"
              >
                {c.label.toUpperCase()}
              </text>
              <text
                x={x} y={y + 13}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fontFamily="IBM Plex Mono, monospace"
                fill={SCOPE_GREEN}
              >
                {Math.round(c.value)}
              </text>
            </g>
          );
        })}

        {/* Data polygon */}
        <motion.path
          d={polygonPath}
          fill={`${SCOPE_GREEN}22`}
          stroke={SCOPE_GREEN}
          strokeWidth={2}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ transformOrigin: `${center}px ${center}px`, filter: `drop-shadow(0 0 8px ${SCOPE_GREEN}80)` }}
        />
        {dataPoints.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x} cy={y} r={3.5}
            fill={SCOPE_GREEN}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            style={{ filter: `drop-shadow(0 0 4px ${SCOPE_GREEN})` }}
          />
        ))}

        {/* Center readout */}
        <circle cx={center} cy={center} r={3} fill={SCOPE_GREEN} />
      </svg>
    </div>
  );
}
