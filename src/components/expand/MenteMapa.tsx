"use client";
import { useMemo, useRef, useState } from "react";

export type MenteNode = { id: string; tipo: string; titulo: string; conteudo: string | null; fonte: string | null; href?: string | null };
export type MenteTipo = { k: string; l: string; c: string };

// Mapa mental interativo da "mente do agente": carrossel 3D dos elos (categorias),
// folhas clicáveis que abrem o conteúdo, com rotação (arrastar), zoom (roda/botões) e reset.
export default function MenteMapa({ nodes, tipos, nome }: { nodes: MenteNode[]; tipos: MenteTipo[]; nome: string }) {
  const grupos = useMemo(
    () => tipos.map((t) => ({ ...t, es: nodes.filter((n) => n.tipo === t.k) })).filter((t) => t.es.length),
    [nodes, tipos]
  );

  const [rot, setRot] = useState(0.35);   // rotação do carrossel (radianos)
  const [tilt, setTilt] = useState(0.42); // inclinação (perspectiva) 0=topo .. 1=frontal
  const [zoom, setZoom] = useState(1);
  const [sel, setSel] = useState<MenteNode | null>(null);
  const drag = useRef<{ x: number; y: number; rot: number; tilt: number } | null>(null);

  const cx = 340, cy = 214, R1 = 120, RL = 62, T = grupos.length || 1;

  function onDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, rot, tilt };
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    setRot(drag.current.rot + dx * 0.008);
    setTilt(Math.max(0.12, Math.min(1, drag.current.tilt - dy * 0.004)));
  }
  function onUp() { drag.current = null; }
  function onWheel(e: React.WheelEvent) { setZoom((z) => Math.max(0.55, Math.min(2.6, z - e.deltaY * 0.0012))); }

  // posição 3D de cada elo num anel em torno do eixo vertical, projetado com inclinação
  const hubs = grupos.map((g, i) => {
    const ang = (i / T) * Math.PI * 2 + rot;
    const x3 = Math.cos(ang) * R1, z3 = Math.sin(ang) * R1;
    const depth = (z3 + R1) / (2 * R1); // 0 (fundo) .. 1 (frente)
    return { g, HX: cx + x3, HY: cy + z3 * tilt, depth, scale: 0.62 + depth * 0.75 };
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: sel ? "1fr" : "1fr", gap: 12 }}>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 3, display: "flex", gap: 6 }}>
          {[["＋", () => setZoom((z) => Math.min(2.6, z + 0.2))], ["－", () => setZoom((z) => Math.max(0.55, z - 0.2))], ["↺", () => setRot((r) => r - 0.4)], ["↻", () => setRot((r) => r + 0.4)], ["⟲", () => { setRot(0.35); setTilt(0.42); setZoom(1); setSel(null); }]].map(([l, fn], i) => (
            <button key={i} onClick={fn as () => void} title="ajustar" style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--panel-2)", color: "var(--mut)", cursor: "pointer", fontSize: 14, lineHeight: 1, fontFamily: "inherit" }}>{l as string}</button>
          ))}
        </div>
        <svg viewBox="0 0 680 440" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onWheel={onWheel}
          style={{ width: "100%", display: "block", cursor: drag.current ? "grabbing" : "grab", touchAction: "none", userSelect: "none" }}>
          {/* piso do anel (elipse) para sensação de profundidade */}
          <ellipse cx={cx} cy={cy} rx={R1 * zoom} ry={R1 * tilt * zoom} fill="none" stroke="color-mix(in srgb, var(--accent) 14%, transparent)" strokeWidth={1} />
          <g transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>
            {/* ligações centro→elo, ordenadas do fundo para a frente */}
            {[...hubs].sort((a, b) => a.depth - b.depth).map(({ g, HX, HY, depth, scale }) => {
              const m = Math.min(g.es.length, 6);
              const baseAng = Math.atan2(HY - cy, HX - cx);
              return (
                <g key={g.k} opacity={0.35 + depth * 0.65}>
                  <line x1={cx} y1={cy} x2={HX} y2={HY} stroke="color-mix(in srgb, var(--accent) 45%, var(--line))" strokeWidth={1.4 * scale} />
                  {/* folhas: leque a partir do elo, herdando a profundidade */}
                  {g.es.slice(0, m).map((e, j) => {
                    const spread = Math.min(1.5, 0.5 * Math.max(1, m));
                    const la = baseAng - spread / 2 + (m > 1 ? j * (spread / (m - 1)) : 0);
                    const lx = HX + Math.cos(la) * RL * scale, ly = HY + Math.sin(la) * RL * scale * (0.5 + tilt * 0.5);
                    const on = sel?.id === e.id;
                    return (
                      <g key={e.id} style={{ cursor: "pointer" }} onClick={(ev) => { ev.stopPropagation(); setSel(e); }}>
                        <line x1={HX} y1={HY} x2={lx} y2={ly} stroke={`color-mix(in srgb, ${g.c} 40%, transparent)`} strokeWidth={1.1 * scale} />
                        <circle cx={lx} cy={ly} r={(on ? 7.5 : 5) * scale} fill={g.c} stroke={on ? "var(--txt)" : "transparent"} strokeWidth={1.5}>
                          <title>{e.titulo}</title>
                        </circle>
                      </g>
                    );
                  })}
                  {g.es.length > m ? <text x={HX} y={HY + 26 * scale} fill="var(--dim)" fontSize={8.5 * scale} textAnchor="middle">+{g.es.length - m}</text> : null}
                  {/* elo (hub) clicável — abre o primeiro item do grupo */}
                  <circle cx={HX} cy={HY} r={9 * scale} fill={`color-mix(in srgb, ${g.c} 24%, var(--panel))`} stroke={g.c} strokeWidth={1.6} style={{ cursor: "pointer" }} onClick={(ev) => { ev.stopPropagation(); setSel(g.es[0]); }} />
                  <text x={HX} y={HY - 15 * scale} fill={g.c} fontSize={9.5 * scale} fontWeight={700} textAnchor="middle" style={{ pointerEvents: "none" }}>{g.l.split(" ")[0]} · {g.es.length}</text>
                </g>
              );
            })}
            {/* núcleo */}
            <circle cx={cx} cy={cy} r={26} fill="color-mix(in srgb, var(--accent) 18%, var(--panel))" stroke="var(--accent)" strokeWidth={2} />
            <text x={cx} y={cy} fill="var(--accent)" fontSize={11} fontWeight={800} textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: "none" }}>{nome}</text>
          </g>
        </svg>
        <p style={{ fontSize: 10.5, color: "var(--dim)", textAlign: "center", marginTop: 2 }}>Arraste para girar e inclinar · role para aproximar · clique num ponto para ler</p>
      </div>

      {sel ? (
        <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${tipos.find((t) => t.k === sel.tipo)?.c ?? "var(--accent)"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span className="ex-pill" style={{ background: `color-mix(in srgb, ${tipos.find((t) => t.k === sel.tipo)?.c ?? "var(--accent)"} 16%, transparent)`, color: tipos.find((t) => t.k === sel.tipo)?.c ?? "var(--accent)" }}>{tipos.find((t) => t.k === sel.tipo)?.l ?? sel.tipo}</span>
            <button onClick={() => setSel(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 16, fontFamily: "inherit" }}>✕</button>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", lineHeight: 1.3 }}>{sel.titulo}</div>
          {sel.fonte ? <div style={{ fontSize: 11.5, color: "var(--accent)", marginTop: 2 }}>{sel.fonte}</div> : null}
          {sel.conteudo ? <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, marginTop: 8, maxHeight: 220, overflowY: "auto", whiteSpace: "pre-wrap" }}>{sel.conteudo}</div> : <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>Sem texto — {sel.href ? "abra o arquivo" : "registro sem conteúdo"}.</div>}
          {sel.href ? <a href={sel.href} target="_blank" rel="noreferrer" className="hx-btn hx-btn-ghost" style={{ display: "inline-block", marginTop: 10, padding: "6px 12px", fontSize: 12 }}>Abrir arquivo ↗</a> : null}
        </div>
      ) : null}
    </div>
  );
}
