"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { novaAcaoPlano, editarAcaoPlano, deletarAcaoPlano, alternarPlanoAcao } from "@/app/expand/actions";

export type AcaoFull = {
  id: string; titulo: string; detalhe: string | null;
  responsaveis: string[] | null; data_limite: string | null; hora: string | null;
  status: string; origem: string | null; prioridade: string | null;
  concluida_em: string | null; data_inicio?: string | null; cliente_id?: string | null;
};

export type Membro = { id: string; nome: string; cor: string; ini: string; cargo?: string | null };
export type ClienteSimples = { id: string; nome: string };

const PRIOR_META: Record<string, { l: string; c: string; order: number }> = {
  urgente: { l: "Urgente", c: "#CE6A5F", order: 0 },
  alta:    { l: "Alta",    c: "#D9A94E", order: 1 },
  normal:  { l: "Normal",  c: "#6FBF92", order: 2 },
  baixa:   { l: "Baixa",   c: "#7C8C7F", order: 3 },
};

const ORIGEM_META: Record<string, { l: string; ic: string }> = {
  interno:   { l: "Interno",   ic: "⚙" },
  cliente:   { l: "Cliente",   ic: "👤" },
  pmo:       { l: "PMO",       ic: "📋" },
  whatsapp:  { l: "WhatsApp",  ic: "💬" },
};

const fld: React.CSSProperties = {
  width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)",
  borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 12.5, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};

const lbl: React.CSSProperties = {
  fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em",
  color: "var(--dim)", fontWeight: 700, marginBottom: 5, display: "block",
};

/* Detecta primeiros nomes duplicados para mostrar sobrenome */
function buildDisplayNames(membros: Membro[]): Map<string, string> {
  const firstNames = membros.map((m) => m.nome.split(" ")[0]);
  const counts: Record<string, number> = {};
  firstNames.forEach((n) => { counts[n] = (counts[n] ?? 0) + 1; });
  const map = new Map<string, string>();
  membros.forEach((m) => {
    const parts = m.nome.split(" ");
    const display = counts[parts[0]] > 1
      ? `${parts[0]} ${parts[1] ?? ""}`.trim()
      : parts[0];
    map.set(m.id, display);
  });
  return map;
}

