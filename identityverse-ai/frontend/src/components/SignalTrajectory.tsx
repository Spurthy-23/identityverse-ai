import { motion } from "framer-motion";
import type { ForecastResult } from "@/lib/forecastMetrics";

/**
 * Custom trajectory chart -- not a recharts LineChart. Historical activity
 * draws as a solid self-drawing path; at "today" it forks into a dashed
 * projected segment fanning into a shaded uncertainty cone that widens
 * toward the 90-day mark, visually encoding "we're less sure the further
 * out we project" rather than presenting a false-confidence single line.
 */
export function SignalTrajectory({ data, width = 640, height = 220 }: { data: ForecastResult; width?: number; height?: number }) {
  const pad = { top: 20, bottom: 30, left: 10, right: 90 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const histPoints = data.monthlyActivity.length;
  const xStep = plotW / (histPoints + 2); // +2 reserves room for 30d/90d projection points

  const yFor = (riskLike: number) => pad.top + plotH * (1 - riskLike / 100);
  const xFor = (i: number) => pad.left + i * xStep;

  // Historical line: blend activity index toward current risk score so the
  // line ends exactly at "today" with continuity into the projection.
  const histY = data.monthlyActivity.map((m, i) => {
    const blend = i / (histPoints - 1);
    const value = m.index * (1 - blend) + data.current * blend;
    return yFor(value);
  });

  const historicalPath = histY.map((y, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${y.toFixed(1)}`).join(" ");

  const todayX = xFor(histPoints - 1);
  const todayY = yFor(data.current);
  const x30 = xFor(histPoints);
  const y30 = yFor(data.projected30);
  const x90 = xFor(histPoints + 1);
  const y90 = yFor(data.projected90);

  const projectedPath = `M ${todayX} ${todayY} L ${x30} ${y30} L ${x90} ${y90}`;
  const coneTop90 = yFor(Math.min(100, data.projected90 + 8));
  const coneBottom90 = yFor(Math.max(0, data.projected90 - 8));
  const conePath = `M ${todayX} ${todayY} L ${x90} ${coneTop90} L ${x90} ${coneBottom90} Z`;

  const lineColor = data.direction === "up" ? "#FB4768" : data.direction === "down" ? "#34D399" : "#FBBF24";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {/* Reference gridlines */}
      {[0, 25, 50, 75, 100].map((v) => (
        <line key={v} x1={pad.left} x2={width - pad.right} y1={yFor(v)} y2={yFor(v)} stroke="#1C2536" strokeDasharray="2 4" />
      ))}

      {/* Uncertainty cone */}
      <motion.path
        d={conePath}
        fill={lineColor}
        opacity={0.08}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.08 }}
        transition={{ delay: 1, duration: 0.6 }}
      />

      {/* Historical (real, audit-derived) */}
      <motion.path
        d={historicalPath}
        fill="none"
        stroke="var(--color-identity)"
        strokeWidth={2.5}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      {/* Projected (heuristic) */}
      <motion.path
        d={projectedPath}
        fill="none"
        stroke={lineColor}
        strokeWidth={2.5}
        strokeDasharray="6 5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 1.1, ease: "easeOut" }}
      />

      {/* Today marker */}
      <circle cx={todayX} cy={todayY} r={4} fill="var(--color-identity)" />
      <text x={todayX} y={height - 8} textAnchor="middle" fontSize="9" fontFamily="IBM Plex Mono, monospace" fill="#6B7790">
        TODAY
      </text>

      {/* 30d / 90d markers */}
      <motion.circle cx={x30} cy={y30} r={4} fill={lineColor} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.6 }} />
      <text x={x30} y={height - 8} textAnchor="middle" fontSize="9" fontFamily="IBM Plex Mono, monospace" fill="#6B7790">
        +30D
      </text>

      <motion.circle cx={x90} cy={y90} r={4} fill={lineColor} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.8 }} />
      <text x={x90} y={height - 8} textAnchor="middle" fontSize="9" fontFamily="IBM Plex Mono, monospace" fill="#6B7790">
        +90D
      </text>

      {/* Value labels */}
      <text x={x90 + 14} y={y90 + 4} fontSize="13" fontWeight="700" fontFamily="IBM Plex Mono, monospace" fill={lineColor}>
        {data.projected90.toFixed(0)}
      </text>
    </svg>
  );
}
