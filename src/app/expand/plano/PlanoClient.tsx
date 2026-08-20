"use client";

import { useState, useTransition } from "react";
import { novaAcaoPlano, editarAcaoPlano, deletarAcaoPlano, alternarPlanoAcao } from "@/app/expand/actions";

export type AcaoFull = {
  id: string; titulo: string; detalhe: string | null;
  responsaveis: string[] | null; data_limite: string | null; hora: string | null;
  status: string; origem: string | null; prioridade: string | null;
  concluida_em: string | null;
};

export type Membro = { id: string; nome: string; cor: string; ini: string };

const PRIOR_META: Record<string, { l: string; c: string; order: number }> = {
  urgente: { l: "Urgente", c: "#CE6A5F", order: 0 },
  alta:    { l: "Alta",    c: "#D9A94E", order: 1 },
  normal:  { l: "Normal",  c: "#6FBF92", order: 2 },
  baixa:   { l: "Baixa",   c: "#7C8C7F", order: 3 },
};

const fld: React.CSSProperties = {
  width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)",
  borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 12.5, fontFamily: "inherit",
  outline: "none", boxSizing: "border-box",
};

function MemberPicker({ membros, selected, onChange }: {
  membros: Membro[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (nome: string) => {
    onChange(selected.includes(nome) ? selected.filter((n) => n !== nome) : [...selected, nome]);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {membros.map((m) => {
        const on = selected.includes(m.nome);
        return (
          <button key={m.id} type="button" onClick={() => toggle(m.nome)}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
              borderRadius: 20, border: `1px solid ${on ? m.cor : "var(--line)"}`,
              background: on ? `color-mix(in srgb,${m.cor} 16%,transparent)` : "transparent",
              color: on ? m.cor : "var(--dim)", cursor: "pointer", fontSize: 11.5, fontFamily: "inherit",
              transition: "all .12s",
            }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: on ? m.cor : "var(--line)", color: on ? "#fff" : "var(--dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
              {m.ini}
            </span>
            {m.nome.split(" ")[0]}
          </button>
        );
      })}
    </div>
  );
}

function AcaoForm({
  acao, membros, onClose, isEdit,
}: {
  acao?: AcaoFull; membros: Membro[];
  onClose: () => void; isEdit: boolean;
}) {
  const [titulo, setTitulo] = useState(acao?.titulo ?? "");
  const [detalhe, setDetalhe] = useState(acao?.detalhe ?? "");
  const [resp, setResp] = useState<string[]>(acao?.responsaveis ?? []);
  const [data, setData] = useState(acao?.data_limite ?? "");
  const [prior, setPrior] = useState(acao?.prioridade ?? "normal");
  const [, start] = useTransition();
  const meta = PRIOR_META[prior] ?? PRIOR_META.normal;

  const handleSubmit = () => {
    if (!titulo.trim()) return;
    const fd = new FormData();
    if (isEdit) fd.set("id", acao!.id);
    fd.set("titulo", titulo);
    fd.set("responsaveis", resp.join(","));
    fd.set("data_limite", data);
    fd.set("prioridade", prior);
    fd.set("detalhe", detalhe);
    start(async () => {
      if (isEdit) await editarAcaoPlano(fd);
      else await novaAcaoPlano(fd);
      onClose();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{isEdit ? "Editar ação" : "Nova ação"}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
      </div>

      {/* Título */}
      <div>
        <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700, marginBottom: 5 }}>O que fazer</div>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Descrição da ação..." style={fld} autoFocus />
      </div>

      {/* Detalhe */}
      <div>
        <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700, marginBottom: 5 }}>Detalhamento</div>
        <textarea value={detalhe} onChange={(e) => setDetalhe(e.target.value)} placeholder="Contexto, critério, como fazer..." rows={2}
          style={{ ...fld, resize: "vertical" }} />
      </div>

      {/* Prioridade */}
      <div>
        <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700, marginBottom: 5 }}>Prioridade</div>
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

      {/* Responsáveis */}
      <div>
        <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700, marginBottom: 5 }}>Quem</div>
        <MemberPicker membros={membros} selected={resp} onChange={setResp} />
      </div>

      {/* Data */}
      <div>
        <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700, marginBottom: 5 }}>Data limite</div>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ ...fld, colorScheme: "dark" }} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <button onClick={onClose}
          style={{ flex: 1, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, fontSize: 13, color: "var(--dim)", cursor: "pointer", fontWeight: 600 }}>
          Cancelar
        </button>
        <button onClick={handleSubmit} disabled={!titulo.trim()}
          style={{ flex: 2, background: meta.c, color: "#fff", border: "none", borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: titulo.trim() ? 1 : 0.5 }}>
          {isEdit ? "Salvar" : "Adicionar ação"}
        </button>
      </div>
    </div>
  );
}

