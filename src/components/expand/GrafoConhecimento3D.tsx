"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

export type GNode = {
  id: string; label: string; community: number; community_name: string;
  source_file: string; content: string; degree: number;
};
export type GEdge = { source: string; target: string; relation: string; weight: number };
export type GrafoData = {
  nodes: GNode[]; edges: GEdge[];
  stats: { total: number; communities: number; edges: number };
};

const PALETTE = [
  "#6366F1","#0EA5E9","#10B981","#F59E0B","#EF4444",
  "#8B5CF6","#EC4899","#14B8A6","#F97316","#84CC16","#06B6D4","#A855F7",
];
const col = (c: number) => PALETTE[((c % PALETTE.length) + PALETTE.length) % PALETTE.length];

type V3 = { x: number; y: number; z: number };

// Fibonacci sphere — distribui N pontos uniformemente em uma esfera
function fibSphere(n: number, R: number): V3[] {
  const pts: V3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push({ x: r * Math.cos(theta) * R, y: y * R, z: r * Math.sin(theta) * R });
  }
  return pts;
}

// Rotação em torno dos eixos X e Y
function rotate(v: V3, rx: number, ry: number): V3 {
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  // Y axis
  const x1 = v.x * cosY + v.z * sinY;
  const z1 = -v.x * sinY + v.z * cosY;
  // X axis
  const y2 = v.y * cosX - z1 * sinX;
  const z2 = v.y * sinX + z1 * cosX;
  return { x: x1, y: y2, z: z2 };
}

// Projeção perspectiva 3D → 2D
function project(v: V3, perspective: number, cx: number, cy: number, zoom: number): { sx: number; sy: number; scale: number } {
  const depth = perspective + v.z;
  const scale = (perspective / Math.max(50, depth)) * zoom;
  return { sx: cx + v.x * scale, sy: cy + v.y * scale, scale };
}

type ContentSection = { heading: string; body: string; level: number };

