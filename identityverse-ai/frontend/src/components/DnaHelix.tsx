import { motion } from "framer-motion";

export interface DnaGenes {
  privilege: number; // 0-100
  dormancy: number;
  access: number;
  token: number;
}

const GENE_META: { key: keyof DnaGenes; label: string }[] = [
  { key: "privilege", label: "Privilege Gene" },
  { key: "dormancy", label: "Dormancy Gene" },
  { key: "access", label: "Access Spread" },
  { key: "token", label: "Token Risk" },
];

function geneColor(value: number): string {
  if (value >= 75) return "#FB4768";
  if (value >= 50) return "#FB8B3C";
  if (value >= 25) return "#FBBF24";
  return "#34D399";
}

/**
 * The platform's signature visual: a double-helix ribbon where each "rung"
 * encodes one risk gene. Severity drives both the rung's color and its
 * glow intensity, so a glance at the silhouette alone (color clustering
 * toward red on the right) tells you more than the dashboard number does.
 */
export function DnaHelix({ genes, compact = false }: { genes: DnaGenes; compact?: boolean }) {
  const width = compact ? 280 : 560;
  const height = compact ? 90 : 150;
  const amplitude = compact ? 18 : 32;
  const turns = 1.5;
  const points = 80;
  const midY = height / 2;

  const strandA: [number, number][] = [];
  const strandB: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = t * width;
    const phase = t * turns * Math.PI * 2;
    strandA.push([x, midY + Math.sin(phase) * amplitude]);
    strandB.push([x, midY + Math.sin(phase + Math.PI) * amplitude]);
  }

  const pathFrom = (pts: [number, number][]) =>
    "M " + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ");

  const rungPositions = GENE_META.map((_, i) => (i + 0.5) / GENE_META.length);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height + (compact ? 24 : 44)}`}
        width="100%"
        height={compact ? 110 : 190}
        role="img"
        aria-label="Identity risk DNA profile"
      >
        <defs>
          <linearGradient id="strandA" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2DE2C8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#9B7BFF" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <motion.path
          d={pathFrom(strandA)}
          fill="none"
          stroke="url(#strandA)"
          strokeWidth={2}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
        <motion.path
          d={pathFrom(strandB)}
          fill="none"
          stroke="url(#strandA)"
          strokeWidth={2}
          strokeOpacity={0.45}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
        />

        {rungPositions.map((t, i) => {
          const gene = GENE_META[i];
          const value = genes[gene.key];
          const x = t * width;
          const phase = t * turns * Math.PI * 2;
          const yA = midY + Math.sin(phase) * amplitude;
          const yB = midY + Math.sin(phase + Math.PI) * amplitude;
          const color = geneColor(value);

          return (
            <g key={gene.key}>
              <motion.line
                x1={x} y1={yA} x2={x} y2={yB}
                stroke={color}
                strokeWidth={2.5}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.4 }}
              />
              <motion.circle
                cx={x} cy={yA} r={4}
                fill={color}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.3 }}
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              />
              <motion.circle
                cx={x} cy={yB} r={4}
                fill={color}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.3 }}
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              />
              {!compact && (
                <>
                  <text
                    x={x} y={height + 18}
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="IBM Plex Mono, monospace"
                    fill="#9AA5BD"
                    letterSpacing="0.02em"
                  >
                    {gene.label}
                  </text>
                  <text
                    x={x} y={height + 34}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="600"
                    fontFamily="IBM Plex Mono, monospace"
                    fill={color}
                  >
                    {Math.round(value)}%
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function computeDnaGenes(identity: {
  platform_accounts: { platform: string; is_admin: boolean; last_login: string; token_age_days: number }[];
}): DnaGenes {
  const accounts = identity.platform_accounts;
  const total = accounts.length || 1;
  const adminCount = accounts.filter((a) => a.is_admin).length;
  const platformSpread = new Set(accounts.map((a) => a.platform)).size;

  const maxDormancyDays = Math.max(
    ...accounts.map((a) => Math.floor((Date.now() - new Date(a.last_login).getTime()) / 86400000)),
    0
  );
  const maxTokenAge = Math.max(...accounts.map((a) => a.token_age_days), 0);

  return {
    privilege: Math.min(100, Math.round((adminCount / total) * 100)),
    dormancy: Math.min(100, Math.round((maxDormancyDays / 200) * 100)),
    access: Math.min(100, Math.round((platformSpread / 4) * 100)),
    token: Math.min(100, Math.round((maxTokenAge / 730) * 100)),
  };
}
