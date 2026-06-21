import { useEffect, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
} from "d3-force";
import { motion } from "framer-motion";
import type { GraphNode, GraphEdge } from "@/types";

interface SimNode extends SimulationNodeDatum, GraphNode {}

const TYPE_STYLE: Record<string, { color: string; r: number }> = {
  user: { color: "#2DE2C8", r: 14 },
  role: { color: "#9B7BFF", r: 9 },
  permission: { color: "#FBBF24", r: 7 },
  resource: { color: "#FB8B3C", r: 8 },
};

export function ForceGraph({
  nodes,
  edges,
  width = 720,
  height = 420,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
}) {
  const [laidOut, setLaidOut] = useState<SimNode[] | null>(null);
  const linksRef = useRef<{ source: SimNode; target: SimNode; relation: string }[]>([]);

  useEffect(() => {
    if (nodes.length === 0) return;

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks = edges
      .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
      .map((e) => ({
        source: nodeById.get(e.source)!,
        target: nodeById.get(e.target)!,
        relation: e.relation,
      }));

    const sim = forceSimulation(simNodes)
      .force(
        "link",
        forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance(90)
          .strength(0.6)
      )
      .force("charge", forceManyBody().strength(-220))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide().radius((d: any) => (TYPE_STYLE[d.type]?.r ?? 8) + 14))
      .stop();

    for (let i = 0; i < 250; i++) sim.tick();

    linksRef.current = simLinks;
    setLaidOut(simNodes);
  }, [nodes, edges, width, height]);

  if (!laidOut) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center text-[var(--color-text-muted)] text-sm"
      >
        Building graph...
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Identity access graph">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3A465F" />
        </marker>
      </defs>

      {linksRef.current.map((l, i) => (
        <motion.line
          key={i}
          x1={(l.source as any).x} y1={(l.source as any).y}
          x2={(l.target as any).x} y2={(l.target as any).y}
          stroke="#2B3650"
          strokeWidth={1.5}
          markerEnd="url(#arrow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      ))}

      {laidOut.map((n, i) => {
        const style = TYPE_STYLE[n.type] ?? { color: "#9AA5BD", r: 8 };
        return (
          <motion.g
            key={n.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.02, duration: 0.3, type: "spring" }}
          >
            <circle
              cx={(n as any).x} cy={(n as any).y} r={style.r}
              fill={n.sensitive ? "#FB4768" : style.color}
              opacity={0.9}
              style={{ filter: `drop-shadow(0 0 6px ${n.sensitive ? "#FB4768" : style.color})` }}
            />
            <text
              x={(n as any).x} y={(n as any).y + style.r + 12}
              textAnchor="middle"
              fontSize="9"
              fontFamily="IBM Plex Mono, monospace"
              fill="#9AA5BD"
            >
              {n.label.length > 16 ? n.label.slice(0, 16) + "…" : n.label}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}

export function GraphLegend() {
  const items = [
    { label: "Identity", color: TYPE_STYLE.user.color },
    { label: "Role", color: TYPE_STYLE.role.color },
    { label: "Permission", color: TYPE_STYLE.permission.color },
    { label: "Resource", color: TYPE_STYLE.resource.color },
    { label: "Sensitive resource", color: "#FB4768" },
  ];
  return (
    <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-secondary)]">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