export default function GrafoConhecimento3D({
  agente,
  activeTopics,
}: {
  agente: string;
  activeTopics?: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<GrafoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<GNode | null>(null);
  const [filterCom, setFilterCom] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  // Content fetched from knowledge-graph file when a node is selected
  const [nodeContent, setNodeContent] = useState<{ raw?: string; sections?: ContentSection[]; error?: string } | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0]));

  // Event-driven active topics from chat
  const [eventTopics, setEventTopics] = useState<string[]>([]);
  const topicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effective active topics: event-driven overrides prop
  const effectiveTopics = useMemo(
    () => (eventTopics.length ? eventTopics : (activeTopics ?? [])),
    [eventTopics, activeTopics]
  );

  // Listen for chat → graph activation events
  useEffect(() => {
    const handle = (e: Event) => {
      const topics = (e as CustomEvent<{ topics: string[] }>).detail?.topics ?? [];
      setEventTopics(topics);
      if (topicTimerRef.current) clearTimeout(topicTimerRef.current);
      topicTimerRef.current = setTimeout(() => setEventTopics([]), 10000);
    };
    window.addEventListener("grafo:activar", handle);
    return () => window.removeEventListener("grafo:activar", handle);
  }, []);

  // Rotation state
  const rotRef = useRef({ x: 0.3, y: 0.5 });
  const zoomRef = useRef(1);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const animRef = useRef(0);
  const timeRef = useRef(0);

  // Node 3D positions (index-aligned with data.nodes)
  const pos3dRef = useRef<V3[]>([]);
  const selRef = useRef<GNode | null>(null);
  selRef.current = sel;

  // Load graph data
  useEffect(() => {
    setLoading(true);
    fetch(`/api/expand/grafo?agente=${encodeURIComponent(agente)}`)
      .then(r => r.json())
      .then((d: GrafoData) => {
        setData(d);
        // Assign 3D positions — nodes grouped by community cluster
        const R = 200;
        const basePositions = fibSphere(d.nodes.length, R);
        // Sort by community so nearby communities cluster
        const sorted = [...d.nodes.map((n, i) => ({ n, i }))].sort((a, b) => a.n.community - b.n.community);
        const result: V3[] = new Array(d.nodes.length);
        sorted.forEach(({ i }, si) => {
          // Add small jitter based on community
          const base = basePositions[si];
          const jitter = 20;
          result[i] = {
            x: base.x + (Math.random() - 0.5) * jitter,
            y: base.y + (Math.random() - 0.5) * jitter,
            z: base.z + (Math.random() - 0.5) * jitter,
          };
        });
        pos3dRef.current = result;
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [agente]);

  // Fetch full content from knowledge-graph file when a node is selected
  useEffect(() => {
    if (!sel?.source_file) { setNodeContent(null); return; }
    setLoadingContent(true);
    setOpenSections(new Set([0]));
    fetch(`/api/expand/grafo/content?path=${encodeURIComponent(sel.source_file)}`)
      .then((r) => r.json())
      .then((d) => setNodeContent(d))
      .catch(() => setNodeContent(null))
      .finally(() => setLoadingContent(false));
  }, [sel?.source_file]);

  // Canvas drawing loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const perspective = 500;
    const rot = rotRef.current;
    const zoom = zoomRef.current;
    const t = (timeRef.current += 0.018);

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Compute visible nodes
    const q = query.toLowerCase();
    const activeSet = new Set(
      effectiveTopics.flatMap(topic =>
        data.nodes.filter(n => n.label.toLowerCase().includes(topic.toLowerCase()) ||
          n.community_name.toLowerCase().includes(topic.toLowerCase())).map(n => n.id)
      )
    );

    const visIdx = data.nodes
      .map((n, i) => ({ n, i }))
      .filter(({ n }) =>
        (filterCom === null || n.community === filterCom) &&
        (!q || n.label.toLowerCase().includes(q) || n.community_name.toLowerCase().includes(q))
      );

    // Project all nodes to screen
    const projected = pos3dRef.current.map(v => {
      const rv = rotate(v, rot.x, rot.y);
      return { ...project(rv, perspective, cx, cy, zoom), z: rv.z };
    });

    // Sort edges + nodes by z (painter's algorithm — back to front)
    const selId = selRef.current?.id;

    // Draw edges
    const edgeIdxSet = new Set(visIdx.map(vi => vi.i));
    for (const e of data.edges) {
      const si = data.nodes.findIndex(n => n.id === e.source);
      const ti = data.nodes.findIndex(n => n.id === e.target);
      if (si < 0 || ti < 0) continue;
      if (!edgeIdxSet.has(si) || !edgeIdxSet.has(ti)) continue;
      const sp = projected[si], tp = projected[ti];
      const isAdj = selId && (e.source === selId || e.target === selId);
      const isBoth = activeSet.has(e.source) && activeSet.has(e.target);
      ctx.beginPath();
      ctx.moveTo(sp.sx, sp.sy);
      ctx.lineTo(tp.sx, tp.sy);
      if (isBoth) {
        ctx.strokeStyle = `rgba(99,102,241,${0.4 + 0.2 * Math.sin(t * 2)})`;
        ctx.lineWidth = 1.2;
      } else if (isAdj) {
        const c = col(data.nodes[si].community);
        ctx.strokeStyle = c + "99";
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = "rgba(128,128,128,0.13)";
        ctx.lineWidth = 0.6;
      }
      ctx.stroke();
    }

    // Sort nodes back-to-front
    const sortedNodes = visIdx.slice().sort((a, b) => projected[a.i].z - projected[b.i].z);

    // Degree max for sizing
    const degMax = Math.max(1, ...data.nodes.map(n => n.degree));

    for (const { n, i } of sortedNodes) {
      const { sx, sy, scale } = projected[i];
      const r = (4 + (n.degree / degMax) * 14) * scale * 0.85;
      const c = col(n.community);
      const isSel = n.id === selId;
      const isActive = activeSet.has(n.id);
      const isAdj = selId ? data.edges.some(e => (e.source === selId && e.target === n.id) || (e.target === selId && e.source === n.id)) : false;

      // Glow for active (neuron firing)
      if (isActive) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i * 0.7);
        ctx.save();
        ctx.shadowColor = c;
        ctx.shadowBlur = 18 + pulse * 14;
        ctx.beginPath();
        ctx.arc(sx, sy, r * (1.2 + pulse * 0.25), 0, Math.PI * 2);
        ctx.fillStyle = c + "55";
        ctx.fill();
        ctx.restore();
      }

      // Glow for selected
      if (isSel) {
        ctx.save();
        ctx.shadowColor = c;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 5 * scale, 0, Math.PI * 2);
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      const alpha = selId && !isSel && !isAdj && !isActive ? 0.35 : 1;
      ctx.fillStyle = c + (alpha < 1 ? "59" : isSel ? "EE" : isActive ? "DD" : "AA");
      ctx.strokeStyle = c;
      ctx.lineWidth = isSel ? 2 : isActive ? 1.5 : 0.8;
      ctx.fill();
      ctx.stroke();

      // Label
      const showLabel = isSel || isAdj || isActive || n.degree >= degMax * 0.4;
      if (showLabel && r > 3) {
        ctx.fillStyle = isSel ? "#fff" : isActive ? c : "rgba(200,200,200,0.85)";
        ctx.font = `${isSel ? 700 : 500} ${Math.round(Math.max(8.5, 9.5 * scale))}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillText(
          n.label.length > 28 ? n.label.slice(0, 28) + "…" : n.label,
          sx, sy - r - 4 * scale
        );
      }
    }
  }, [data, query, filterCom, effectiveTopics]);

  // Animation loop
  useEffect(() => {
    if (!data) return;
    const loop = () => {
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [data, draw]);

  // Mouse events
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    rotRef.current = {
      x: rotRef.current.x + dy * 0.005,
      y: rotRef.current.y + dx * 0.005,
    };
    dragRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    zoomRef.current = Math.max(0.3, Math.min(3.5, zoomRef.current * (e.deltaY > 0 ? 0.9 : 1.11)));
  }, []);

  // Click to select node
  const onClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!data || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    const my = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
    const cx = canvasRef.current.width / 2, cy = canvasRef.current.height / 2;
    const rot = rotRef.current;
    const zoom = zoomRef.current;
    const perspective = 500;
    const degMax = Math.max(1, ...data.nodes.map(n => n.degree));

    let closest: GNode | null = null;
    let closestDist = 999;

    const q = query.toLowerCase();
    for (let i = 0; i < data.nodes.length; i++) {
      const n = data.nodes[i];
      if (filterCom !== null && n.community !== filterCom) continue;
      if (q && !n.label.toLowerCase().includes(q) && !n.community_name.toLowerCase().includes(q)) continue;
      const rv = rotate(pos3dRef.current[i], rot.x, rot.y);
      const { sx, sy, scale } = project(rv, perspective, cx, cy, zoom);
      const r = (4 + (n.degree / degMax) * 14) * scale * 0.85;
      const dist = Math.hypot(mx - sx, my - sy);
      if (dist < r + 6 && dist < closestDist) {
        closest = n;
        closestDist = dist;
      }
    }
    setSel(prev => closest?.id === prev?.id ? null : closest);
  }, [data, filterCom, query]);

  // Touch support
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !lastTouchRef.current) return;
    const dx = e.touches[0].clientX - lastTouchRef.current.x;
    const dy = e.touches[0].clientY - lastTouchRef.current.y;
    rotRef.current = { x: rotRef.current.x + dy * 0.005, y: rotRef.current.y + dx * 0.005 };
    lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  // Resize canvas to match container
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current, div = containerRef.current;
      if (!c || !div) return;
      c.width = div.clientWidth * window.devicePixelRatio;
      c.height = 480 * window.devicePixelRatio;
      c.style.width = "100%";
      c.style.height = "480px";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Communities for filter chips
  const communities: [number, string][] = data
    ? [...new Map(data.nodes.map(n => [n.community, n.community_name])).entries()].slice(0, 10)
    : [];

  // Selected node neighbors
  const selNeighbors = sel && data
    ? data.edges
        .filter(e => e.source === sel.id || e.target === sel.id)
        .map(e => ({ edge: e, nid: e.source === sel.id ? e.target : e.source }))
        .map(({ edge, nid }) => ({ node: data.nodes.find(n => n.id === nid), relation: edge.relation }))
        .filter((x): x is { node: GNode; relation: string } => !!x.node)
        .slice(0, 12)
    : [];

  if (loading) return (
    <div style={{ padding: "32px 0", display: "flex", alignItems: "center", gap: 12, color: "var(--dim)", fontSize: 13.5 }}>
      <span style={{ animation: "spin 1.2s linear infinite", display: "inline-block", fontSize: 20 }}>◌</span>
      Construindo grafo neural…
    </div>
  );

  if (!data || !data.nodes.length) return (
    <div style={{ padding: "24px", borderRadius: 12, background: "var(--panel-2)", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--dim)", marginBottom: 8 }}>Grafo não disponível para este agente.</p>
      <p style={{ fontSize: 12, color: "var(--mut)" }}>Alimente o conhecimento do agente para construir o grafo.</p>
    </div>
  );

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 16 }}>
          <span style={{ fontSize: 12.5, color: "var(--mut)" }}><b style={{ color: "var(--accent)", fontWeight: 800 }}>{data.stats.total}</b> nós</span>
          <span style={{ fontSize: 12.5, color: "var(--mut)" }}><b style={{ color: "var(--accent)", fontWeight: 800 }}>{data.stats.edges}</b> conexões</span>
          <span style={{ fontSize: 12.5, color: "var(--mut)" }}><b style={{ color: "var(--accent)", fontWeight: 800 }}>{data.stats.communities}</b> áreas</span>
        </div>
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar conceito…"
          style={{ flex: 1, minWidth: 140, fontSize: 12, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--panel-2)", color: "var(--txt)", outline: "none" }}
        />
        <button onClick={() => { rotRef.current = { x: 0.3, y: 0.5 }; zoomRef.current = 1; setSel(null); }}
          title="Reset"
          style={{ fontSize: 13.5, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--line)", background: "var(--panel-2)", color: "var(--mut)", cursor: "pointer" }}>
          ⟲
        </button>
      </div>

      {/* Community filter chips */}
      <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
        <button onClick={() => setFilterCom(null)}
          style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 20, border: `1px solid ${filterCom === null ? "var(--accent)" : "var(--line)"}`, background: filterCom === null ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent", color: filterCom === null ? "var(--accent)" : "var(--mut)", cursor: "pointer" }}>
          Todas as áreas
        </button>
        {communities.map(([com, name]) => (
          <button key={com} onClick={() => setFilterCom(filterCom === com ? null : com)}
            style={{ fontSize: 10.5, padding: "3px 10px", borderRadius: 20, border: `1px solid ${filterCom === com ? col(com) : "var(--line)"}`, background: filterCom === com ? `color-mix(in srgb, ${col(com)} 15%, transparent)` : "transparent", color: filterCom === com ? col(com) : "var(--mut)", cursor: "pointer" }}>
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: col(com), marginRight: 5, verticalAlign: "middle" }} />
            {name.length > 24 ? name.slice(0, 24) + "…" : name}
          </button>
        ))}
      </div>

      {/* 3D Canvas */}
      <div ref={containerRef} style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--line-2)", background: "radial-gradient(ellipse at center, color-mix(in srgb, var(--panel) 80%, var(--bg)), var(--bg))", position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", cursor: dragRef.current ? "grabbing" : "grab", touchAction: "none" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onClick={onClick}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={() => { lastTouchRef.current = null; }}
        />
        <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 10, color: "var(--dim)", pointerEvents: "none", opacity: 0.6 }}>
          Arraste para girar · scroll = zoom · clique num nó
        </div>
        {effectiveTopics.length > 0 && (
          <div style={{ position: "absolute", top: 10, left: 12, display: "flex", gap: 5, flexWrap: "wrap", pointerEvents: "none" }}>
            {effectiveTopics.slice(0, 4).map((t, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb,var(--accent) 18%,transparent)", color: "var(--accent)", fontWeight: 600, backdropFilter: "blur(4px)", animation: "pulse 2s ease-in-out infinite" }}>
                ⚡ {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Selected node detail */}
      {sel && (
        <div className="hx-glass" style={{ borderRadius: 14, padding: "16px 18px", marginTop: 12, borderLeft: `3px solid ${col(sel.community)}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", lineHeight: 1.3, marginBottom: 6 }}>{sel.label}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: `color-mix(in srgb, ${col(sel.community)} 15%, transparent)`, color: col(sel.community), fontWeight: 600 }}>
                  {sel.community_name}
                </span>
                <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: "color-mix(in srgb, var(--txt) 8%, transparent)", color: "var(--mut)" }}>
                  {sel.degree} conexões
                </span>
              </div>
            </div>
            <button onClick={() => setSel(null)}
              style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>
              ✕
            </button>
          </div>

          {/* Conteúdo: snippet resumido do grafo */}
          {sel.content && !nodeContent ? (
            <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.65, marginBottom: 10, padding: "10px 12px", background: "var(--panel-2)", borderRadius: 8 }}>
              {sel.content}
            </p>
          ) : null}

          {/* Conteúdo completo do arquivo — seções em accordion */}
          {loadingContent ? (
            <div style={{ fontSize: 12, color: "var(--dim)", padding: "8px 0" }}>Carregando conteúdo…</div>
          ) : nodeContent?.sections && nodeContent.sections.length > 0 ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "var(--mut)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>
                Conteúdo do documento ({nodeContent.sections.length} seções):
              </div>
              {nodeContent.sections.map((s, si) => (
                <div key={si} style={{ borderRadius: 8, overflow: "hidden", marginBottom: 4, border: "1px solid var(--line-2)" }}>
                  <button
                    onClick={() => setOpenSections((prev) => {
                      const next = new Set(prev);
                      next.has(si) ? next.delete(si) : next.add(si);
                      return next;
                    })}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", background: openSections.has(si) ? "color-mix(in srgb, var(--accent) 8%, var(--panel-2))" : "var(--panel-2)", border: "none", color: "var(--txt)", cursor: "pointer", fontSize: 12.5, fontWeight: s.level <= 2 ? 700 : 600, textAlign: "left" }}
                  >
                    <span style={{ color: "var(--accent)", fontSize: 10, minWidth: 14 }}>{openSections.has(si) ? "▾" : "▸"}</span>
                    {"  ".repeat(Math.max(0, s.level - 1))}{s.heading}
                  </button>
                  {openSections.has(si) ? (
                    <div style={{ padding: "8px 14px 10px", background: "var(--bg)", fontSize: 12, color: "var(--mut)", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 280, overflowY: "auto" }}>
                      {s.body}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : nodeContent?.error ? (
            <p style={{ fontSize: 11.5, color: "var(--dim)", marginBottom: 10 }}>Arquivo não encontrado no grafo local.</p>
          ) : null}

          {/* Arquivo de origem */}
          {sel.source_file ? (
            <div style={{ fontSize: 11, color: "var(--dim)", fontFamily: "monospace", marginBottom: selNeighbors.length ? 12 : 0, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ opacity: 0.5 }}>📄</span>
              {sel.source_file}
            </div>
          ) : null}

          {/* Nós conectados com relação */}
          {selNeighbors.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "var(--mut)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>Conexões:</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {selNeighbors.map(({ node: nb, relation }) => (
                  <button key={nb.id} onClick={() => setSel(nb)}
                    title={relation}
                    style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${col(nb.community)}`, background: "transparent", color: col(nb.community), cursor: "pointer", transition: "background .15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = `color-mix(in srgb, ${col(nb.community)} 12%, transparent)`)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {nb.label.length > 26 ? nb.label.slice(0, 26) + "…" : nb.label}
                    {relation && relation !== "relacionado" ? <span style={{ opacity: 0.5, marginLeft: 4 }}>· {relation}</span> : null}
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