function AcaoCard({
  a, membros, isAdmin, membroMap,
}: {
  a: AcaoFull; membros: Membro[]; isAdmin: boolean;
  membroMap: Map<string, Membro>;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [, start] = useTransition();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const done  = a.status === "done";
  const d     = a.data_limite ? new Date(a.data_limite + "T12:00") : null;
  const late  = !done && d && d < today;
  const prior = PRIOR_META[a.prioridade ?? "normal"] ?? PRIOR_META.normal;
  const borderC = done ? "var(--dim)" : late ? "var(--red)" : prior.c;

  if (editing) {
    return (
      <div style={{ background: "var(--panel-2)", border: `1px solid var(--line)`, borderRadius: 12, padding: "14px 16px" }}>
        <AcaoForm acao={a} membros={membros} onClose={() => setEditing(false)} isEdit />
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
      opacity: done ? 0.6 : 1, transition: "opacity .15s",
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
          {/* Priority chip */}
          {!done && (
            <span style={{
              fontSize: 10.5, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
              background: `color-mix(in srgb,${prior.c} 14%,transparent)`, color: prior.c,
            }}>
              {prior.l}
            </span>
          )}
          {/* Responsáveis */}
          {(a.responsaveis ?? []).map((r) => {
            const m = membroMap.get(r);
            const cor = m?.cor ?? "var(--accent)";
            return (
              <span key={r} style={{
                display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: cor,
                background: `color-mix(in srgb,${cor} 12%,transparent)`,
                borderRadius: 20, padding: "2px 8px",
              }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: cor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 900, flexShrink: 0 }}>
                  {(m?.ini ?? r.slice(0, 2).toUpperCase())}
                </span>
                {r.split(" ")[0]}
              </span>
            );
          })}
          {/* Date */}
          {d && (
            <span style={{ fontSize: 11, color: late ? "var(--red)" : "var(--dim)", fontWeight: late ? 700 : 400 }}>
              {late ? "⚠ " : ""}
              {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              {a.hora ? ` · ${a.hora}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Admin actions */}
      {isAdmin && !done && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={() => setEditing(true)} style={{ background: "none", border: "1px solid var(--line)", borderRadius: 7, padding: "3px 8px", fontSize: 11, color: "var(--dim)", cursor: "pointer" }}>Editar</button>
          <button onClick={() => setDeleting(true)} style={{ background: "none", border: "1px solid var(--line)", borderRadius: 7, padding: "3px 8px", fontSize: 11, color: "var(--dim)", cursor: "pointer" }}>✕</button>
        </div>
      )}
    </div>
  );
}

export function PlanoAcaoClient({
  acoes, membros, isAdmin,
}: {
  acoes: AcaoFull[]; membros: Membro[]; isAdmin: boolean;
}) {
  const [filtro, setFiltro] = useState<"todas" | "pendentes" | "feitas">("pendentes");
  const [filtroPrior, setFiltroPrior] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const membroMap = new Map(membros.map((m) => [m.nome, m]));

  // Sort: urgente > alta > normal > baixa, then by date
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

  const total   = acoes.length;
  const feitas  = acoes.filter((a) => a.status === "done").length;
  const pct     = total ? Math.round((feitas / total) * 100) : 0;

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
              style={{ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: filtro === f ? "var(--accent)" : "transparent", color: filtro === f ? "#fff" : "var(--dim)", transition: "all .12s", fontFamily: "inherit" }}>
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
            style={{ marginLeft: "auto", background: showAdd ? "var(--panel-2)" : "var(--accent)", color: showAdd ? "var(--dim)" : "#fff", border: showAdd ? "1px solid var(--line)" : "none", borderRadius: 9, padding: "6px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
            {showAdd ? "✕ Cancelar" : "+ Nova ação"}
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && isAdmin && (
        <div style={{ background: "var(--panel-2)", border: "1px solid var(--accent)", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
          <AcaoForm membros={membros} onClose={() => setShowAdd(false)} isEdit={false} />
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
            <AcaoCard key={a.id} a={a} membros={membros} isAdmin={isAdmin} membroMap={membroMap} />
          ))
        )}
      </div>
    </div>
  );
}
