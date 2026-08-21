import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import os from "os";

const GRAPH_PATH = join(os.homedir(), ".claude", "knowledge-graph", "graphify-out", "graph.json");

type RawNode = {
  id: string; label: string; community: number; community_name?: string;
  source_file?: string; _origin?: string; content?: string; description?: string;
};
type RawEdge = { source: string; target: string; relation: string; weight?: number };

const AGENT_PREFIXES: Record<string, string[]> = {
  henrique:   ["mentores/henrique-toledo/"],
  daniel:     ["mentores/design/", "agentes/daniel", "agente_daniel"],
  teo:        ["agentes/teo", "agentes_teo"],
  bia:        ["agentes/bia", "agentes_bia"],
  aurelio:    ["agentes/aurelio", "agentes_aurelio"],
  financeiro: ["agentes/financeiro", "agentes_financeiro"],
  pmo:        ["agentes/pmo", "agentes_gerente_projetos"],
  lara:       ["agentes/lara", "agentes_lara"],
  nina:       ["agentes/nina", "agentes_nina"],
  leo:        ["agentes/leo", "agentes_leo"],
  humberto:   ["agentes/humberto", "agentes_humberto"],
};

// Deriva nome semântico da comunidade a partir dos labels mais frequentes de seus nós.
function deriveCommunityName(nodes: RawNode[]): string {
  if (!nodes.length) return "Conceitos";
  // Palavras significativas mais frequentes nos labels
  const stopWords = new Set(["de","do","da","dos","das","e","em","o","a","os","as","para","com","por","que","um","uma","se","ao","na","no","nas","nos","são","foi","seu","sua","este","esta","como","mais","mas","ou","já","todo","toda","quando","então","onde","pode","deve","cada","sobre","entre","até","após","antes"]);
  const freq: Record<string, number> = {};
  for (const n of nodes) {
    const words = n.label.toLowerCase().split(/[\s,\-–—:;.!?()[\]{}'"\/\\]+/).filter(w => w.length > 3 && !stopWords.has(w));
    for (const w of words) freq[w] = (freq[w] ?? 0) + 1;
  }
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
  if (!top.length) return "Conceitos";
  // Capitaliza e compõe
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return top.slice(0, 2).map(cap).join(" & ");
}

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

  const seedIds = new Set<string>();
  const prefixes = AGENT_PREFIXES[agente] ?? [];

  if (prefixes.length) {
    for (const n of allNodes) {
      if (matchNode(n, prefixes)) seedIds.add(n.id);
    }
  }

  if (seedIds.size < 8) {
    for (const n of allNodes) {
      if (n.id.startsWith("concept_") || n.id.startsWith("mentores_henrique_toledo_")) seedIds.add(n.id);
    }
  }

  // 1-hop expansion
  const expanded = new Set(seedIds);
  for (const e of allLinks) {
    if (seedIds.has(e.source)) expanded.add(e.target);
    if (seedIds.has(e.target)) expanded.add(e.source);
  }

  const filteredNodes = allNodes.filter(n => expanded.has(n.id));
  const filteredLinks = allLinks.filter(e => expanded.has(e.source) && expanded.has(e.target));

  // Degree computation
  const degree: Record<string, number> = {};
  for (const e of filteredLinks) {
    degree[e.source] = (degree[e.source] ?? 0) + 1;
    degree[e.target] = (degree[e.target] ?? 0) + 1;
  }

  // Derive community names where missing
  const communityNodes: Record<number, RawNode[]> = {};
  for (const n of filteredNodes) {
    const c = n.community ?? 0;
    if (!communityNodes[c]) communityNodes[c] = [];
    communityNodes[c].push(n);
  }
  const communityNames: Record<number, string> = {};
  for (const [cStr, cNodes] of Object.entries(communityNodes)) {
    const c = Number(cStr);
    // Prefer existing name from first node that has one
    const existing = cNodes.find(n => n.community_name && n.community_name.trim() && !n.community_name.match(/^(grupo|group)\s*\d+$/i))?.community_name;
    communityNames[c] = existing ?? deriveCommunityName(cNodes);
  }

  // Build content snippet: prefer node.description > node.content > source_file basename
  function contentSnippet(n: RawNode): string {
    if (n.description) return n.description.slice(0, 280);
    if (n.content) return n.content.slice(0, 280);
    // Derive a readable hint from the source_file
    const sf = n.source_file ?? "";
    if (!sf) return "";
    const fname = sf.split("/").pop() ?? sf;
    // Remove extension and numeric prefix, humanize
    return fname.replace(/\.\w+$/, "").replace(/^\d+[-_]/, "").replace(/[-_]/g, " ");
  }

  const communities = new Set(filteredNodes.map(n => n.community ?? 0));

  return NextResponse.json({
    nodes: filteredNodes.map(n => ({
      id: n.id,
      label: n.label,
      community: n.community ?? 0,
      community_name: communityNames[n.community ?? 0] ?? "",
      source_file: n.source_file ?? "",
      content: contentSnippet(n),
      degree: degree[n.id] ?? 0,
    })),
    edges: filteredLinks.map(e => ({
      source: e.source,
      target: e.target,
      relation: e.relation ?? "relacionado",
      weight: e.weight ?? 1,
    })),
    stats: {
      total: filteredNodes.length,
      communities: communities.size,
      edges: filteredLinks.length,
    },
  });
}
