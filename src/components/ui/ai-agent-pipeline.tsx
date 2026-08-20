"use client";

import React, { useState, useId } from "react";

/* ══════════════════════════════════════════════════════════════════
   Neural Orchestration Pipeline — dois modos:

   1. PIPELINE — fan-out/fan-in mostrando fluxos coloridos por
      departamento: Pedido → [Estratégia|Copy|Design|Tráfego] → PMO
      Cada departamento mantém sua cor do início ao fim.

   2. BRAIN — ao clicar num agente, abre visão Obsidian:
      grafo de conhecimento com fios coloridos de projetos ativos
      atravessando os nós relevantes (como arquivos abertos no Obsidian).
   ══════════════════════════════════════════════════════════════════ */

// ── Tipos ──────────────────────────────────────────────────────────

type DeptId = "estrategia" | "copy" | "design" | "trafego";

interface Dept {
  id: DeptId;
  label: string;
  color: string;
  duration: number; // segundos por ciclo do dot
}

interface AgentDef {
  id: string;
  label: string;
  sublabel: string;
  dept: DeptId;
  importance: number; // 1–5
}

interface BrainNode {
  id: string;
  label: string;
}

interface ProjectThread {
  id: string;
  label: string;
  color: string;
  nodeIds: string[];
}

interface BrainData {
  nodes: BrainNode[];
  projects: ProjectThread[];
}

// ── Departamentos ──────────────────────────────────────────────────

const DEPTS: Dept[] = [
  { id: "estrategia", label: "Estratégia",  color: "#4F6BED", duration: 2.4 },
  { id: "copy",       label: "Copy",        color: "#10B981", duration: 1.9 },
  { id: "design",     label: "Design",      color: "#F59E0B", duration: 2.8 },
  { id: "trafego",    label: "Tráfego",     color: "#EC4899", duration: 2.1 },
];

const deptMap = Object.fromEntries(DEPTS.map(d => [d.id, d])) as Record<DeptId, Dept>;

// ── Agentes ────────────────────────────────────────────────────────

const AGENTS: AgentDef[] = [
  { id: "henrique",  label: "Henrique",   sublabel: "mentor",    dept: "estrategia", importance: 5 },
  { id: "copy",      label: "Copywriter", sublabel: "copy",      dept: "copy",       importance: 3 },
  { id: "daniel",    label: "Daniel",     sublabel: "design",    dept: "design",     importance: 4 },
  { id: "trafego",   label: "Tráfego",    sublabel: "ads",       dept: "trafego",    importance: 3 },
];

// ── Cérebro de cada agente ─────────────────────────────────────────

