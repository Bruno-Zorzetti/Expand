import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import os from "os";

const GRAPH_PATH = join(os.homedir(), ".claude", "knowledge-graph", "graphify-out", "graph.json");

type RawNode = { id: string; label: string; community: number; community_name?: string; source_file?: string; _origin?: string };
type RawEdge = { source: string; target: string; relation: string; weight?: number };

const AGENT_PREFIXES: Record<string, string[]> = {
  henrique: ["mentores/henrique-toledo/"],
  daniel:   ["mentores/design/", "agentes/daniel", "agente_daniel"],
  teo:      ["agentes/teo", "agentes_teo"],
  bia:      ["agentes/bia", "agentes_bia"],
  aurelio:  ["agentes/aurelio", "agentes_aurelio"],
  financeiro: ["agentes/financeiro", "agentes_financeiro"],
  pmo:      ["agentes/pmo", "agentes_gerente_projetos"],
  lara:     ["agentes/lara", "agentes_lara"],
  nina:     ["agentes/nina", "agentes_nina"],
  leo:      ["agentes/leo", "agentes_leo"],
  humberto: ["agentes/humberto", "agentes_humberto"],
};

let _cached: { nodes: RawNode[]; links: RawEdge[] } | null = null;
let _cacheAt = 0;

function loadGraph() {
  const now = Date.now();
  if (_cached && now - _cacheAt < 60_000) return _cached;
  try {
    const raw = readFileSync(GRAPH_PATH, "utf-8");
    const g = JSON.parse(raw);
    _cached = { nodes: g.nodes ?? [], links: g.links ?? [] };
    _cacheAt = now;
    return _cached;
  } catch {
    return { nodes: [] as RawNode[], links: [] as RawEdge[] };
  }
}

function matchNode(n: RawNode, prefixes: string[]): boolean {
  const sf = n.source_file ?? "";
  const id = n.id ?? "";
  return prefixes.some(p => sf.startsWith(p) || id.startsWith(p.replace(/\//g, "_")));
}

export async function GET(req: NextRequest) {
  const agente = req.nextUrl.searchParams.get("agente") ?? "";
  const { nodes: allNodes, links: allLinks } = loadGraph();

  // Seed node IDs
  const seedIds = new Set<string>();
  const prefixes = AGENT_PREFIXES[agente] ?? [];

  if (prefixes.length) {
    for (const n of allNodes) {
      if (matchNode(n, prefixes)) seedIds.add(n.id);
    }
  }

  // If very few direct hits, include concept_ nodes (cross-agent methodology)
  if (seedIds.size < 8) {
    for (const n of allNodes) {
      if (n.id.startsWith("concept_") || n.id.startsWith("mentores_henrique_toledo_")) seedIds.add(n.id);
    }
  }

  // 1-hop expansion via edges
  const expanded = new Set(seedIds);
  for (const e of allLinks) {
    if (seedIds.has(e.source)) expanded.add(e.target);
    if (seedIds.has(e.target)) expanded.add(e.source);
  }

  // Build filtered sets
  const nodeIds = expanded;
  const filteredNodes = allNodes.filter(n => nodeIds.has(n.id));
  const filteredLinks = allLinks.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  // Degree computation
  const degree: Record<string, number> = {};
  for (const e of filteredLinks) {
    degree[e.source] = (degree[e.source] ?? 0) + 1;
    degree[e.target] = (degree[e.target] ?? 0) + 1;
  }

  const communities = new Set(filteredNodes.map(n => n.community));

  return NextResponse.json({
    nodes: filteredNodes.map(n => ({
      id: n.id,
      label: n.label,
      community: n.community ?? 0,
      community_name: n.community_name ?? "",
      source_file: n.source_file ?? "",
      degree: degree[n.id] ?? 0,
    })),
    edges: filteredLinks.map(e => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
      weight: e.weight ?? 1,
    })),
    stats: {
      total: filteredNodes.length,
      communities: communities.size,
      edges: filteredLinks.length,
    },
  });
}
