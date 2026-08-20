"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export type GNode = {
  id: string; label: string; community: number;
  community_name: string; source_file: string; degree: number;
};
export type GEdge = { source: string; target: string; relation: string; weight: number };
export type GrafoData = {
  nodes: GNode[]; edges: GEdge[];
  stats: { total: number; communities: number; edges: number };
};

const W = 920, H = 540;
const PALETTE = ["#6366F1","#0EA5E9","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316","#84CC16","#06B6D4","#A855F7"];
const col = (c: number) => PALETTE[((c % PALETTE.length) + PALETTE.length) % PALETTE.length];

type Pos = { x: number; y: number };

function simulate(nodes: GNode[], edges: GEdge[]): Pos[] {
  const N = nodes.length;
  if (!N) return [];
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.32;
  const xs = new Float32Array(N), ys = new Float32Array(N);
  const vx = new Float32Array(N), vy = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    xs[i] = cx + R * Math.cos(a) + (Math.random() - 0.5) * 50;
    ys[i] = cy + R * Math.sin(a) + (Math.random() - 0.5) * 50;
  }
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const K_R = 5200, K_S = 0.04, K_C = 0.0025, REST = 80, DAMP = 0.76, DT = 0.62, ITER = 260;
  for (let it = 0; it < ITER; it++) {
    const fx = new Float32Array(N), fy = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = xs[i] - xs[j], dy = ys[i] - ys[j];
        const d2 = Math.max(64, dx * dx + dy * dy), d = Math.sqrt(d2);
        const f = K_R / d2, nx = (dx / d) * f, ny = (dy / d) * f;
        fx[i] += nx; fy[i] += ny; fx[j] -= nx; fy[j] -= ny;
      }
    }
    for (const e of edges) {
      const si = idx.get(e.source), ti = idx.get(e.target);
      if (si == null || ti == null) continue;
      const dx = xs[ti] - xs[si], dy = ys[ti] - ys[si];
      const d = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
      const f = K_S * (d - REST), nx = (dx / d) * f, ny = (dy / d) * f;
      fx[si] += nx; fy[si] += ny; fx[ti] -= nx; fy[ti] -= ny;
    }
    for (let i = 0; i < N; i++) {
      fx[i] += K_C * (cx - xs[i]); fy[i] += K_C * (cy - ys[i]);
      vx[i] = (vx[i] + fx[i] * DT) * DAMP; vy[i] = (vy[i] + fy[i] * DT) * DAMP;
      xs[i] += vx[i] * DT; ys[i] += vy[i] * DT;
    }
  }
  return Array.from({ length: N }, (_, i) => ({ x: xs[i], y: ys[i] }));
}