const AGENT_BRAIN: Record<string, BrainData> = {
  henrique: {
    nodes: [
      { id: "3f",     label: "Método 3F"      },
      { id: "ht",     label: "High Ticket"     },
      { id: "funil",  label: "Funil 3C"        },
      { id: "script", label: "Script"          },
      { id: "posic",  label: "Posicionamento"  },
      { id: "objec",  label: "Objeção"         },
      { id: "diag",   label: "Diagnóstico"     },
      { id: "fecha",  label: "Fechamento"      },
    ],
    projects: [
      { id: "pv",   label: "Pág. de Vendas", color: "#10B981", nodeIds: ["funil", "posic", "ht"]        },
      { id: "pide", label: "PIDE",           color: "#4F6BED", nodeIds: ["diag",  "3f",    "fecha"]     },
      { id: "luiz", label: "Script Luiz",    color: "#F59E0B", nodeIds: ["script","objec", "posic"]     },
    ],
  },
  copy: {
    nodes: [
      { id: "head",  label: "Headline"     },
      { id: "aida",  label: "AIDA"         },
      { id: "hook",  label: "Hook"         },
      { id: "cta",   label: "CTA"          },
      { id: "story", label: "Storytelling" },
      { id: "proof", label: "Prova Social" },
      { id: "email", label: "Email"        },
      { id: "objc",  label: "Copy Objeção" },
    ],
    projects: [
      { id: "pv",  label: "Pág. de Vendas", color: "#10B981", nodeIds: ["head", "aida",  "cta",   "proof"] },
      { id: "eml", label: "Seq. Email",     color: "#4F6BED", nodeIds: ["email","hook",  "story"]          },
      { id: "ads", label: "Anúncios",       color: "#EC4899", nodeIds: ["hook", "cta",   "objc"]           },
    ],
  },
  daniel: {
    nodes: [
      { id: "layout", label: "Layout"     },
      { id: "typo",   label: "Tipografia" },
      { id: "color",  label: "Cor"        },
      { id: "ux",     label: "UX"         },
      { id: "brand",  label: "Brand"      },
      { id: "motion", label: "Motion"     },
      { id: "ui",     label: "UI"         },
      { id: "ident",  label: "Identidade" },
    ],
    projects: [
      { id: "pv",    label: "Pág. de Vendas", color: "#10B981", nodeIds: ["layout","ux",    "ui"]               },
      { id: "id",    label: "Identidade",     color: "#F59E0B", nodeIds: ["brand", "color", "typo",  "ident"]   },
      { id: "social",label: "Posts Social",   color: "#EC4899", nodeIds: ["motion","ui",    "layout"]           },
    ],
  },
  trafego: {
    nodes: [
      { id: "meta",   label: "Meta Ads"   },
      { id: "google", label: "Google Ads" },
      { id: "copy",   label: "Copy Ad"    },
      { id: "pub",    label: "Público"    },
      { id: "roas",   label: "ROAS"       },
      { id: "pixel",  label: "Pixel"      },
      { id: "criat",  label: "Criativo"   },
      { id: "funil",  label: "Funil Ads"  },
    ],
    projects: [
      { id: "pv",   label: "Pág. de Vendas", color: "#10B981", nodeIds: ["meta",   "pub",   "criat", "roas"] },
      { id: "rema", label: "Remarketing",    color: "#4F6BED", nodeIds: ["pixel",  "funil", "pub"]           },
      { id: "yt",   label: "YouTube",        color: "#F59E0B", nodeIds: ["google", "criat", "roas"]          },
    ],
  },
};

// ── Geometria do pipeline ─────────────────────────────────────────

const LANE_H   = 50;
const FIRST_Y  = 42;
const SRC_X    = 55;
const DEPT_X   = 195;
const AGT_X    = 365;
const PMO_X    = 510;
const PL_W     = 560;
const PL_H     = DEPTS.length * LANE_H + FIRST_Y * 2;
const CENTER_Y = FIRST_Y + ((DEPTS.length - 1) * LANE_H) / 2;

function laneY(deptId: DeptId): number {
  const idx = DEPTS.findIndex(d => d.id === deptId);
  return FIRST_Y + idx * LANE_H;
}

function motionPath(deptId: DeptId): string {
  const y = laneY(deptId);
  return `M${SRC_X},${CENTER_Y} L${DEPT_X},${y} L${AGT_X},${y} L${PMO_X},${CENTER_Y}`;
}

function nodeR(imp: number) {
  return 5 + (imp / 5) * 9; // 6 → 14
}

// ── Geometria do cérebro ──────────────────────────────────────────

const BCX = 148; // center x
const BCY = 138; // center y
const BRR = 86;  // node orbit radius
const BRAIN_W = 300;
const BRAIN_H = 280;

function brainPos(i: number, total: number) {
  const angle = (2 * Math.PI * i) / total - Math.PI / 2;
  return {
    x: BCX + BRR * Math.cos(angle),
    y: BCY + BRR * Math.sin(angle),
  };
}

function threadCtrl(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = mx - BCX;
  const dy = my - BCY;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  // Push outward from center → arc bow facing outward
  return { x: mx + (dx / d) * 18, y: my + (dy / d) * 18 };
}

function buildThreadPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const c = threadCtrl(pts[i], pts[i + 1]);
    d += ` Q${c.x.toFixed(1)},${c.y.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

// ── Componente principal ──────────────────────────────────────────

export interface AiAgentPipelineProps {
  className?: string;
}

export function AiAgentPipeline({ className }: AiAgentPipelineProps) {
  const uid = useId().replace(/:/g, "");
  const [brainId, setBrainId] = useState<string | null>(null);

  return (
    <div className={className} style={{ width: "100%" }}>
      {brainId == null ? (
        <PipelineView uid={uid} onOpen={setBrainId} />
      ) : (
        <BrainView uid={uid} agentId={brainId} onClose={() => setBrainId(null)} />
      )}
    </div>
  );
}

export default AiAgentPipeline;

// ── Vista: Pipeline ───────────────────────────────────────────────

function PipelineView({ uid, onOpen }: { uid: string; onOpen: (id: string) => void }) {
  return (
    <div>
      <svg
        viewBox={`0 10 ${PL_W} ${PL_H - 10}`}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
        aria-label="Pipeline de orquestração de agentes"
      >
        <defs>
          {DEPTS.map(d => (
            <React.Fragment key={d.id}>
              <filter id={`${uid}-fgw-${d.id}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <radialGradient id={`${uid}-dg-${d.id}`} cx="40%" cy="40%" r="60%">
                <stop offset="0%"   stopColor="#fff"     stopOpacity="0.95" />
                <stop offset="55%"  stopColor={d.color}  stopOpacity="0.9"  />
                <stop offset="100%" stopColor={d.color}  stopOpacity="0.2"  />
              </radialGradient>
              <path id={`${uid}-mp-${d.id}`} d={motionPath(d.id)} />
            </React.Fragment>
          ))}
          <filter id={`${uid}-fgw-pmo`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`${uid}-fgw-src`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Trilhas ─────────────────────────────────────────── */}
        {DEPTS.map(d => {
          const y = laneY(d.id);
          return (
            <g key={d.id}>
              {/* Glow track full path */}
              <path d={motionPath(d.id)} stroke={d.color} strokeWidth="5" fill="none"
                strokeLinecap="round" strokeOpacity="0.1" />
              {/* Lines colored by dept */}
              <line x1={SRC_X}  y1={CENTER_Y} x2={DEPT_X} y2={y}
                stroke={d.color} strokeWidth="1.5" strokeOpacity="0.45" />
              <line x1={DEPT_X} y1={y}        x2={AGT_X}  y2={y}
                stroke={d.color} strokeWidth="1.5" strokeOpacity="0.45" />
              <line x1={AGT_X}  y1={y}        x2={PMO_X}  y2={CENTER_Y}
                stroke={d.color} strokeWidth="1.5" strokeOpacity="0.45" />
            </g>
          );
        })}

        {/* ── Dots animados ───────────────────────────────────── */}
        {DEPTS.map(d => (
          <React.Fragment key={d.id}>
            {/* Lead dot */}
            <circle r="4" fill={`url(#${uid}-dg-${d.id})`} filter={`url(#${uid}-fgw-${d.id})`}>
              <animateMotion dur={`${d.duration}s`} begin="0s" repeatCount="indefinite" calcMode="linear">
                <mpath href={`#${uid}-mp-${d.id}`} />
              </animateMotion>
            </circle>
            {/* Trail dot */}
            <circle r="2.5" fill={`url(#${uid}-dg-${d.id})`} opacity="0.55">
              <animateMotion
                dur={`${d.duration}s`}
                begin={`${-(d.duration * 0.38).toFixed(2)}s`}
                repeatCount="indefinite"
                calcMode="linear"
              >
                <mpath href={`#${uid}-mp-${d.id}`} />
              </animateMotion>
            </circle>
          </React.Fragment>
        ))}

        {/* ── Nó fonte (Pedido) ────────────────────────────────── */}
        <circle cx={SRC_X} cy={CENTER_Y} r="13" fill="#050d1a" stroke="#334155"
          strokeWidth="1.5" filter={`url(#${uid}-fgw-src)`} />
        <circle cx={SRC_X} cy={CENTER_Y} r="4.5" fill="#334155" opacity="0.6" />
        <text x={SRC_X} y={CENTER_Y + 22} textAnchor="middle" fill="#64748b"
          fontSize="8" fontFamily="ui-monospace,monospace">Pedido</text>

        {/* ── Nós de departamento ──────────────────────────────── */}
        {DEPTS.map(d => {
          const y = laneY(d.id);
          return (
            <g key={d.id}>
              <circle cx={DEPT_X} cy={y} r="7.5" fill="#050d1a" stroke={d.color}
                strokeWidth="1.5" filter={`url(#${uid}-fgw-${d.id})`} />
              <text x={DEPT_X} y={y + 18} textAnchor="middle" fill={d.color}
                fontSize="8" fontFamily="ui-monospace,monospace">{d.label}</text>
            </g>
          );
        })}

        {/* ── Nós de agente (clicáveis) ─────────────────────────── */}
        {AGENTS.map(a => {
          const d = deptMap[a.dept];
          const y = laneY(a.dept);
          const r = nodeR(a.importance);
          return (
            <g key={a.id} onClick={() => onOpen(a.id)} style={{ cursor: "pointer" }}>
              {/* Pulse ring */}
              <circle cx={AGT_X} cy={y} r={r + 6} fill="none" stroke={d.color} strokeWidth="0.8">
                <animate attributeName="r"             values={`${r+4};${r+8};${r+4}`}     dur="3s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.22;0.04;0.22"             dur="3s" repeatCount="indefinite" />
              </circle>
              {/* Body */}
              <circle cx={AGT_X} cy={y} r={r} fill="#050d1a" stroke={d.color}
                strokeWidth={a.importance >= 4 ? 2.5 : 1.8} filter={`url(#${uid}-fgw-${a.dept})`} />
              {/* Inner dot for high importance */}
              {a.importance >= 4 && (
                <circle cx={AGT_X} cy={y} r={r * 0.38} fill={d.color} opacity="0.22" />
              )}
              {/* Label */}
              <text x={AGT_X} y={y + r + 12} textAnchor="middle" fill={d.color}
                fontSize="8.5" fontFamily="ui-monospace,monospace" fontWeight="600">{a.label}</text>
              <text x={AGT_X} y={y + r + 21} textAnchor="middle" fill="#334155"
                fontSize="7" fontFamily="ui-monospace,monospace">{a.sublabel}</text>
              {/* Open-brain hint arrow */}
              <text x={AGT_X + r + 5} y={y + 3} fill="#334155"
                fontSize="9" fontFamily="ui-monospace,monospace">⟩</text>
            </g>
          );
        })}

        {/* ── PMO ─────────────────────────────────────────────────── */}
        <circle cx={PMO_X} cy={CENTER_Y} r={20} fill="none" stroke="#3B82F6" strokeWidth="0.8">
          <animate attributeName="r"             values="17;22;17"     dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.45;0.06;0.45" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <circle cx={PMO_X} cy={CENTER_Y} r="15" fill="#050d1a" stroke="#3B82F6"
          strokeWidth="2.5" filter={`url(#${uid}-fgw-pmo)`} />
        <circle cx={PMO_X} cy={CENTER_Y} r="5" fill="#3B82F6" opacity="0.22" />
        <text x={PMO_X} y={CENTER_Y + 4} textAnchor="middle" fill="#3B82F6"
          fontSize="8.5" fontFamily="ui-monospace,monospace" fontWeight="700">PMO</text>
        <text x={PMO_X} y={CENTER_Y + 23} textAnchor="middle" fill="#334155"
          fontSize="7" fontFamily="ui-monospace,monospace">convergência</text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "5px 16px", marginTop: 6, paddingLeft: 2 }}>
        {DEPTS.map(d => (
          <span key={d.id} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "ui-monospace,monospace", fontSize: 9, color: d.color }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: d.color, boxShadow: `0 0 5px ${d.color}`, display: "inline-block", flexShrink: 0 }} />
            {d.label}
          </span>
        ))}
        <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 9, color: "#334155", marginLeft: 4 }}>
          · ⟩ clique no agente para ver o cérebro
        </span>
      </div>
    </div>
  );
}

