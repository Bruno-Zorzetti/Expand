"use client";

import React, { useState, useOptimistic, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agendarEtapa, criarEtapaCal } from "@/app/expand/actions";
import { AREAS } from "@/lib/expand-esteira";

// ── Types ─────────────────────────────────────────────────────────────────────
export type Et = {
  id: string; titulo: string; area: string | null;
  responsavel: string | null; responsavel_atual: string | null;
  sla: string | null; status: string; marco: boolean;
  data_prevista: string | null; cliente_id: string;
  iniciada_em: string | null; concluida_em: string | null;
};
export type Cli = { id: string; nome: string };
export type Membro = { id: string; nome: string; papel: string; ini: string };
export type Vista = "agenda" | "semana" | "mes" | "roadmap";

type PanelState =
  | { kind: "task"; et: Et }
  | { kind: "day"; date: Date }
  | { kind: "new"; date: string }
  | null;

// ── Constants ─────────────────────────────────────────────────────────────────
const TIPO_COR: Record<string, string> = {
  reuniao: "#4A90E2", lembrete: "#F5A623", mensagem: "#9B59B6",
  gravacao: "#E74C3C", report: "#2ECC71", ligacao: "#1ABC9C", proposta: "#E67E22",
};
const TIPOS = [
  { v: "reuniao", l: "Reunião" }, { v: "lembrete", l: "Lembrete" },
  { v: "mensagem", l: "Mensagem" }, { v: "gravacao", l: "Gravação" },
  { v: "report", l: "Report" }, { v: "ligacao", l: "Ligação" },
  { v: "proposta", l: "Proposta" },
];
const TIPOS_COM_HORA = new Set(["reuniao", "gravacao", "ligacao"]);
const DIAS_ABR = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIAS_MIN = ["S", "T", "Q", "Q", "S", "S", "D"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MESES_ABR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const STATUS_COR: Record<string, string> = {
  run: "var(--green)", wait: "#D9A94E", idle: "var(--dim)", late: "var(--red)", done: "#3B82F6",
};
const STATUS_L: Record<string, string> = {
  run: "Em execução", wait: "Aguardando", idle: "Na fila", late: "Atrasada", done: "Concluída",
};

// ── Date helpers ──────────────────────────────────────────────────────────────
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parseDate = (s: string) => { const d = new Date(s+"T00:00:00"); d.setHours(0,0,0,0); return d; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const monday = (d: Date) => addDays(d, -((d.getDay()+6)%7));
const elapsedMin = (iso: string | null) => {
  if (!iso) return null;
  const min = Math.round((Date.now()-new Date(iso).getTime())/60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min/60), m = min%60;
  if (h < 24) return `${h}h${m?`${m}m`:""}`;
  return `${Math.floor(h/24)}d${h%24?` ${h%24}h`:""}`;
};
const slaParaDias = (sla: string | null) => {
  if (!sla) return 1;
  const md = sla.toLowerCase().match(/(\d+)\s*dia/); if (md) return Number(md[1]);
  const mh = sla.toLowerCase().match(/(\d+)\s*h/); if (mh) return Math.max(1,Math.ceil(Number(mh[1])/8));
  return 1;
};

// ── Color helpers ─────────────────────────────────────────────────────────────
const areaCor = (area: string | null, marco: boolean): string => {
  if (marco) return "var(--accent)";
  if (!area) return "var(--dim)";
  if (TIPO_COR[area]) return TIPO_COR[area];
  return AREAS[area]?.cor ?? "var(--dim)";
};
const areaLabel = (area: string | null): string => {
  if (!area) return "";
  if (TIPOS.find(t=>t.v===area)) return TIPOS.find(t=>t.v===area)!.l;
  return AREAS[area]?.n ?? area;
};

// ── CSS styles ────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes planPulse { 0%,100%{opacity:1} 50%{opacity:.2} }
  .plan-pulse { display:inline-block;width:7px;height:7px;border-radius:50%;animation:planPulse 1.6s ease-in-out infinite;vertical-align:middle; }
  .plan-overlay { position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:900;opacity:0;pointer-events:none;transition:opacity .22s; }
  .plan-overlay.open { opacity:1;pointer-events:all; }
  .plan-panel { position:fixed;top:0;right:0;width:min(400px,94vw);height:100vh;background:var(--bg);border-left:1px solid var(--line-2);box-shadow:-16px 0 48px rgba(0,0,0,.22);z-index:901;overflow-y:auto;padding:24px;transform:translateX(100%);transition:transform .26s cubic-bezier(.4,0,.2,1); }
  .plan-panel.open { transform:translateX(0); }
  .plan-task-card { display:flex;align-items:center;gap:10px;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:10px 13px;margin-bottom:7px;cursor:pointer;transition:border-color .12s,box-shadow .12s;user-select:none; }
  .plan-task-card:hover { border-color:var(--accent);box-shadow:0 2px 12px rgba(0,0,0,.12); }
  .plan-task-card.dragging { opacity:.4; }
  .plan-dz-active { outline:2px dashed var(--accent)!important;outline-offset:-2px;background:color-mix(in srgb,var(--accent) 6%,transparent)!important; }
  .plan-week-col { border-radius:10px;border:1px solid var(--line);background:var(--bg);min-height:140px;flex:1;min-width:0;transition:border-color .12s; }
  .plan-week-col.hoje { border-color:var(--accent); }
  .plan-week-col.dz-over { border-color:var(--accent);background:color-mix(in srgb,var(--accent) 5%,var(--bg)); }
  .plan-mes-cell { border-radius:8px;border:1px solid var(--line);background:var(--bg);min-height:80px;padding:5px;cursor:pointer;transition:border-color .12s; }
  .plan-mes-cell:hover { border-color:var(--accent); }
  .plan-mes-cell.hoje { border-color:var(--accent);box-shadow:0 0 0 1px var(--accent); }
  .plan-mes-cell.out { opacity:.18;pointer-events:none; }
  .plan-agenda-date { font-size:28px;font-weight:900;line-height:1;color:var(--accent); }
  .plan-sidebar-card { background:var(--panel-2);border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:12px; }
  .plan-tab { font-size:12px;font-weight:600;padding:5px 13px;border-radius:7px;border:none;cursor:pointer;transition:all .15s;font-family:inherit; }
  .plan-tab.active { background:var(--accent);color:#fff; }
  .plan-tab:not(.active) { background:transparent;color:var(--dim); }
  @media(max-width:860px) { .plan-layout{flex-direction:column!important} .plan-sidebar{width:100%!important} }
  @media(max-width:640px) { .plan-week-grid{grid-template-columns:1fr!important} .plan-panel{width:100%!important;top:0;padding:16px} }
`;

// ── MiniCalendar ──────────────────────────────────────────────────────────────
function MiniCalendar({ anchor, etapas, hojeS, onDayClick }: {
  anchor: Date; etapas: Et[]; hojeS: string; onDayClick: (d: Date) => void;
}) {
  const [mini, setMini] = useState(new Date(anchor));
  const ini = new Date(mini.getFullYear(), mini.getMonth(), 1);
  const g0 = monday(ini);
  const dias: Date[] = [];
  let cur = g0;
  while (cur.getMonth() <= mini.getMonth() || dias.length < 35) {
    dias.push(cur); cur = addDays(cur, 1); if (dias.length >= 42) break;
  }
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
        <button onClick={()=>setMini(new Date(mini.getFullYear(),mini.getMonth()-1,1))} style={ICON_BTN}>‹</button>
        <span style={{ fontSize:12,fontWeight:700,color:"var(--txt)" }}>{MESES_ABR[mini.getMonth()]} {mini.getFullYear()}</span>
        <button onClick={()=>setMini(new Date(mini.getFullYear(),mini.getMonth()+1,1))} style={ICON_BTN}>›</button>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,fontSize:10,textAlign:"center" }}>
        {DIAS_MIN.map((d,i)=><div key={i} style={{ color:"var(--dim)",fontWeight:700,paddingBottom:3 }}>{d}</div>)}
        {dias.map((d)=>{
          const ds=ymd(d);
          const isToday=ds===hojeS;
          const isAnchor=ds===ymd(anchor);
          const inMonth=d.getMonth()===mini.getMonth();
          const hasEvt=etapas.some(e=>e.data_prevista===ds);
          return (
            <div key={ds} onClick={()=>onDayClick(d)} style={{
              padding:"3px 1px",borderRadius:4,cursor:"pointer",position:"relative",transition:"background .1s",
              background:isAnchor?"var(--accent)":isToday?"color-mix(in srgb,var(--accent) 15%,transparent)":"transparent",
              color:isAnchor?"#fff":!inMonth?"transparent":isToday?"var(--accent)":"var(--txt)",
              fontWeight:isToday||isAnchor?800:400,
            }}>
              {inMonth?d.getDate():""}
              {hasEvt&&!isAnchor&&inMonth&&(
                <div style={{ width:3,height:3,borderRadius:"50%",background:isToday?"#fff":"var(--accent)",position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)" }}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ICON_BTN: React.CSSProperties = {
  background:"none",border:"none",color:"var(--dim)",cursor:"pointer",fontSize:16,padding:"2px 6px",borderRadius:4,lineHeight:1,
};

// ── TaskChip (compact, for month view) ───────────────────────────────────────
function TaskChip({ e, nomeCli, draggingId, onDragStart, onDragEnd, onClick }: {
  e: Et; nomeCli: Record<string,string>; draggingId: string|null;
  onDragStart:(id:string)=>void; onDragEnd:()=>void; onClick:(e:Et)=>void;
}) {
  const cor = areaCor(e.area, e.marco);
  const run = e.status === "run";
  return (
    <div draggable
      onDragStart={ev=>{ev.dataTransfer.setData("etapaId",e.id);onDragStart(e.id);}}
      onDragEnd={onDragEnd}
      onClick={ev=>{ev.stopPropagation();onClick(e);}}
      title={`${e.titulo} — ${nomeCli[e.cliente_id]??""}`}
      style={{
        borderLeft:`3px solid ${cor}`,background:draggingId===e.id?"var(--line)":run?`color-mix(in srgb,${cor} 15%,var(--panel-2))`:"var(--panel-2)",
        borderRadius:"0 5px 5px 0",padding:"2px 6px",marginBottom:2,fontSize:11,lineHeight:1.35,
        color:"var(--txt)",cursor:"grab",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",
        opacity:draggingId===e.id?0.4:1,userSelect:"none",
      }}>
      {run&&<span className="plan-pulse" style={{ background:cor,marginRight:4 }}/>}
      {e.marco&&<span style={{ color:"var(--accent)",marginRight:3 }}>◆</span>}
      {e.titulo}
    </div>
  );
}

// ── TaskCard (week / agenda view) ─────────────────────────────────────────────
function TaskCard({ e, nomeCli, draggingId, onDragStart, onDragEnd, onClick }: {
  e: Et; nomeCli: Record<string,string>; draggingId: string|null;
  onDragStart:(id:string)=>void; onDragEnd:()=>void; onClick:(e:Et)=>void;
}) {
  const cor = areaCor(e.area, e.marco);
  const run = e.status === "run";
  return (
    <div draggable
      className={`plan-task-card${draggingId===e.id?" dragging":""}`}
      onDragStart={ev=>{ev.dataTransfer.setData("etapaId",e.id);onDragStart(e.id);}}
      onDragEnd={onDragEnd}
      onClick={()=>onClick(e)}
      style={{ borderLeft:`3px solid ${cor}` }}>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:12.5,fontWeight:700,color:"var(--txt)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2 }}>
          {run&&<span className="plan-pulse" style={{ background:cor,marginRight:5 }}/>}
          {e.marco&&<span style={{ color:"var(--accent)",marginRight:4 }}>◆</span>}
          {e.titulo}
        </div>
        <div style={{ fontSize:10.5,color:"var(--dim)" }}>
          {nomeCli[e.cliente_id]??"—"}
          {e.area?` · ${areaLabel(e.area)}`:""}
          {run&&e.iniciada_em?<span style={{ color:cor }}>{` · ⏱${elapsedMin(e.iniciada_em)}`}</span>:null}
        </div>
      </div>
      {e.sla&&<span style={{ fontSize:10,color:"var(--dim)",flexShrink:0 }}>{e.sla}</span>}
    </div>
  );
}

// ── DetailPanel ───────────────────────────────────────────────────────────────
function DetailPanel({ e, nomeCli, onClose, onReschedule }: {
  e: Et; nomeCli: Record<string,string>; onClose:()=>void;
  onReschedule:(id:string,date:string)=>void;
}) {
  const cor = areaCor(e.area, e.marco);
  const run = e.status==="run";
  const [dateVal, setDateVal] = useState(e.data_prevista??"");
  const label = areaLabel(e.area);
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
        {label&&(
          <span style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:cor,background:`color-mix(in srgb,${cor} 14%,transparent)`,padding:"3px 9px",borderRadius:20 }}>{label}</span>
        )}
        <button onClick={onClose} style={{ marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"var(--dim)",fontSize:18,padding:4,lineHeight:1 }}>✕</button>
      </div>
      <div style={{ fontSize:19,fontWeight:900,color:"var(--txt)",lineHeight:1.2,marginBottom:14 }}>
        {e.marco&&<span style={{ color:"var(--accent)" }}>◆ </span>}{e.titulo}
      </div>
      <div style={{ display:"inline-flex",alignItems:"center",gap:7,background:run?`color-mix(in srgb,${cor} 14%,transparent)`:"var(--panel-2)",border:`1px solid ${run?cor:"var(--line)"}`,borderRadius:20,padding:"5px 12px",fontSize:11.5,color:run?cor:"var(--txt)",fontWeight:700,marginBottom:20 }}>
        {run&&<span className="plan-pulse" style={{ background:cor }}/>}
        {run?`Em execução · ${elapsedMin(e.iniciada_em)??"?"}`:STATUS_L[e.status]??"Fila"}
      </div>
      {([ ["Cliente",nomeCli[e.cliente_id]??"—"] as [string,string], ...(e.area?[["Área",label] as [string,string]]:[]), ...(e.sla?[["SLA",e.sla] as [string,string]]:[]), ...((e.responsavel_atual||e.responsavel)?[["Responsável",(e.responsavel_atual??e.responsavel)!] as [string,string]]:[]) ]).map(([l,v])=>(
        <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid var(--line)",fontSize:12.5,gap:12 }}>
          <span style={{ color:"var(--dim)",flexShrink:0 }}>{l}</span>
          <span style={{ color:"var(--txt)",fontWeight:600,textAlign:"right" }}>{v}</span>
        </div>
      ))}
      <div style={{ margin:"20px 0",padding:14,background:"var(--panel-2)",borderRadius:12,border:"1px solid var(--line)" }}>
        <div style={{ fontSize:10.5,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:10 }}>Data prevista</div>
        <div style={{ display:"flex",gap:6 }}>
          <input type="date" value={dateVal} onChange={ev=>setDateVal(ev.target.value)}
            style={{ flex:1,background:"var(--bg)",border:"1px solid var(--line)",borderRadius:8,color:"var(--txt)",padding:"7px 10px",fontSize:12.5,outline:"none",colorScheme:"dark" }}/>
          <button onClick={()=>{onReschedule(e.id,dateVal);onClose();}}
            style={{ background:"var(--accent)",color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",fontSize:13,cursor:"pointer",fontWeight:700 }}>Salvar</button>
        </div>
        {e.data_prevista&&(
          <button onClick={()=>{onReschedule(e.id,"");onClose();}}
            style={{ background:"none",border:"none",color:"var(--dim)",fontSize:11,cursor:"pointer",marginTop:8,padding:0 }}>✕ Remover data</button>
        )}
      </div>
      <Link href={`/expand/etapa/${e.id}`}
        style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",background:"var(--accent)",color:"#fff",borderRadius:12,textDecoration:"none",fontWeight:700,fontSize:13.5 }}>
        Ver etapa completa
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </Link>
    </div>
  );
}

// ── DayPanel ──────────────────────────────────────────────────────────────────
function DayPanel({ date, etapas, nomeCli, draggingId, onDragStart, onDragEnd, onTaskClick, onNewTask, onClose }: {
  date: Date; etapas: Et[]; nomeCli: Record<string,string>; draggingId: string|null;
  onDragStart:(id:string)=>void; onDragEnd:()=>void;
  onTaskClick:(e:Et)=>void; onNewTask:(d:string)=>void; onClose:()=>void;
}) {
  const ds = ymd(date);
  const its = etapas.filter(e=>e.data_prevista===ds);
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
        <div>
          <div style={{ fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"var(--dim)" }}>{DIAS_ABR[(date.getDay()+6)%7]}</div>
          <div className="plan-agenda-date">{date.getDate()}</div>
          <div style={{ fontSize:12,color:"var(--dim)" }}>{MESES[date.getMonth()]} {date.getFullYear()}</div>
        </div>
        <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--dim)",fontSize:18,padding:4,lineHeight:1 }}>✕</button>
      </div>
      <button onClick={()=>onNewTask(ds)}
        style={{ display:"flex",alignItems:"center",gap:8,width:"100%",background:"var(--panel-2)",border:"1px dashed var(--accent)",borderRadius:10,padding:"9px 14px",color:"var(--accent)",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:16,boxSizing:"border-box" }}>
        <span style={{ fontSize:18,lineHeight:1 }}>+</span> Nova tarefa neste dia
      </button>
      {its.length===0?(
        <div style={{ textAlign:"center",color:"var(--dim)",fontSize:13,padding:"32px 0" }}>Nenhuma tarefa agendada.</div>
      ):(
        <>
          <div style={{ fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--dim)",marginBottom:10 }}>{its.length} tarefa{its.length!==1?"s":""}</div>
          {its.map(e=><TaskCard key={e.id} e={e} nomeCli={nomeCli} draggingId={draggingId} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onTaskClick}/>)}
        </>
      )}
    </div>
  );
}

// ── NewTaskForm ───────────────────────────────────────────────────────────────
function NewTaskForm({ date, clientes, equipe, membroNome, onClose, onCreate }: {
  date: string; clientes: Cli[]; equipe: Membro[]; membroNome: string; onClose:()=>void;
  onCreate:(tipo:string,titulo:string,clienteId:string,date:string,hi:string,hf:string,obs:string,participantes:string[])=>void;
}) {
  const [tipo, setTipo] = useState("reuniao");
  const [titulo, setTitulo] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [emailFree, setEmailFree] = useState("");
  const [dateVal, setDateVal] = useState(date);
  const [hi, setHi] = useState("09:00");
  const [hf, setHf] = useState("10:00");
  const [obs, setObs] = useState("");
  const [participantes, setParticipantes] = useState<string[]>([membroNome].filter(Boolean));
  const cor = TIPO_COR[tipo]??"var(--accent)";
  const isExclusive = tipo==="reuniao"||tipo==="gravacao";
  const inp: React.CSSProperties = { width:"100%",background:"var(--bg)",border:"1px solid var(--line)",borderRadius:8,color:"var(--txt)",padding:"8px 11px",fontSize:13,outline:"none",boxSizing:"border-box",colorScheme:"dark",fontFamily:"inherit" };

  const toggleParticipante = (nome: string) => {
    setParticipantes(prev => prev.includes(nome) ? prev.filter(p=>p!==nome) : [...prev, nome]);
  };

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
        <div style={{ fontSize:16,fontWeight:800,color:"var(--txt)" }}>Nova tarefa</div>
        <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--dim)",fontSize:18,padding:4,lineHeight:1 }}>✕</button>
      </div>

      {/* Tipo */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10.5,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:8 }}>Tipo</div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
          {TIPOS.map(t=>{
            const tc=TIPO_COR[t.v];
            const sel=tipo===t.v;
            const excl=t.v==="reuniao"||t.v==="gravacao";
            return (
              <button key={t.v} onClick={()=>setTipo(t.v)}
                style={{ fontSize:11.5,padding:"5px 12px",borderRadius:20,border:`1px solid ${sel?tc:"var(--line)"}`,background:sel?`color-mix(in srgb,${tc} 14%,transparent)`:"transparent",color:sel?tc:"var(--dim)",cursor:"pointer",fontWeight:sel?700:400,transition:"all .12s",fontFamily:"inherit",position:"relative" }}>
                {t.l}
                {excl&&<span title="Bloqueia o horário" style={{ fontSize:8,marginLeft:4,opacity:.7 }}>🔒</span>}
              </button>
            );
          })}
        </div>
        {isExclusive&&(
          <div style={{ fontSize:11,color:cor,marginTop:6,display:"flex",alignItems:"center",gap:4 }}>
            🔒 Este tipo bloqueia o horário do colaborador
          </div>
        )}
      </div>

      {/* Título */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:10.5,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:6 }}>Título</div>
        <input type="text" value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Descreva a tarefa..." style={inp} autoFocus/>
      </div>

      {/* Cliente (opcional) */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:10.5,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:6 }}>Cliente <span style={{ fontWeight:400,color:"var(--mut)",textTransform:"none",letterSpacing:0 }}>(opcional)</span></div>
        <select value={clienteId} onChange={e=>setClienteId(e.target.value)} style={inp}>
          <option value="">— Sem cliente (lead / interno)</option>
          {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {!clienteId&&(
          <input type="email" value={emailFree} onChange={e=>setEmailFree(e.target.value)}
            placeholder="E-mail do lead (opcional)" style={{ ...inp,marginTop:6 }}/>
        )}
      </div>

      {/* Data */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:10.5,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:6 }}>Data</div>
        <input type="date" value={dateVal} onChange={e=>setDateVal(e.target.value)} style={inp}/>
      </div>

      {/* Horário (se reunião/gravação/ligação) */}
      {TIPOS_COM_HORA.has(tipo)&&(
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10.5,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:6 }}>Horário</div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <input type="time" value={hi} onChange={e=>setHi(e.target.value)} style={{ ...inp,width:"auto",flex:1 }}/>
            <span style={{ color:"var(--dim)",fontSize:12,flexShrink:0 }}>até</span>
            <input type="time" value={hf} onChange={e=>setHf(e.target.value)} style={{ ...inp,width:"auto",flex:1 }}/>
          </div>
        </div>
      )}

      {/* Participantes */}
      {equipe.length>0&&(
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:10.5,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:8 }}>Participantes <span style={{ fontWeight:400,color:"var(--mut)",textTransform:"none",letterSpacing:0 }}>(serão notificados)</span></div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
            {equipe.map(m=>{
              const sel=participantes.includes(m.nome);
              return (
                <button key={m.id} onClick={()=>toggleParticipante(m.nome)}
                  style={{ fontSize:12,padding:"5px 12px",borderRadius:20,border:`1px solid ${sel?"var(--accent)":"var(--line)"}`,background:sel?"var(--accent-20)":"transparent",color:sel?"var(--accent)":"var(--dim)",cursor:"pointer",fontWeight:sel?700:400,transition:"all .12s",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5 }}>
                  <span style={{ width:20,height:20,borderRadius:"50%",background:sel?"var(--accent)":"var(--line)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff",flexShrink:0 }}>{m.ini}</span>
                  {m.nome.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Observações */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:10.5,fontWeight:700,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".05em",marginBottom:6 }}>Observações <span style={{ fontWeight:400,color:"var(--mut)",textTransform:"none",letterSpacing:0 }}>(opcional)</span></div>
        <textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder="Pauta, links, instruções..." rows={3}
          style={{ ...inp,resize:"vertical",lineHeight:1.5 }}/>
      </div>

      <div style={{ display:"flex",gap:8 }}>
        <button onClick={onClose} style={{ flex:1,background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:10,padding:10,fontSize:13,color:"var(--dim)",cursor:"pointer",fontWeight:600,fontFamily:"inherit" }}>Cancelar</button>
        <button onClick={()=>{ if(!titulo.trim())return; onCreate(tipo,titulo.trim(),clienteId,dateVal,hi,hf,obs,participantes); }}
          style={{ flex:2,background:cor,color:"#fff",border:"none",borderRadius:10,padding:10,fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit" }}>
          Criar {TIPOS.find(t=>t.v===tipo)?.l}
        </button>
      </div>
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ anchor, etapas, nomeCli, hojeS, draggingId, onDragStart, onDragEnd, onDrop, onTaskClick, onDayClick, onNewTask }: {
  anchor: Date; etapas: Et[]; nomeCli: Record<string,string>; hojeS: string; draggingId: string|null;
  onDragStart:(id:string)=>void; onDragEnd:()=>void;
  onDrop:(dateStr:string,ev:React.DragEvent)=>void;
  onTaskClick:(e:Et)=>void; onDayClick:(d:Date)=>void; onNewTask:(d:string)=>void;
}) {
  const [dropDate, setDropDate] = useState<string|null>(null);
  const ini = monday(anchor);
  const cols = Array.from({length:7},(_,i)=>addDays(ini,i));

  return (
    <div className="plan-week-grid" style={{ display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:6 }}>
      {cols.map(d=>{
        const ds = ymd(d);
        const heute = ds===hojeS;
        const its = etapas.filter(e=>e.data_prevista===ds);
        const dow = (d.getDay()+6)%7;
        const isWeekend = dow>=5;
        const isDrop = dropDate===ds&&!!draggingId;
        return (
          <div key={ds}
            className={`plan-week-col${heute?" hoje":""}${isDrop?" dz-over":""}`}
            style={{ opacity:isWeekend?0.75:1 }}
            onDragOver={ev=>{ev.preventDefault();setDropDate(ds);}}
            onDragLeave={ev=>{if(!ev.currentTarget.contains(ev.relatedTarget as Node))setDropDate(null);}}
            onDrop={ev=>{setDropDate(null);onDrop(ds,ev);}}>
            {/* Column header */}
            <div onClick={()=>onDayClick(d)}
              style={{ padding:"10px 10px 8px",borderBottom:"1px solid var(--line)",cursor:"pointer",borderRadius:"10px 10px 0 0",background:heute?"color-mix(in srgb,var(--accent) 6%,var(--bg))":"transparent" }}>
              <div style={{ display:"flex",alignItems:"baseline",gap:6,justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:heute?"var(--accent)":"var(--dim)" }}>{DIAS_ABR[dow]}</div>
                  <div style={{ fontSize:22,fontWeight:900,color:heute?"var(--accent)":"var(--txt)",lineHeight:1 }}>{d.getDate()}</div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3 }}>
                  {its.length>0&&(
                    <span style={{ background:`color-mix(in srgb,var(--accent) 14%,transparent)`,color:"var(--accent)",borderRadius:20,padding:"1px 7px",fontSize:10.5,fontWeight:700 }}>{its.length}</span>
                  )}
                  <button onClick={ev=>{ev.stopPropagation();onNewTask(ds);}}
                    style={{ background:"none",border:"1px solid var(--line)",borderRadius:6,padding:"1px 7px",fontSize:10.5,color:"var(--dim)",cursor:"pointer",lineHeight:1.4 }}>+</button>
                </div>
              </div>
            </div>
            {/* Tasks */}
            <div style={{ padding:"8px 7px",minHeight:60 }}>
              {its.length===0&&!isDrop&&(
                <div style={{ fontSize:10.5,color:"var(--dim)",textAlign:"center",padding:"12px 0",opacity:.5 }}>vazio</div>
              )}
              {its.map(e=><TaskChip key={e.id} e={e} nomeCli={nomeCli} draggingId={draggingId} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onTaskClick}/>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ anchor, etapas, nomeCli, hojeS, draggingId, onDragStart, onDragEnd, onDrop, onTaskClick, onDayClick }: {
  anchor: Date; etapas: Et[]; nomeCli: Record<string,string>; hojeS: string; draggingId: string|null;
  onDragStart:(id:string)=>void; onDragEnd:()=>void;
  onDrop:(dateStr:string,ev:React.DragEvent)=>void;
  onTaskClick:(e:Et)=>void; onDayClick:(d:Date)=>void;
}) {
  const [dropDate, setDropDate] = useState<string|null>(null);
  const ini = new Date(anchor.getFullYear(),anchor.getMonth(),1);
  const gridDias = Array.from({length:42},(_,i)=>addDays(monday(ini),i));
  return (
    <div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4 }}>
        {DIAS_ABR.map((d,i)=>(
          <div key={d} style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",color:"var(--dim)",textAlign:"center",padding:"2px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4 }}>
        {gridDias.map(d=>{
          const ds=ymd(d);
          const outMes=d.getMonth()!==anchor.getMonth();
          const its=etapas.filter(e=>e.data_prevista===ds);
          const heute=ds===hojeS;
          const isDrop=dropDate===ds&&!!draggingId;
          return (
            <div key={ds}
              className={`plan-mes-cell${heute?" hoje":""}${outMes?" out":""}${isDrop?" plan-dz-active":""}`}
              onClick={()=>onDayClick(d)}
              onDragOver={ev=>{ev.preventDefault();setDropDate(ds);}}
              onDragLeave={ev=>{if(!ev.currentTarget.contains(ev.relatedTarget as Node))setDropDate(null);}}
              onDrop={ev=>{setDropDate(null);onDrop(ds,ev);}}>
              <span style={{ fontSize:11,fontWeight:700,color:heute?"var(--accent)":"var(--dim)",marginBottom:3,display:"block" }}>{d.getDate()}</span>
              {its.slice(0,3).map(e=><TaskChip key={e.id} e={e} nomeCli={nomeCli} draggingId={draggingId} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onTaskClick}/>)}
              {its.length>3&&<div style={{ fontSize:10,color:"var(--dim)",marginTop:2 }}>+{its.length-3}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Agenda View ───────────────────────────────────────────────────────────────
function AgendaView({ etapas, nomeCli, anchor, hojeS, draggingId, onDragStart, onDragEnd, onTaskClick, onNewTask }: {
  etapas: Et[]; nomeCli: Record<string,string>; anchor: Date; hojeS: string; draggingId: string|null;
  onDragStart:(id:string)=>void; onDragEnd:()=>void;
  onTaskClick:(e:Et)=>void; onNewTask:(d:string)=>void;
}) {
  const days = Array.from({length:30},(_,i)=>addDays(anchor,i));
  const semData = etapas.filter(e=>!e.data_prevista);
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:0 }}>
      {days.map(d=>{
        const ds = ymd(d);
        const its = etapas.filter(e=>e.data_prevista===ds);
        const heute = ds===hojeS;
        if(its.length===0&&!heute) return null;
        return (
          <div key={ds} style={{ display:"flex",gap:16,marginBottom:20 }}>
            <div style={{ flexShrink:0,width:54,textAlign:"center",paddingTop:2 }}>
              <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:heute?"var(--accent)":"var(--dim)" }}>{DIAS_ABR[(d.getDay()+6)%7]}</div>
              <div className="plan-agenda-date" style={{ color:heute?"var(--accent)":"var(--txt)",fontSize:heute?32:26 }}>{d.getDate()}</div>
              <div style={{ fontSize:10,color:"var(--dim)" }}>{MESES_ABR[d.getMonth()]}</div>
            </div>
            <div style={{ flex:1,minWidth:0,paddingTop:4 }}>
              {heute&&its.length===0&&(
                <div style={{ fontSize:12.5,color:"var(--dim)",padding:"12px 0" }}>Dia livre — <button onClick={()=>onNewTask(ds)} style={{ background:"none",border:"none",color:"var(--accent)",cursor:"pointer",fontSize:12.5,fontFamily:"inherit",fontWeight:700 }}>criar tarefa</button></div>
              )}
              {its.map(e=><TaskCard key={e.id} e={e} nomeCli={nomeCli} draggingId={draggingId} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onTaskClick}/>)}
              <button onClick={()=>onNewTask(ds)}
                style={{ background:"none",border:"1px dashed var(--line)",borderRadius:8,padding:"5px 12px",fontSize:11,color:"var(--dim)",cursor:"pointer",fontFamily:"inherit",transition:"border-color .12s" }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor="var(--accent)")}
                onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--line)")}>
                + Nova tarefa
              </button>
            </div>
          </div>
        );
      })}
      {semData.length>0&&(
        <div style={{ marginTop:20,padding:14,background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:12 }}>
          <div style={{ fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--warn)",marginBottom:10 }}>Sem data — {semData.length} tarefa{semData.length!==1?"s":""}</div>
          {semData.map(e=><TaskCard key={e.id} e={e} nomeCli={nomeCli} draggingId={draggingId} onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onTaskClick}/>)}
        </div>
      )}
    </div>
  );
}

// ── Roadmap View (Gantt SVG) ──────────────────────────────────────────────────
function RoadmapView({ etapas, nomeCli, anchor, hojeS, onTaskClick }: {
  etapas: Et[]; nomeCli: Record<string,string>; anchor: Date; hojeS: string;
  onTaskClick:(e:Et)=>void;
}) {
  const DAYS=28, ROW_H=36, BAR_H=24, DAY_W=34, LBL_W=140, HDR_H=36;
  const start=monday(anchor);
  const cols=Array.from({length:DAYS},(_,i)=>addDays(start,i));
  const startMs=start.getTime();
  const inWindow=etapas.filter(e=>{ if(!e.data_prevista)return false; const d=new Date(e.data_prevista+"T00:00:00").getTime(); return d>=startMs&&d<startMs+DAYS*86400000; });
  const noDate=etapas.filter(e=>!e.data_prevista);
  const byClient=new Map<string,Et[]>();
  for(const e of inWindow){ const a=byClient.get(e.cliente_id)??[]; a.push(e); byClient.set(e.cliente_id,a); }
  const clientRows=[...byClient.entries()].map(([cliId,tasks])=>({ cliId,cliNome:nomeCli[cliId]??"?",tasks }));
  const totalH=HDR_H*2+clientRows.reduce((a,r)=>a+r.tasks.length*ROW_H,0)+24;
  const totalW=LBL_W+DAYS*DAY_W;
  const todayIdx=cols.findIndex(d=>ymd(d)===hojeS);

  // Month spans
  const months: {label:string;start:number;span:number}[]=[];
  let curMo=-1,curSpan=0,curStart=0;
  cols.forEach((d,i)=>{ const mo=d.getMonth(); if(mo!==curMo){if(curMo>=0)months.push({label:`${MESES_ABR[curMo]} ${cols[curStart].getFullYear()}`,start:curStart,span:curSpan});curMo=mo;curStart=i;curSpan=1;}else curSpan++; });
  if(curMo>=0)months.push({label:`${MESES_ABR[curMo]} ${cols[curStart].getFullYear()}`,start:curStart,span:curSpan});

  return (
    <div style={{ overflowX:"auto" }}>
      <svg width={totalW} height={totalH} style={{ display:"block",fontFamily:"inherit" }}>
        {/* Month row */}
        {months.map(m=>(
          <g key={m.label}>
            <rect x={LBL_W+m.start*DAY_W} y={0} width={m.span*DAY_W} height={HDR_H} fill="var(--panel-2)"/>
            <text x={LBL_W+m.start*DAY_W+8} y={HDR_H/2+4} fill="var(--txt)" fontSize="11" fontWeight="700">{m.label}</text>
          </g>
        ))}
        {/* Day header row */}
        {cols.map((d,i)=>{ const isToday=ymd(d)===hojeS; const isSun=d.getDay()===0||d.getDay()===6; const x=LBL_W+i*DAY_W; return (
          <g key={i}>
            <rect x={x} y={HDR_H} width={DAY_W} height={HDR_H} fill={isToday?"color-mix(in srgb,var(--accent) 18%,var(--panel-2))":isSun?"color-mix(in srgb,var(--line) 30%,var(--panel-2))":"var(--panel-2)"}/>
            <text x={x+DAY_W/2} y={HDR_H+HDR_H/2+4} fill={isToday?"var(--accent)":"var(--dim)"} fontSize="10" textAnchor="middle" fontWeight={isToday?"800":"500"}>{d.getDate()}</text>
          </g>
        ); })}
        {/* Label header */}
        <rect x={0} y={0} width={LBL_W} height={HDR_H*2} fill="var(--bg)"/>
        <text x={10} y={HDR_H+HDR_H/2+4} fill="var(--dim)" fontSize="10" fontWeight="700">CLIENTE / TAREFA</text>
        {/* Client rows */}
        {clientRows.map(({cliNome,tasks},gi)=>{
          const gY=HDR_H*2+clientRows.slice(0,gi).reduce((a,r)=>a+r.tasks.length*ROW_H,0);
          const gH=tasks.length*ROW_H;
          return (
            <g key={gi}>
              <rect x={0} y={gY} width={LBL_W} height={gH} fill="var(--panel)"/>
              <text x={8} y={gY+gH/2+4} fill="var(--txt)" fontSize="10.5" fontWeight="700" clipPath={`url(#cl${gi})`}>{cliNome}</text>
              <clipPath id={`cl${gi}`}><rect x={0} y={gY} width={LBL_W-4} height={gH}/></clipPath>
              {tasks.map((e,ri)=>{
                const rY=gY+ri*ROW_H;
                const cor=areaCor(e.area,e.marco);
                const run=e.status==="run";
                const d0=new Date(e.data_prevista!+"T00:00:00");
                const dayOff=Math.round((d0.getTime()-startMs)/86400000);
                const durDays=Math.max(1,slaParaDias(e.sla));
                const bX=LBL_W+dayOff*DAY_W;
                const bW=Math.min(durDays*DAY_W-4,totalW-bX-2);
                return (
                  <g key={e.id} style={{ cursor:"pointer" }} onClick={()=>onTaskClick(e)}>
                    <rect x={LBL_W} y={rY} width={DAYS*DAY_W} height={ROW_H} fill="transparent"/>
                    {cols.map((_,ci)=><line key={ci} x1={LBL_W+ci*DAY_W} y1={rY} x2={LBL_W+ci*DAY_W} y2={rY+ROW_H} stroke="var(--line)" strokeWidth="0.4"/>)}
                    <rect x={bX+2} y={rY+(ROW_H-BAR_H)/2} width={Math.max(bW,4)} height={BAR_H} rx={5}
                      fill={`color-mix(in srgb,${cor} 22%,var(--panel-2))`} stroke={cor} strokeWidth={run?"1.8":"1"}/>
                    {run&&<rect x={bX+2} y={rY+(ROW_H-BAR_H)/2} width={4} height={BAR_H} rx={5} fill={cor}><animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite"/></rect>}
                    <text x={bX+8} y={rY+ROW_H/2+4} fill={cor} fontSize="10" fontWeight="600" clipPath={`url(#cb${e.id})`}>{e.marco?"◆ ":""}{e.titulo}</text>
                    <clipPath id={`cb${e.id}`}><rect x={bX+4} y={rY} width={Math.max(bW-4,0)} height={ROW_H}/></clipPath>
                  </g>
                );
              })}
              <line x1={0} y1={gY+gH} x2={totalW} y2={gY+gH} stroke="var(--line)" strokeWidth="0.8"/>
            </g>
          );
        })}
        {todayIdx>=0&&<line x1={LBL_W+todayIdx*DAY_W+DAY_W/2} y1={HDR_H} x2={LBL_W+todayIdx*DAY_W+DAY_W/2} y2={totalH-24} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3"/>}
        <rect x={0} y={0} width={totalW} height={1} fill="var(--line)"/>
        <rect x={0} y={HDR_H} width={totalW} height={1} fill="var(--line)"/>
        <rect x={0} y={HDR_H*2} width={totalW} height={1} fill="var(--line)"/>
        <rect x={LBL_W} y={0} width={1} height={totalH-24} fill="var(--line)"/>
      </svg>
      {noDate.length>0&&(
        <div style={{ marginTop:16,padding:"10px 14px",background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:10 }}>
          <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--warn)",marginBottom:8 }}>Sem data ({noDate.length})</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
            {noDate.map(e=>{ const cor=areaCor(e.area,e.marco); return (
              <button key={e.id} onClick={()=>onTaskClick(e)} style={{ background:`color-mix(in srgb,${cor} 12%,var(--panel-2))`,border:`1px solid ${cor}`,borderRadius:8,padding:"4px 10px",fontSize:11.5,color:cor,cursor:"pointer",fontFamily:"inherit" }}>
                {e.marco?"◆ ":""}{e.titulo}
                <span style={{ fontSize:10,color:"var(--dim)",marginLeft:6 }}>{nomeCli[e.cliente_id]??""}</span>
              </button>
            ); })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main PlanejamentoBoard ────────────────────────────────────────────────────
export function PlanejamentoBoard({
  etapas: serverEtapas, concluidas, nomeCli, equipe, isAdmin, clientes,
  membroId, membroNome, initialView, initialDate, initialFiltroCli,
}: {
  etapas: Et[]; concluidas: Et[]; nomeCli: Record<string,string>;
  equipe: Membro[]; isAdmin: boolean; clientes: Cli[];
  membroId: string; membroNome: string;
  initialView: Vista; initialDate: string; initialFiltroCli: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [view, setView] = useState<Vista>(initialView);
  const [anchor, setAnchor] = useState(()=>parseDate(initialDate));
  const [filtroCliente, setFiltroCliente] = useState(initialFiltroCli);
  const [panel, setPanel] = useState<PanelState>(null);
  const [draggingId, setDraggingId] = useState<string|null>(null);

  const [optimisticEtapas, updateOptimistic] = useOptimistic(
    serverEtapas,
    (state,{id,date}:{id:string;date:string}) =>
      state.map(e=>e.id===id?{...e,data_prevista:date||null}:e)
  );

  const hojeS = ymd(new Date());
  const etapas = optimisticEtapas.filter(e=>!filtroCliente||e.cliente_id===filtroCliente);
  const semData = etapas.filter(e=>!e.data_prevista);
  const thisWeekStart = ymd(monday(new Date()));
  const thisWeekEnd = ymd(addDays(monday(new Date()),6));
  const doneSemana = concluidas.filter(c=>c.concluida_em&&c.concluida_em>=thisWeekStart+"T00:00:00");

  const reschedule = (etapaId: string, date: string) => {
    startTransition(async()=>{
      updateOptimistic({id:etapaId,date});
      const fd=new FormData(); fd.set("etapaId",etapaId); fd.set("data",date);
      await agendarEtapa(fd);
      router.refresh();
    });
  };
  const createTask = (tipo:string,titulo:string,clienteId:string,date:string,hi:string,hf:string,obs:string,participantes:string[]) => {
    startTransition(async()=>{
      const fd=new FormData();
      fd.set("tipo",tipo); fd.set("titulo",titulo); fd.set("clienteId",clienteId);
      fd.set("date",date); fd.set("membroNome",membroNome);
      if(hi) fd.set("horario_inicio",hi); if(hf) fd.set("horario_fim",hf);
      if(obs) fd.set("observacoes",obs);
      if(participantes.length>0) fd.set("participantes",participantes.join(","));
      await criarEtapaCal(fd);
      router.refresh();
      setPanel(null);
    });
  };
  const onDrop = (dateStr:string, ev:React.DragEvent) => {
    ev.preventDefault();
    const etapaId=ev.dataTransfer.getData("etapaId");
    if(!etapaId) return;
    setDraggingId(null);
    reschedule(etapaId,dateStr);
  };

  const switchMembro = (id:string) => {
    const p=new URLSearchParams();
    if(id!==equipe[0]?.id) p.set("m",id);
    if(view!=="semana") p.set("v",view);
    const s=p.toString();
    router.push(`/expand/planejamento${s?`?${s}`:""}`);
  };

  const navigate = (dir:number) => {
    setAnchor(
      view==="agenda"?addDays(anchor,dir*7):
      view==="semana"?addDays(anchor,dir*7):
      view==="roadmap"?addDays(anchor,dir*28):
      new Date(anchor.getFullYear(),anchor.getMonth()+dir,1)
    );
  };

  const navLabel = view==="semana"||view==="agenda"
    ? `${monday(anchor).getDate()} — ${addDays(monday(anchor),6).getDate()} ${MESES_ABR[addDays(monday(anchor),6).getMonth()]} ${addDays(monday(anchor),6).getFullYear()}`
    : view==="roadmap"
    ? `${monday(anchor).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})} — ${addDays(monday(anchor),27).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}`
    : `${MESES[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const chipProps = {
    nomeCli, draggingId,
    onDragStart: setDraggingId,
    onDragEnd: ()=>setDraggingId(null),
    onClick: (e:Et)=>setPanel({kind:"task",et:e}),
  };

  const BTN: React.CSSProperties = {
    background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:8,
    color:"var(--txt)",fontSize:15,padding:"4px 11px",cursor:"pointer",lineHeight:1,fontFamily:"inherit",
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div className="plan-layout" style={{ display:"flex",gap:18,alignItems:"flex-start" }}>

        {/* ── SIDEBAR ────────────────────────────────────────────────────── */}
        <div className="plan-sidebar" style={{ width:210,flexShrink:0 }}>
          <div className="plan-sidebar-card">
            <MiniCalendar anchor={anchor} etapas={optimisticEtapas} hojeS={hojeS}
              onDayClick={d=>{ setAnchor(d); if(view==="mes") setPanel({kind:"day",date:d}); }}/>
          </div>

          {/* Sprint stats */}
          <div className="plan-sidebar-card">
            <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--dim)",marginBottom:10 }}>Esta semana</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10 }}>
              {[
                { l:"Ativas", v:etapas.filter(e=>e.status==="run").length, c:"var(--green)" },
                { l:"Concluídas", v:doneSemana.length, c:"var(--accent)" },
                { l:"Na fila", v:etapas.filter(e=>e.status==="idle").length, c:"var(--dim)" },
                { l:"Sem data", v:semData.length, c:"var(--warn)" },
              ].map(({l,v,c})=>(
                <div key={l} style={{ background:"var(--bg)",borderRadius:8,padding:"8px 10px",border:"1px solid var(--line)" }}>
                  <div style={{ fontSize:20,fontWeight:900,color:c,lineHeight:1 }}>{v}</div>
                  <div style={{ fontSize:10,color:"var(--dim)",marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
            {(etapas.length+doneSemana.length)>0&&(
              <div>
                <div style={{ height:6,background:"var(--line)",borderRadius:3,overflow:"hidden" }}>
                  <div style={{ height:"100%",background:"var(--accent)",borderRadius:3,width:`${Math.round(doneSemana.length/(etapas.length+doneSemana.length)*100)}%`,transition:"width .4s" }}/>
                </div>
                <div style={{ fontSize:10,color:"var(--dim)",marginTop:4 }}>{Math.round(doneSemana.length/(etapas.length+doneSemana.length)*100)}% concluído no ciclo</div>
              </div>
            )}
          </div>

          {/* Team switcher */}
          {isAdmin&&equipe.length>0&&(
            <div className="plan-sidebar-card">
              <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--dim)",marginBottom:10 }}>Equipe</div>
              {equipe.map(m=>{
                const active=m.nome===membroNome;
                return (
                  <button key={m.id} onClick={()=>switchMembro(m.id)}
                    style={{ display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",background:active?"color-mix(in srgb,var(--accent) 12%,transparent)":"transparent",border:active?"1px solid var(--accent)":"1px solid transparent",borderRadius:8,padding:"6px 8px",cursor:"pointer",color:active?"var(--accent)":"var(--txt)",fontSize:12,fontWeight:active?700:400,transition:"all .15s",marginBottom:2,fontFamily:"inherit" }}>
                    <span style={{ width:22,height:22,borderRadius:"50%",background:active?"var(--accent)":"var(--bg)",border:"1px solid var(--line)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:active?"#fff":"var(--txt)",flexShrink:0 }}>{m.ini}</span>
                    <span style={{ flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{m.nome}</span>
                    {active&&<span style={{ width:6,height:6,borderRadius:"50%",background:"var(--accent)",flexShrink:0 }}/>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Backlog (sem data) */}
          {semData.length>0&&(
            <div className="plan-sidebar-card">
              <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--warn)",marginBottom:6,display:"flex",alignItems:"center",gap:6 }}>
                A agendar
                <span style={{ background:"color-mix(in srgb,var(--warn) 18%,transparent)",color:"var(--warn)",borderRadius:20,padding:"1px 7px",fontSize:10 }}>{semData.length}</span>
              </div>
              <p style={{ fontSize:10.5,color:"var(--dim)",margin:"0 0 8px",lineHeight:1.4 }}>Arraste para o calendário</p>
              {semData.map(e=><TaskChip key={e.id} e={e} {...chipProps}/>)}
            </div>
          )}

          {/* Area legend */}
          <div className="plan-sidebar-card">
            <div style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:"var(--dim)",marginBottom:8 }}>Áreas</div>
            <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
              {Object.entries(AREAS).map(([k,{n,cor}])=>(
                <div key={k} style={{ display:"flex",alignItems:"center",gap:7,fontSize:11.5,color:"var(--txt)" }}>
                  <span style={{ width:10,height:10,borderRadius:3,background:cor,flexShrink:0 }}/>
                  {n}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MAIN ───────────────────────────────────────────────────────── */}
        <div style={{ flex:1,minWidth:0 }}>
          {/* Top bar */}
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:16 }}>
            {/* View tabs */}
            <div style={{ display:"flex",background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:9,padding:2,gap:1 }}>
              {(["agenda","semana","mes","roadmap"] as Vista[]).map((v,i)=>(
                <button key={v} onClick={()=>{ setView(v); const p=new URLSearchParams(); p.set("v",v); router.replace(`/expand/planejamento?${p}`); }}
                  className={`plan-tab${view===v?" active":""}`}>
                  {["Agenda","Semana","Mês","Roadmap"][i]}
                </button>
              ))}
            </div>

            <button onClick={()=>navigate(-1)} style={BTN}>‹</button>
            <span style={{ fontSize:13,fontWeight:700,minWidth:140,textAlign:"center",textTransform:"capitalize" }}>{navLabel}</span>
            <button onClick={()=>navigate(1)} style={BTN}>›</button>
            <button onClick={()=>setAnchor(new Date())}
              style={{ ...BTN,color:"var(--accent)",border:"1px solid var(--accent)",fontSize:11.5,fontWeight:700 }}>Hoje</button>

            {/* Client filter */}
            <select value={filtroCliente} onChange={e=>setFiltroCliente(e.target.value)}
              style={{ marginLeft:"auto",background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:8,color:"var(--txt)",padding:"5px 10px",fontSize:12,outline:"none",cursor:"pointer",fontFamily:"inherit" }}>
              <option value="">Todos os clientes</option>
              {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>

            <button onClick={()=>setPanel({kind:"new",date:hojeS})}
              style={{ background:"var(--accent)",color:"#fff",border:"none",borderRadius:8,padding:"6px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
              + Nova
            </button>
          </div>

          {/* Views */}
          {view==="semana"&&(
            <WeekView anchor={anchor} etapas={etapas} nomeCli={nomeCli} hojeS={hojeS}
              draggingId={draggingId} onDragStart={setDraggingId} onDragEnd={()=>setDraggingId(null)}
              onDrop={onDrop}
              onTaskClick={e=>setPanel({kind:"task",et:e})}
              onDayClick={d=>{ setAnchor(d); setPanel({kind:"day",date:d}); }}
              onNewTask={date=>setPanel({kind:"new",date})}/>
          )}
          {view==="mes"&&(
            <MonthView anchor={anchor} etapas={etapas} nomeCli={nomeCli} hojeS={hojeS}
              draggingId={draggingId} onDragStart={setDraggingId} onDragEnd={()=>setDraggingId(null)}
              onDrop={onDrop}
              onTaskClick={e=>setPanel({kind:"task",et:e})}
              onDayClick={d=>{ setAnchor(d); setPanel({kind:"day",date:d}); }}/>
          )}
          {view==="agenda"&&(
            <AgendaView anchor={anchor} etapas={etapas} nomeCli={nomeCli} hojeS={hojeS}
              draggingId={draggingId} onDragStart={setDraggingId} onDragEnd={()=>setDraggingId(null)}
              onTaskClick={e=>setPanel({kind:"task",et:e})}
              onNewTask={date=>setPanel({kind:"new",date})}/>
          )}
          {view==="roadmap"&&(
            <RoadmapView etapas={etapas} nomeCli={nomeCli} anchor={anchor} hojeS={hojeS}
              onTaskClick={e=>setPanel({kind:"task",et:e})}/>
          )}
        </div>
      </div>

      {/* ── Slide panel ─────────────────────────────────────────────────── */}
      <div className={`plan-overlay${panel?" open":""}`} onClick={()=>setPanel(null)}/>
      <div className={`plan-panel${panel?" open":""}`}>
        {panel?.kind==="task"&&(
          <DetailPanel e={panel.et} nomeCli={nomeCli} onClose={()=>setPanel(null)}
            onReschedule={(id,date)=>{
              reschedule(id,date);
              setPanel(prev=>prev?.kind==="task"&&prev.et.id===id?{...prev,et:{...prev.et,data_prevista:date||null}}:prev);
            }}/>
        )}
        {panel?.kind==="day"&&(
          <DayPanel date={panel.date} etapas={optimisticEtapas} nomeCli={nomeCli}
            draggingId={draggingId} onDragStart={setDraggingId} onDragEnd={()=>setDraggingId(null)}
            onTaskClick={e=>setPanel({kind:"task",et:e})}
            onNewTask={date=>setPanel({kind:"new",date})}
            onClose={()=>setPanel(null)}/>
        )}
        {panel?.kind==="new"&&(
          <NewTaskForm date={panel.date} clientes={clientes} equipe={equipe} membroNome={membroNome}
            onClose={()=>setPanel(null)}
            onCreate={createTask}/>
        )}
      </div>
    </>
  );
}
