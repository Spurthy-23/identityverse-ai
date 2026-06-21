import type { GraphNode, GraphEdge } from "@/types";

/**
 * Client-side mirror of backend/app/services/graph_engine.calculate_blast_radius.
 * Same rationale as riskScoringMirror.ts -- real graph data comes from
 * GET /graph/{id}, this just re-traverses it in the browser after removing
 * the role nodes the user "revoked" in the simulator, so the before/after
 * numbers are real BFS results over real data, not guesses.
 */

export interface SimulatedBlastRadius {
  systemsImpacted: number;
  criticalResources: number;
  customerDataExposed: boolean;
  impactLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reachableResources: string[];
}

export function calculateBlastRadius(
  nodes: GraphNode[],
  edges: GraphEdge[],
  removedRoleNodeIds: Set<string>
): SimulatedBlastRadius {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const userNode = nodes.find((n) => n.type === "user");
  if (!userNode) {
    return { systemsImpacted: 0, criticalResources: 0, customerDataExposed: false, impactLevel: "LOW", reachableResources: [] };
  }

  // Adjacency, skipping edges that originate from a removed role node (or
  // the user->role edge into a removed role) -- this is the "revocation".
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    if (removedRoleNodeIds.has(e.target) || removedRoleNodeIds.has(e.source)) continue;
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    adjacency.get(e.source)!.push(e.target);
  }

  const visited = new Set<string>([userNode.id]);
  const queue = [userNode.id];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  visited.delete(userNode.id);

  const reachableResourceNodes = [...visited]
    .map((id) => nodeById.get(id))
    .filter((n): n is GraphNode => !!n && n.type === "resource");

  const platformsTouched = new Set(
    [...visited]
      .map((id) => nodeById.get(id))
      .filter((n): n is GraphNode => !!n && n.type === "role")
      .map((n) => n.platform)
      .filter((p): p is string => !!p)
  );

  const customerDataExposed = reachableResourceNodes.some((n) => n.sensitive);
  const systemsImpacted = platformsTouched.size;
  const criticalResources = reachableResourceNodes.length;

  let impactLevel: SimulatedBlastRadius["impactLevel"] = "LOW";
  if (customerDataExposed || systemsImpacted >= 3) impactLevel = "CRITICAL";
  else if (systemsImpacted === 2) impactLevel = "HIGH";
  else if (systemsImpacted === 1) impactLevel = "MEDIUM";

  return {
    systemsImpacted,
    criticalResources,
    customerDataExposed,
    impactLevel,
    reachableResources: reachableResourceNodes.map((n) => n.label),
  };
}