// ── Vista: Cérebro ────────────────────────────────────────────────

function BrainView({
  uid,
  agentId,
  onClose,
}: {
  uid: string;
  agentId: string;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const agent = AGENTS.find(a => a.id === agentId)!;
  const dept  = deptMap[agent.dept];
  const data  = AGENT_BRAIN[agentId] ?? { nodes: [], projects: [] };

  const positions = data.nodes.map((_, i) => brainPos(i, data.nodes.length));
  const idxOf     = Object.fromEntries(data.nodes.map((n, i) => [n.id, i]));

  // Pre-build SVG path strings for each project thread
  const threadPaths = data.projects.map(p => {
    const pts = p.nodeIds.map(nid => positions[idxOf[nid]]).filter(Boolean);
    return buildThreadPath(pts);
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "1px solid #1e3a5f", color: "#64748b",
            borderRadius: 4, padding: "3px 10px", cursor: "pointer",
            fontFamily: "ui-monospace,monospace", fontSize: 9, letterSpacing: "0.1em",
          }}
        >
          ← pipeline
        </button>
        <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: dept.color, fontWeight: 700 }}>
          {agent.label}
        </span>
        <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 9, color: "#475569" }}>
          · {dept.label} · {data.nodes.length} nós · {data.projects.length} projetos
        </span>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* ── Grafo cerebral ─────────────────────────────────── */}
        <svg
          viewBox={`0 0 ${BRAIN_W} ${BRAIN_H}`}
          style={{ display: "block", flex: "0 0 auto", width: "min(300px, 100%)", overflow: "visible" }}
          aria-label={`Cérebro do ${agent.label}`}
        >
          <defs>
            {data.projects.map((p, pi) => (
              <React.Fragment key={p.id}>
                <filter id={`${uid}-bf-${p.id}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                {/* Named path for animateMotion of traveling dot */}
                {threadPaths[pi] && (
                  <path id={`${uid}-bp-${p.id}`} d={threadPaths[pi]} />
                )}
                {/* Dot gradient */}
                <radialGradient id={`${uid}-bdg-${p.id}`} cx="40%" cy="40%" r="60%">
                  <stop offset="0%"   stopColor="#fff"    stopOpacity="0.95" />
                  <stop offset="60%"  stopColor={p.color} stopOpacity="0.9"  />
                  <stop offset="100%" stopColor={p.color} stopOpacity="0.2"  />
                </radialGradient>
              </React.Fragment>
            ))}
            <filter id={`${uid}-bf-center`} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Arestas de conhecimento neutro (anel adjacente) */}
          {data.nodes.map((_, i) => {
            const next = (i + 1) % data.nodes.length;
            const p1 = positions[i];
            const p2 = positions[next];
            return (
              <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="#1e3a5f" strokeWidth="0.8" strokeOpacity="0.5" />
            );
          })}
          {/* Arestas para o centro (knowledge connections) */}
          {data.nodes.map((_, i) => {
            const p = positions[i];
            return (
              <line key={`c${i}`} x1={p.x} y1={p.y} x2={BCX} y2={BCY}
                stroke="#1e3a5f" strokeWidth="0.5" strokeOpacity="0.25" />
            );
          })}

          {/* Fios de projeto */}
          {data.projects.map((p, pi) => {
            const pts = p.nodeIds.map(nid => positions[idxOf[nid]]).filter(Boolean);
            if (pts.length < 2) return null;
            const isHov = hovered === p.id;
            const opacity = hovered && !isHov ? 0.18 : isHov ? 1 : 0.55;
            const sw      = isHov ? 2.5 : 1.6;
            return (
              <g key={p.id}>
                {/* Glow layer */}
                <path d={threadPaths[pi]} fill="none" stroke={p.color} strokeWidth={sw + 3}
                  strokeOpacity={opacity * 0.25} strokeLinecap="round"
                  filter={`url(#${uid}-bf-${p.id})`} />
                {/* Main thread */}
                <path d={threadPaths[pi]} fill="none" stroke={p.color} strokeWidth={sw}
                  strokeOpacity={opacity} strokeLinecap="round" />
              </g>
            );
          })}

          {/* Dot viajando pelo fio de cada projeto ativo */}
          {data.projects.map((p, pi) => {
            if (!threadPaths[pi]) return null;
            const isHov = hovered === p.id;
            if (hovered && !isHov) return null;
            return (
              <circle key={p.id} r="3.5" fill={`url(#${uid}-bdg-${p.id})`}
                filter={`url(#${uid}-bf-${p.id})`}>
                <animateMotion dur="2.2s" begin="0s" repeatCount="indefinite" calcMode="linear">
                  <mpath href={`#${uid}-bp-${p.id}`} />
                </animateMotion>
              </circle>
            );
          })}

          {/* Nós de conhecimento */}
          {data.nodes.map((n, i) => {
            const pos = positions[i];
            const activeProjects = data.projects.filter(p => p.nodeIds.includes(n.id));
            const isActive = activeProjects.length > 0;
            const activeColor = hovered
              ? (activeProjects.find(p => p.id === hovered)?.color ?? "#1e3a5f")
              : (activeProjects[0]?.color ?? "#1e3a5f");
            const dimmed = hovered && !activeProjects.some(p => p.id === hovered);
            const r = isActive ? 6.5 : 4.5;
            // label above or below based on position
            const labelY = pos.y > BCY ? pos.y + 17 : pos.y - 10;
            return (
              <g key={n.id} opacity={dimmed ? 0.22 : 1} style={{ transition: "opacity 0.15s" }}>
                <circle cx={pos.x} cy={pos.y} r={r} fill="#050d1a" stroke={activeColor}
                  strokeWidth={isActive ? 1.5 : 0.8}
                  filter={isActive ? `url(#${uid}-bf-${activeProjects[0].id})` : undefined} />
                <text x={pos.x} y={labelY} textAnchor="middle"
                  fill={isActive ? activeColor : "#334155"}
                  fontSize="7.5" fontFamily="ui-monospace,monospace"
                  style={{ transition: "fill 0.15s" }}>
                  {n.label}
                </text>
              </g>
            );
          })}

          {/* Nó central do agente */}
          <circle cx={BCX} cy={BCY} r={20} fill="none" stroke={dept.color} strokeWidth="0.8">
            <animate attributeName="r"             values="17;23;17"     dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.45;0.06;0.45" dur="2.6s" repeatCount="indefinite" />
          </circle>
          <circle cx={BCX} cy={BCY} r="15" fill="#050d1a" stroke={dept.color}
            strokeWidth="2.5" filter={`url(#${uid}-bf-center)`} />
          <circle cx={BCX} cy={BCY} r="5.5" fill={dept.color} opacity="0.22" />
          <text x={BCX} y={BCY + 4} textAnchor="middle" fill={dept.color}
            fontSize="9" fontFamily="ui-monospace,monospace" fontWeight="700">
            {agent.label.slice(0, 4)}
          </text>
        </svg>

        {/* ── Painel de projetos (legenda interativa) ────────── */}
        <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{
            fontFamily: "ui-monospace,monospace", fontSize: 8.5, color: "#475569",
            letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 2,
          }}>
            projetos ativos
          </p>

          {data.projects.map((p, pi) => {
            const isHov = hovered === p.id;
            const names = p.nodeIds
              .map(nid => data.nodes.find(n => n.id === nid)?.label)
              .filter(Boolean);
            return (
              <div
                key={p.id}
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  borderLeft: `2px solid ${p.color}`,
                  paddingLeft: 10,
                  opacity: hovered && !isHov ? 0.3 : 1,
                  transition: "opacity 0.15s",
                  cursor: "default",
                }}
              >
                <p style={{ fontFamily: "ui-monospace,monospace", fontSize: 9.5, color: p.color, fontWeight: 700, marginBottom: 3 }}>
                  {p.label}
                </p>
                <p style={{ fontFamily: "ui-monospace,monospace", fontSize: 8, color: "#475569", lineHeight: 1.55 }}>
                  {names.join(" → ")}
                </p>
                {/* Mini-bar dos nós do projeto */}
                <div style={{ display: "flex", gap: 3, marginTop: 5 }}>
                  {names.map((nm, ni) => (
                    <span key={ni} style={{
                      fontFamily: "ui-monospace,monospace", fontSize: 7.5,
                      color: p.color, background: `${p.color}18`,
                      border: `1px solid ${p.color}44`,
                      borderRadius: 3, padding: "1px 5px",
                    }}>
                      {nm}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          <div style={{ borderTop: "1px solid #1e3a5f", paddingTop: 10, marginTop: 4 }}>
            <p style={{ fontFamily: "ui-monospace,monospace", fontSize: 8, color: "#334155", lineHeight: 1.65 }}>
              cada cor = um projeto ativo<br />
              nós iluminados = onde o<br />
              agente aplica o conhecimento<br />
              passe o mouse para isolar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