export default function GrafoConhecimento({ agente }: { agente: string }) {
  const [data, setData] = useState<GrafoData | null>(null);
  const [pos, setPos] = useState<Pos[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<GNode | null>(null);
  const [query, setQuery] = useState("");
  const [filterCom, setFilterCom] = useState<number | null>(null);
  const [vp, setVp] = useState({ tx: 0, ty: 0, s: 1 });
  const pan = useRef<{ x0: number; y0: number; tx0: number; ty0: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/expand/grafo?agente=${encodeURIComponent(agente)}`)
      .then(r => r.json())
      .then((d: GrafoData) => {
        setData(d);
        setPos(simulate(d.nodes, d.edges));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agente]);

  const { visNodes, visEdges, communities } = useMemo(() => {
    if (!data) return { visNodes: [], visEdges: [], communities: [] as [number, string][] };
    const q = query.toLowerCase();
    const vn = data.nodes.filter(n =>
      (filterCom === null || n.community === filterCom) &&
      (!q || n.label.toLowerCase().includes(q) || n.source_file.toLowerCase().includes(q))
    );
    const vnIds = new Set(vn.map(n => n.id));
    const ve = data.edges.filter(e => vnIds.has(e.source) && vnIds.has(e.target));
    const comMap = new Map<number, string>();
    for (const n of data.nodes) {
      if (!comMap.has(n.community)) comMap.set(n.community, n.community_name || `Grupo ${n.community}`);
    }
    const coms: [number, string][] = [...comMap.entries()].slice(0, 8);
    return { visNodes: vn, visEdges: ve, communities: coms };
  }, [data, query, filterCom]);

  const posMap = useMemo(() => {
    if (!data) return new Map<string, Pos>();
    return new Map(data.nodes.map((n, i) => [n.id, pos[i] ?? { x: W / 2, y: H / 2 }]));
  }, [data, pos]);

  const degMax = useMemo(() => data ? Math.max(1, ...data.nodes.map(n => n.degree)) : 1, [data]);
  const rOf = (n: GNode) => 4 + (n.degree / degMax) * 14;

  function onBgDown(e: React.PointerEvent<SVGSVGElement>) {
    if ((e.target as SVGElement).dataset.node) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    pan.current = { x0: e.clientX, y0: e.clientY, tx0: vp.tx, ty0: vp.ty };
  }
  function onBgMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pan.current) return;
    setVp(v => ({ ...v, tx: pan.current!.tx0 + e.clientX - pan.current!.x0, ty: pan.current!.ty0 + e.clientY - pan.current!.y0 }));
  }
  function onBgUp() { pan.current = null; }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    setVp(v => ({ ...v, s: Math.max(0.25, Math.min(4, v.s * factor)) }));
  }

  if (loading) return (
    <div style={{ padding: "24px 0", display: "flex", alignItems: "center", gap: 10, color: "var(--dim)", fontSize: 13 }}>
      <span style={{ animation: "spin 1.2s linear infinite", display: "inline-block" }}>◌</span>
      Carregando grafo de conhecimento...
    </div>
  );

  if (!data || !data.nodes.length) return (
    <p style={{ fontSize: 12.5, color: "var(--dim)", padding: "12px 0" }}>Grafo não disponível para este agente.</p>
  );

  const selNeighbors = sel && data
    ? data.edges
        .filter(e => e.source === sel.id || e.target === sel.id)
        .map(e => e.source === sel.id ? e.target : e.source)
        .slice(0, 10)
        .map(nid => data.nodes.find(n => n.id === nid))
        .filter((n): n is GNode => !!n)
    : [];

  const shortSrc = (sf: string) => {
    const parts = sf.split("/");
    return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : sf;
  };

  return (
    <div>
      {/* Stats + search */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 14 }}>
          {([["total", "nós"], ["edges", "conexões"], ["communities", "comunidades"]] as const).map(([k, l]) => (
            <span key={k} style={{ fontSize: 12, color: "var(--mut)" }}>
              <b style={{ color: "var(--accent)", fontWeight: 800 }}>{data.stats[k as keyof typeof data.stats]}</b> {l}
            </span>
          ))}
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar conceito..."
          style={{ flex: 1, minWidth: 150, fontSize: 12, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--panel-2)", color: "var(--txt)", outline: "none" }}
        />
        <button onClick={() => { setVp({ tx: 0, ty: 0, s: 1 }); setSel(null); }} title="Reset view"
          style={{ fontSize: 13, padding: "5px 9px", borderRadius: 7, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--mut)", cursor: "pointer" }}>
          ⟲
        </button>
      </div>

      {/* Community filter chips */}
      <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
        <button onClick={() => setFilterCom(null)}
          style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 20, border: `1px solid ${filterCom === null ? "var(--accent)" : "var(--line)"}`, background: filterCom === null ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent", color: filterCom === null ? "var(--accent)" : "var(--mut)", cursor: "pointer" }}>
          Todos
        </button>
        {communities.map(([com, name]) => (
          <button key={com} onClick={() => setFilterCom(filterCom === com ? null : com)}
            style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 20, border: `1px solid ${filterCom === com ? col(com) : "var(--line)"}`, background: filterCom === com ? `color-mix(in srgb, ${col(com)} 15%, transparent)` : "transparent", color: filterCom === com ? col(com) : "var(--mut)", cursor: "pointer" }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: col(com), marginRight: 5, verticalAlign: "middle" }} />
            {name.length > 22 ? name.slice(0, 22) + "…" : name}
          </button>
        ))}
      </div>

      {/* Graph SVG */}
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)", background: "color-mix(in srgb, var(--bg) 55%, var(--panel))" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", display: "block", cursor: pan.current ? "grabbing" : "grab", touchAction: "none", userSelect: "none" }}
          onPointerDown={onBgDown}
          onPointerMove={onBgMove}
          onPointerUp={onBgUp}
          onPointerLeave={onBgUp}
          onWheel={onWheel}
        >
          <defs>
            <filter id="gc-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="gc-glow-sm">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <g transform={`translate(${vp.tx} ${vp.ty}) scale(${vp.s})`}>
            {/* Edges */}
            {visEdges.map((e, i) => {
              const sp = posMap.get(e.source), tp = posMap.get(e.target);
              if (!sp || !tp) return null;
              const isAdj = sel && (e.source === sel.id || e.target === sel.id);
              return (
                <line key={i} x1={sp.x} y1={sp.y} x2={tp.x} y2={tp.y}
                  stroke={isAdj ? col(sel!.community) : "var(--line)"}
                  strokeWidth={isAdj ? 1.5 : 0.7}
                  opacity={isAdj ? 0.7 : 0.28}
                />
              );
            })}

            {/* Nodes */}
            {visNodes.map(n => {
              const p = posMap.get(n.id);
              if (!p) return null;
              const r = rOf(n);
              const c = col(n.community);
              const isSel = sel?.id === n.id;
              const isAdj = sel ? selNeighbors.some(nb => nb.id === n.id) : false;
              const showLabel = isSel || isAdj || n.degree >= degMax * 0.45;
              return (
                <g key={n.id} data-node="1" style={{ cursor: "pointer" }}
                  onClick={ev => { ev.stopPropagation(); setSel(isSel ? null : n); }}>
                  {isSel && (
                    <circle cx={p.x} cy={p.y} r={r + 8} fill="none" stroke={c} strokeWidth={1.5} opacity={0.45} />
                  )}
                  <circle cx={p.x} cy={p.y} r={r}
                    fill={`color-mix(in srgb, ${c} ${isSel ? 90 : isAdj ? 75 : 65}%, var(--bg))`}
                    stroke={c} strokeWidth={isSel ? 2.5 : isAdj ? 1.5 : 1}
                    filter={isSel ? "url(#gc-glow)" : isAdj ? "url(#gc-glow-sm)" : undefined}
                    opacity={sel && !isSel && !isAdj ? 0.45 : 1}
                  >
                    <title>{n.label}{n.community_name ? ` · ${n.community_name}` : ""}</title>
                  </circle>
                  {showLabel && (
                    <text x={p.x} y={p.y - r - 5}
                      fill={isSel ? "var(--txt)" : isAdj ? c : "var(--mut)"}
                      fontSize={isSel ? 9.5 : 8}
                      fontWeight={isSel ? 700 : 400}
                      textAnchor="middle"
                      style={{ pointerEvents: "none" }}
                    >
                      {n.label.length > 30 ? n.label.slice(0, 30) + "…" : n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 9.5, color: "var(--dim)", pointerEvents: "none" }}>
          Arraste · roda = zoom · clique num nó para explorar
        </div>
      </div>

      {/* Selected node detail */}
      {sel && (
        <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", marginTop: 10, borderLeft: `3px solid ${col(sel.community)}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", lineHeight: 1.35, marginBottom: 6 }}>{sel.label}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: `color-mix(in srgb, ${col(sel.community)} 15%, transparent)`, color: col(sel.community), fontWeight: 600 }}>
                  {sel.community_name || `Comunidade ${sel.community}`}
                </span>
                <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb, var(--txt) 8%, transparent)", color: "var(--mut)" }}>
                  {sel.degree} conexões
                </span>
              </div>
            </div>
            <button onClick={() => setSel(null)}
              style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 4px", fontFamily: "inherit" }}>
              ✕
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "monospace", marginBottom: selNeighbors.length ? 10 : 0 }}>
            {shortSrc(sel.source_file)}
          </div>

          {selNeighbors.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "var(--mut)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Nós conectados:</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {selNeighbors.map(nb => (
                  <button key={nb.id} onClick={() => setSel(nb)}
                    style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, border: `1px solid ${col(nb.community)}`, background: "transparent", color: col(nb.community), cursor: "pointer" }}>
                    {nb.label.length > 28 ? nb.label.slice(0, 28) + "…" : nb.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