function MemberList({ membros, selected, onChange }: {
  membros: Membro[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayNames = buildDisplayNames(membros);

  const toggle = (nome: string) =>
    onChange(selected.includes(nome) ? selected.filter((n) => n !== nome) : [...selected, nome]);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const selectedMembros = membros.filter((m) => selected.includes(m.nome));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          ...fld, display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          justifyContent: "space-between", padding: "7px 10px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1, minHeight: 20 }}>
          {selectedMembros.length === 0 ? (
            <span style={{ color: "var(--dim)", fontSize: 12 }}>Selecionar responsáveis...</span>
          ) : selectedMembros.map((m) => (
            <span key={m.id} style={{
              display: "flex", alignItems: "center", gap: 4, fontSize: 11.5,
              padding: "2px 8px", borderRadius: 20,
              background: `color-mix(in srgb,${m.cor} 16%,transparent)`, color: m.cor,
            }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: m.cor, color: "#0A1512", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900 }}>
                {m.ini}
              </span>
              {displayNames.get(m.id)}
            </span>
          ))}
        </div>
        <span style={{ color: "var(--dim)", fontSize: 10, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
          background: "var(--panel-2)", border: "1px solid var(--line-2)", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)", overflow: "hidden",
        }}>
          {membros.map((m) => {
            const on = selected.includes(m.nome);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.nome)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", border: "none", borderBottom: "1px solid var(--line)",
                  background: on ? `color-mix(in srgb,${m.cor} 10%,transparent)` : "transparent",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  transition: "background .1s",
                }}
              >
                {/* Avatar */}
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: on ? m.cor : "var(--line)", color: on ? "#0A1512" : "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                  {m.ini}
                </span>
                {/* Name + cargo */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: on ? m.cor : "var(--txt)" }}>{m.nome}</div>
                  {m.cargo && <div style={{ fontSize: 10.5, color: "var(--dim)" }}>{m.cargo}</div>}
                </div>
                {/* Check */}
                <span style={{ fontSize: 13, color: on ? m.cor : "var(--line)", flexShrink: 0 }}>{on ? "✓" : "○"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const AREAS = ["Comercial", "CS", "Audiovisual", "Social", "Tráfego", "Gestão", "Tecnologia", "Financeiro"];

function AcaoForm({
  acao, membros, clientes, onClose, isEdit,
}: {
  acao?: AcaoFull; membros: Membro[]; clientes: ClienteSimples[];
  onClose: () => void; isEdit: boolean;
}) {
  const [titulo, setTitulo]         = useState(acao?.titulo ?? "");
  const [detalhe, setDetalhe]       = useState(acao?.detalhe ?? "");
  const [resp, setResp]             = useState<string[]>(acao?.responsaveis ?? []);
  const [dataIni, setDataIni]       = useState(acao?.data_inicio ?? "");
  const [dataLim, setDataLim]       = useState(acao?.data_limite ?? "");
  const [hora, setHora]             = useState(acao?.hora ?? "");
  const [prior, setPrior]           = useState(acao?.prioridade ?? "normal");
  const [origem, setOrigem]         = useState(acao?.origem ?? "interno");
  const [modo, setModo]             = useState<"fazer" | "feita">(acao?.status === "done" ? "feita" : "fazer");
  const [clienteId, setClienteId]   = useState(acao?.cliente_id ?? "");
  const [area, setArea]             = useState("");
  const [concluida, setConcluida]   = useState(
    acao?.concluida_em ? acao.concluida_em.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [, start] = useTransition();
  const meta = PRIOR_META[prior] ?? PRIOR_META.normal;
  const temCliente = !!clienteId;

  const handleSubmit = () => {
    if (!titulo.trim()) return;
    const fd = new FormData();
    if (isEdit) fd.set("id", acao!.id);
    fd.set("titulo", titulo);
    fd.set("responsaveis", resp.join(","));
    fd.set("data_inicio", dataIni);
    fd.set("data_limite", dataLim);
    fd.set("hora", hora);
    fd.set("prioridade", prior);
    fd.set("detalhe", detalhe);
    fd.set("origem", origem);
    fd.set("modo", modo);
    fd.set("concluida_em", concluida);
    fd.set("cliente_id", clienteId);
    fd.set("area", area);
    start(async () => {
      if (isEdit) await editarAcaoPlano(fd);
      else await novaAcaoPlano(fd);
      onClose();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{isEdit ? "Editar ação" : "Nova ação"}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
      </div>

      {/* Modo: A fazer / Já feita */}
      <div>
        <span style={lbl}>Tipo</span>
        <div style={{ display: "flex", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, padding: 2 }}>
          {([["fazer", "📋 A fazer"], ["feita", "✓ Já feita"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setModo(k)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700, fontFamily: "inherit", transition: "all .12s",
                background: modo === k ? (k === "feita" ? "var(--green)" : "var(--accent)") : "transparent",
                color: modo === k ? "#0A1512" : "var(--dim)",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cliente (opcional) */}
      <div>
        <span style={lbl}>Para qual cliente? <span style={{ color: "var(--accent)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(deixe em branco para ação interna)</span></span>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
            style={{ ...fld, flex: 2, colorScheme: "dark" }}>
            <option value="">— Ação interna da equipe —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          {temCliente && (
            <select value={area} onChange={(e) => setArea(e.target.value)}
              style={{ ...fld, flex: 1, colorScheme: "dark" }}>
              <option value="">Área...</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>
        {temCliente && (
          <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 8, background: "color-mix(in srgb,var(--green) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--green) 25%,transparent)", fontSize: 11.5, color: "var(--green)" }}>
            ✓ Esta tarefa vai aparecer no dossiê do cliente, Kanban e Meu Dia.
          </div>
        )}
      </div>

      {/* Título */}
      <div>
        <span style={lbl}>O que fazer</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)}
          placeholder="Descrição da ação..." style={fld} autoFocus />
      </div>

      {/* Detalhe */}
      <div>
        <span style={lbl}>Detalhamento</span>
        <textarea value={detalhe} onChange={(e) => setDetalhe(e.target.value)}
          placeholder="Contexto, critério, como fazer, demanda do cliente..." rows={2}
          style={{ ...fld, resize: "vertical" }} />
      </div>

      {/* Prioridade */}
      {modo === "fazer" && (
        <div>
          <span style={lbl}>Prioridade</span>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(PRIOR_META).map(([k, m]) => (
              <button key={k} type="button" onClick={() => setPrior(k)}
                style={{
                  flex: 1, padding: "5px 0", borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                  border: `1px solid ${prior === k ? m.c : "var(--line)"}`,
                  background: prior === k ? `color-mix(in srgb,${m.c} 16%,transparent)` : "transparent",
                  color: prior === k ? m.c : "var(--dim)", cursor: "pointer", fontFamily: "inherit",
                  transition: "all .12s",
                }}>
                {m.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Origem */}
      <div>
        <span style={lbl}>Origem da demanda</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(ORIGEM_META).map(([k, m]) => (
            <button key={k} type="button" onClick={() => setOrigem(k)}
              style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                border: `1px solid ${origem === k ? "var(--accent)" : "var(--line)"}`,
                background: origem === k ? "color-mix(in srgb,var(--accent) 16%,transparent)" : "transparent",
                color: origem === k ? "var(--accent)" : "var(--dim)", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 5, transition: "all .12s",
              }}>
              <span>{m.ic}</span> {m.l}
            </button>
          ))}
        </div>
      </div>

      {/* Responsáveis */}
      <div>
        <span style={lbl}>Quem</span>
        <MemberList membros={membros} selected={resp} onChange={setResp} />
      </div>

      {/* Datas */}
      {modo === "fazer" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <span style={lbl}>Data de início</span>
            <input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)}
              style={{ ...fld, colorScheme: "dark" }} />
          </div>
          <div>
            <span style={lbl}>Data limite</span>
            <input type="date" value={dataLim} onChange={(e) => setDataLim(e.target.value)}
              style={{ ...fld, colorScheme: "dark" }} />
          </div>
          <div>
            <span style={lbl}>Tempo estimado</span>
            <input value={hora} onChange={(e) => setHora(e.target.value)}
              placeholder="ex: 1h30, 45min" style={fld} />
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <span style={lbl}>Quando foi concluída</span>
            <input type="date" value={concluida} onChange={(e) => setConcluida(e.target.value)}
              style={{ ...fld, colorScheme: "dark" }} />
          </div>
          <div>
            <span style={lbl}>Tempo executado</span>
            <input value={hora} onChange={(e) => setHora(e.target.value)}
              placeholder="ex: 2h, 30min" style={fld} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <button onClick={onClose}
          style={{ flex: 1, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, fontSize: 13, color: "var(--dim)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={!titulo.trim()}
          style={{
            flex: 2, border: "none", borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit", opacity: titulo.trim() ? 1 : 0.5,
            background: modo === "feita" ? "var(--green)" : meta.c,
            color: "#0A1512",
          }}>
          {isEdit ? "Salvar" : modo === "feita" ? "Registrar no histórico" : "Adicionar ação"}
        </button>
      </div>
    </div>
  );
}

function AcaoCard({
  a, membros, isAdmin, membroMap, displayNames,
}: {
  a: AcaoFull; membros: Membro[]; isAdmin: boolean;
  membroMap: Map<string, Membro>; displayNames: Map<string, string>;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [, start] = useTransition();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const done  = a.status === "done";
  const dLim  = a.data_limite ? new Date(a.data_limite + "T12:00") : null;
  const dIni  = (a.data_inicio as string | null | undefined) ? new Date((a.data_inicio as string) + "T12:00") : null;
  const late  = !done && dLim && dLim < today;
  const prior = PRIOR_META[a.prioridade ?? "normal"] ?? PRIOR_META.normal;
  const borderC = done ? "var(--dim)" : late ? "var(--red)" : prior.c;
  const origemMeta = ORIGEM_META[a.origem ?? "interno"] ?? ORIGEM_META.interno;

  if (editing) {
    return (
      <div style={{ background: "var(--panel-2)", border: `1px solid var(--line)`, borderRadius: 12, padding: "14px 16px" }}>
        <AcaoForm acao={a} membros={membros} clientes={[]} onClose={() => setEditing(false)} isEdit />
      </div>
    );
  }

  if (deleting) {
    return (
      <div style={{ background: "var(--panel-2)", border: "1px solid var(--red)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, fontSize: 13, color: "var(--txt)" }}>Excluir &ldquo;{a.titulo}&rdquo;?</span>
        <button onClick={() => setDeleting(false)} style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", color: "var(--dim)", fontFamily: "inherit" }}>Cancelar</button>
        <form action={deletarAcaoPlano} style={{ display: "inline" }}>
          <input type="hidden" name="id" value={a.id} />
          <button type="submit" style={{ background: "var(--red)", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Excluir</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      background: done ? "var(--panel)" : "var(--panel-2)",
      border: `1px solid ${done ? "var(--line)" : "var(--line-2)"}`,
      borderLeft: `4px solid ${borderC}`,
      borderRadius: "0 12px 12px 0",
      padding: "11px 14px",
      display: "flex", alignItems: "flex-start", gap: 12,
      opacity: done ? 0.65 : 1, transition: "opacity .15s",
    }}>
      {/* Check toggle */}
      <form action={alternarPlanoAcao} style={{ flexShrink: 0, marginTop: 2 }}>
        <input type="hidden" name="id" value={a.id} />
        <button type="submit" aria-label={done ? "Reabrir" : "Concluir"} style={{
          width: 20, height: 20, borderRadius: 6, padding: 0,
          border: `1.5px solid ${done ? "var(--green)" : borderC}`,
          background: done ? "var(--green)" : "transparent",
          color: "#0A1512", cursor: "pointer", fontSize: 11, lineHeight: 1,
          display: "grid", placeItems: "center",
        }}>{done ? "✓" : ""}</button>
      </form>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, textDecoration: done ? "line-through" : "none", color: "var(--txt)", marginBottom: a.detalhe ? 4 : 0 }}>
          {a.titulo}
        </div>
        {a.detalhe && !done && (
          <div style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.5, marginBottom: 6 }}>{a.detalhe}</div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", alignItems: "center", marginTop: 5 }}>
          {/* Priority */}
          {!done && (
            <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, fontWeight: 700, background: `color-mix(in srgb,${prior.c} 14%,transparent)`, color: prior.c }}>
              {prior.l}
            </span>
          )}
          {/* Origem */}
          {a.origem && a.origem !== "interno" && (
            <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: "color-mix(in srgb,var(--accent) 10%,transparent)", color: "var(--accent)" }}>
              {origemMeta.ic} {origemMeta.l}
            </span>
          )}
          {/* Responsáveis */}
          {(a.responsaveis ?? []).map((r) => {
            const m = membroMap.get(r);
            const cor = m?.cor ?? "var(--accent)";
            const dispName = m ? (displayNames.get(m.id) ?? r.split(" ")[0]) : r.split(" ")[0];
            return (
              <span key={r} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: cor, background: `color-mix(in srgb,${cor} 12%,transparent)`, borderRadius: 20, padding: "2px 8px" }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: cor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900, flexShrink: 0 }}>
                  {(m?.ini ?? r.slice(0, 2).toUpperCase())}
                </span>
                {dispName}
              </span>
            );
          })}
          {/* Datas */}
          {dIni && !done && (
            <span style={{ fontSize: 10.5, color: "var(--dim)" }}>
              início {dIni.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
          {dLim && (
            <span style={{ fontSize: 11, color: late ? "var(--red)" : done ? "var(--dim)" : "var(--mut)", fontWeight: late ? 700 : 400 }}>
              {late ? "⚠ venceu " : done ? "✓ " : "até "}
              {dLim.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
          {/* Tempo */}
          {a.hora && (
            <span style={{ fontSize: 10.5, color: "var(--dim)" }}>⏱ {a.hora}</span>
          )}
          {/* Concluída em (para já feitas) */}
          {done && a.concluida_em && (
            <span style={{ fontSize: 10.5, color: "var(--green)" }}>
              concluída {new Date(a.concluida_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
        </div>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={() => setEditing(true)} style={{ background: "none", border: "1px solid var(--line)", borderRadius: 7, padding: "3px 8px", fontSize: 11, color: "var(--dim)", cursor: "pointer" }}>Editar</button>
          {!done && <button onClick={() => setDeleting(true)} style={{ background: "none", border: "1px solid var(--line)", borderRadius: 7, padding: "3px 8px", fontSize: 11, color: "var(--dim)", cursor: "pointer" }}>✕</button>}
        </div>
      )}
    </div>
  );
}

export function PlanoAcaoClient({
  acoes, membros, clientes, isAdmin,
}: {
  acoes: AcaoFull[]; membros: Membro[]; clientes: ClienteSimples[]; isAdmin: boolean;
}) {
  const [filtro, setFiltro] = useState<"todas" | "pendentes" | "feitas">("pendentes");
  const [filtroPrior, setFiltroPrior] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const membroMap    = new Map(membros.map((m) => [m.nome, m]));
  const displayNames = buildDisplayNames(membros);

  const sorted = [...acoes].sort((a, b) => {
    const pa = PRIOR_META[a.prioridade ?? "normal"]?.order ?? 2;
    const pb = PRIOR_META[b.prioridade ?? "normal"]?.order ?? 2;
    if (pa !== pb) return pa - pb;
    if (!a.data_limite && !b.data_limite) return 0;
    if (!a.data_limite) return 1;
    if (!b.data_limite) return -1;
    return a.data_limite.localeCompare(b.data_limite);
  });

  const visivel = sorted
    .filter((a) => {
      if (filtro === "pendentes") return a.status !== "done";
      if (filtro === "feitas") return a.status === "done";
      return true;
    })
    .filter((a) => !filtroPrior || (a.prioridade ?? "normal") === filtroPrior);

  const total  = acoes.length;
  const feitas = acoes.filter((a) => a.status === "done").length;
  const pct    = total ? Math.round((feitas / total) * 100) : 0;

  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--dim)", marginBottom: 5 }}>
          <span>{feitas} de {total} concluídas</span>
          <span style={{ fontWeight: 700, color: pct === 100 ? "var(--green)" : "var(--txt)" }}>{pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--line)" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: pct === 100 ? "var(--green)" : "var(--accent)", transition: "width .4s" }} />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        {/* View filter */}
        <div style={{ display: "flex", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 8, padding: 2 }}>
          {(["pendentes", "todas", "feitas"] as const).map((f, i) => (
            <button key={f} onClick={() => setFiltro(f)}
              style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: filtro === f ? "var(--accent)" : "transparent", color: filtro === f ? "#0A1512" : "var(--dim)", transition: "all .12s", fontFamily: "inherit" }}>
              {["Pendentes", "Todas", "Feitas"][i]}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        {["", "urgente", "alta", "normal", "baixa"].map((p) => {
          const m = p ? PRIOR_META[p] : null;
          const active = filtroPrior === p;
          return (
            <button key={p || "all"} onClick={() => setFiltroPrior(p)}
              style={{
                padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                border: `1px solid ${active ? (m?.c ?? "var(--accent)") : "var(--line)"}`,
                background: active ? `color-mix(in srgb,${m?.c ?? "var(--accent)"} 14%,transparent)` : "transparent",
                color: active ? (m?.c ?? "var(--accent)") : "var(--dim)", cursor: "pointer", transition: "all .12s",
              }}>
              {p ? m!.l : "Todas"}
            </button>
          );
        })}

        {/* Add button */}
        {isAdmin && (
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ marginLeft: "auto", background: showAdd ? "var(--panel-2)" : "var(--accent)", color: showAdd ? "var(--dim)" : "#0A1512", border: showAdd ? "1px solid var(--line)" : "none", borderRadius: 9, padding: "6px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
            {showAdd ? "✕ Cancelar" : "+ Nova ação"}
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && isAdmin && (
        <div style={{ background: "var(--panel-2)", border: "1px solid var(--accent)", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
          <AcaoForm membros={membros} clientes={clientes} onClose={() => setShowAdd(false)} isEdit={false} />
        </div>
      )}

      {/* Action cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visivel.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dim)", fontSize: 13 }}>
            {filtro === "feitas" ? "Nenhuma ação concluída ainda." : "Nenhuma ação pendente. 🎉"}
          </div>
        ) : (
          visivel.map((a) => (
            <AcaoCard key={a.id} a={a} membros={membros} isAdmin={isAdmin} membroMap={membroMap} displayNames={displayNames} />
          ))
        )}
      </div>
    </div>
  );
}
