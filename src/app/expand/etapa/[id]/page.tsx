import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AREAS, AG_COR, AG_NOME, AG_APROVA } from "@/lib/expand-esteira";
import { APROVACAO_ROTULO, ARQ_STATUS, ETAPA_STATUS, type EtapaRow, type ArquivoRow } from "@/lib/expand-tarefas";
import {
  subirArquivo, decidirArquivo, iniciarEtapa, concluirEtapa, transferirEtapa,
  abrirChamado, alternarBloqueio, adicionarLink, editarArquivo, removerArquivo, agendarEtapa,
  editarEtapa, addModeloEtapa, removeModeloEtapa, promoverParaProcesso, comentarEtapa,
  gerarCustoFinanceiro,
} from "@/app/expand/actions";
import EtapaPipeline from "@/components/expand/EtapaPipeline";
import { getAcesso } from "@/lib/expand-acesso";

export const dynamic = "force-dynamic";

type LogRow = { id: string; tipo: string; autor: string | null; detalhe: string | null; criado_em: string };
type ModeloRow = { id: string; titulo: string; conteudo: string | null; url: string | null; criado_por: string | null };

function fmt(d: string | null) { return d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"; }
function fmtHora(d: string) { return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
function slaDias(sla: string | null): number | null {
  if (!sla) return null;
  const md = sla.toLowerCase().match(/(\d+)\s*dia/); if (md) return Number(md[1]);
  const mh = sla.toLowerCase().match(/(\d+)\s*h/); if (mh) return Math.max(1, Math.round(Number(mh[1]) / 24));
  return null;
}
function duracaoTexto(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  if (h < 24) return `${h}h${m ? ` ${m}min` : ""}`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

const inp: React.CSSProperties = { width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, outline: "none", fontFamily: "inherit" };
const lbl: React.CSSProperties = { display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 };
const sep: React.CSSProperties = { height: 1, background: "var(--line)", margin: "12px 0" };

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
      <span style={{ color: "var(--dim)", flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--txt)", fontWeight: 500, textAlign: "right" }}>{children}</span>
    </div>
  );
}

export default async function EtapaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: et } = await supabase.from("expand_etapas").select("*").eq("id", id).single();
  if (!et) notFound();
  const etapa = et as EtapaRow;
  const { isAdmin } = await getAcesso();

  const { data: cli } = await supabase.from("expand_clientes").select("nome").eq("id", etapa.cliente_id).single();
  const { data: arqData } = await supabase.from("expand_arquivos").select("*").eq("etapa_id", id).order("enviado_em");
  const arquivos = (arqData ?? []) as ArquivoRow[];
  const { data: perfData } = await supabase.from("expand_perfis").select("id, nome, tipo").order("ordem");
  const perfis = (perfData ?? []) as { id: string; nome: string; tipo: string }[];
  const agentes = perfis.filter((p) => p.tipo === "agente");
  const { data: logData } = await supabase.from("expand_log").select("*").eq("etapa_id", id).order("criado_em", { ascending: false }).limit(60);
  const logs = (logData ?? []) as LogRow[];
  const { data: modData } = await supabase.from("expand_etapa_modelos").select("id, titulo, conteudo, url, criado_por").eq("etapa_id", id).order("criado_em");
  const modelos = (modData ?? []) as ModeloRow[];

  const comentarios = logs.filter(l => l.tipo === "comentario");
  const historico   = logs.filter(l => l.tipo !== "comentario");

  let prereq: { titulo: string; ok: boolean } | null = null;
  if (etapa.depende_de) {
    const { data: pr } = await supabase.from("expand_etapas").select("titulo, status").eq("cliente_id", etapa.cliente_id).eq("ordem", etapa.depende_de).single();
    if (pr) prereq = { titulo: pr.titulo as string, ok: pr.status === "done" };
  }

  const signed = new Map<string, string>();
  for (const a of arquivos) {
    if (a.tipo !== "link" && a.path) {
      const { data: s } = await supabase.storage.from("expand-entregaveis").createSignedUrl(a.path, 120);
      if (s?.signedUrl) signed.set(a.id, s.signedUrl);
    }
  }

  const aprovados = arquivos.filter((a) => a.status === "aprovado").length;

  // Custo/hora do responsável — admin only, nunca exposto à equipe
  const responsavelNome = etapa.responsavel_atual ?? etapa.responsavel;
  let custoHoraResponsavel: number | null = null;
  if (isAdmin && responsavelNome) {
    const { data: memData } = await supabase
      .from("expand_equipe")
      .select("custo_hora")
      .eq("nome", responsavelNome)
      .single();
    custoHoraResponsavel = memData?.custo_hora ?? null;
  }

  const ar = etapa.area ? AREAS[etapa.area] : null;
  const st = ETAPA_STATUS[etapa.status] ?? ETAPA_STATUS.idle;

  const rodando = etapa.status === "run" && etapa.iniciada_em && !etapa.concluida_em;
  const minutos = etapa.duracao_min ?? (etapa.iniciada_em ? Math.round(((etapa.concluida_em ? new Date(etapa.concluida_em).getTime() : Date.now()) - new Date(etapa.iniciada_em).getTime()) / 60000) : null);
  const slaD = slaDias(etapa.sla);
  const estourou = slaD != null && minutos != null && minutos > slaD * 1440;
  const slaBarPct = slaD && minutos ? Math.min(100, Math.round(minutos / (slaD * 1440) * 100)) : 0;

  const canStart = etapa.status !== "done" && (!etapa.iniciada_em || etapa.status === "idle");
  const canComplete = etapa.status === "run";

  return (
    <>
      <style>{`
        .etapa-grid { display: grid; grid-template-columns: minmax(0,2fr) minmax(0,1fr); gap: 20px; align-items: start; }
        @media (max-width: 800px) { .etapa-grid { grid-template-columns: 1fr; } }
        .etapa-sidebar { display: flex; flex-direction: column; gap: 12px; }
        .etapa-card { background: var(--panel-2); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
        .etapa-card-head { padding: 12px 16px; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 8px; }
        .etapa-card-body { padding: 14px 16px; }
        .etapa-action-card { border-left: 4px solid ${st.c}; }
        .comentario-avatar { width: 30px; height: 30px; border-radius: 50%; background: color-mix(in srgb,var(--accent) 20%,var(--panel-2)); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .acao-label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--dim); font-weight: 700; margin-bottom: 6px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4, alignItems: "center" }}>
        <Link href="/expand/v2" className="ex-back" style={{ marginBottom: 0 }}>← Hub do Dia</Link>
        <span style={{ color: "var(--line)", fontSize: 14 }}>/</span>
        <Link href={`/expand/board?c=${etapa.cliente_id}`} className="ex-back" style={{ marginBottom: 0, opacity: 0.65 }}>Board {cli?.nome ?? ""}</Link>
        <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 9px", borderRadius: 20, background: `color-mix(in srgb,${st.c} 15%,transparent)`, color: st.c, fontWeight: 700 }}>{st.l}</span>
        {ar && <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: `color-mix(in srgb,${ar.cor} 15%,transparent)`, color: ar.cor, fontWeight: 700 }}>{ar.n}</span>}
      </div>

      <p className="hx-eyebrow" style={{ marginBottom: 4 }}>{cli?.nome ?? "—"} · Fase {etapa.fase}</p>
      <h1 className="ex-h1" style={{ marginBottom: etapa.criterio ? 4 : 14 }}>
        {etapa.marco ? <span style={{ color: "var(--accent)" }}>◆ </span> : null}{etapa.titulo}
      </h1>
      {etapa.criterio && <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.55, marginBottom: 14 }}>{etapa.criterio}</p>}

      {/* ── Alerts ── */}
      {(etapa.bloqueado || etapa.chamado || (prereq && !prereq.ok)) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {etapa.bloqueado && <div style={{ borderLeft: "3px solid var(--red)", background: "color-mix(in srgb,var(--red) 8%,transparent)", padding: "9px 14px", borderRadius: "0 8px 8px 0", fontSize: 12.5 }}><b style={{ color: "var(--red)" }}>Bloqueada</b> — {etapa.bloqueio_motivo || "sem motivo"}</div>}
          {etapa.chamado && <div style={{ borderLeft: "3px solid var(--warn)", background: "color-mix(in srgb,var(--warn) 8%,transparent)", padding: "9px 14px", borderRadius: "0 8px 8px 0", fontSize: 12.5 }}><b style={{ color: "var(--warn)" }}>Chamado aberto</b> — {etapa.chamado_msg}</div>}
          {prereq && !prereq.ok && <div style={{ borderLeft: "3px solid var(--warn)", background: "color-mix(in srgb,var(--warn) 8%,transparent)", padding: "9px 14px", borderRadius: "0 8px 8px 0", fontSize: 12.5 }}>Aguarda <b>&ldquo;{prereq.titulo}&rdquo;</b> (etapa #{etapa.depende_de})</div>}
        </div>
      )}

      {/* ── 2-column layout ── */}
      <div className="etapa-grid">

        {/* ── LEFT: Main content ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Action card */}
          <div className="etapa-card etapa-action-card">
            <div className="etapa-card-head">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Status da tarefa</span>
              {rodando && (
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--accent)", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                  Cronômetro ativo · {minutos != null ? duracaoTexto(minutos) : "…"}
                </span>
              )}
              {etapa.status === "done" && minutos != null && (
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--green)" }}>✓ Concluída em {duracaoTexto(minutos)}</span>
              )}
            </div>
            <div className="etapa-card-body">
              {/* SLA bar */}
              {slaD && etapa.status !== "done" && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: "var(--dim)" }}>SLA: {etapa.sla}</span>
                    <span style={{ color: estourou ? "var(--red)" : "var(--dim)" }}>{slaBarPct}% consumido{estourou ? " — ACIMA" : ""}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "var(--line)" }}>
                    <div style={{ height: "100%", width: `${slaBarPct}%`, borderRadius: 3, background: estourou ? "var(--red)" : slaBarPct > 75 ? "var(--warn)" : "var(--accent)", transition: "width .3s" }} />
                  </div>
                </div>
              )}

              {/* Action button */}
              {etapa.status !== "done" ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {canStart ? (
                    <form action={iniciarEtapa}>
                      <input type="hidden" name="etapaId" value={etapa.id} />
                      <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "11px 28px", fontSize: 14.5, fontWeight: 700 }}>
                        ▶ Iniciar tarefa
                      </button>
                    </form>
                  ) : (
                    <form action={concluirEtapa}>
                      <input type="hidden" name="etapaId" value={etapa.id} />
                      <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "11px 28px", fontSize: 14.5, fontWeight: 700, background: "var(--green)" }}>
                        ✓ Concluir tarefa
                      </button>
                    </form>
                  )}
                  {canComplete && (
                    <span style={{ fontSize: 12, color: "var(--mut)" }}>
                      Iniciada em {fmt(etapa.iniciada_em)}
                      {etapa.responsavel_atual && ` · ${etapa.responsavel_atual}`}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15, color: "var(--green)", fontWeight: 700 }}>✓ Concluída</span>
                  <span style={{ fontSize: 12, color: "var(--dim)" }}>{fmt(etapa.iniciada_em)} → {fmt(etapa.concluida_em)}{minutos ? ` · ${duracaoTexto(minutos)}` : ""}</span>
                </div>
              )}

              {/* KPI strip */}
              <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
                <div>
                  <div style={lbl}>Entregáveis</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}><span style={{ color: "var(--accent)" }}>{aprovados}</span>/{etapa.qtd_esperada ?? 0}</div>
                </div>
                <div>
                  <div style={lbl}>Responsável</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{etapa.responsavel_atual ?? etapa.responsavel ?? "—"}</div>
                </div>
                {etapa.agente && (
                  <div>
                    <div style={lbl}>Agente IA</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: AG_COR[etapa.agente] }}>⚡ {AG_NOME[etapa.agente]}</div>
                  </div>
                )}
                {etapa.data_prevista && (
                  <div>
                    <div style={lbl}>Prazo</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(etapa.data_prevista)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rota da tarefa */}
          <div className="etapa-card">
            <div className="etapa-card-head">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Rota da tarefa</span>
              <span style={{ fontSize: 10.5, color: "var(--dim)", marginLeft: "auto" }}>histórico · tempo · custo</span>
            </div>
            <div className="etapa-card-body">
              <EtapaPipeline
                etapaId={etapa.id}
                titulo={etapa.titulo}
                area={etapa.area}
                agente={etapa.agente}
                responsavel={etapa.responsavel_atual ?? etapa.responsavel}
                status={etapa.status}
                duracao_min={minutos}
                iniciada_em={etapa.iniciada_em}
                concluida_em={etapa.concluida_em}
                logs={logs}
                isAdmin={isAdmin}
                custoHoraResponsavel={custoHoraResponsavel}
                onEnviarFinanceiro={gerarCustoFinanceiro}
              />
            </div>
          </div>

          {/* Entregáveis */}
          <div className="etapa-card">
            <div className="etapa-card-head">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Entregáveis</span>
              <span style={{ fontSize: 11, background: "var(--panel-2)", padding: "2px 8px", borderRadius: 20, color: "var(--dim)" }}>{arquivos.length}</span>
              <span style={{ fontSize: 11, color: "var(--dim)", marginLeft: "auto" }}>{APROVACAO_ROTULO[etapa.aprovacao] ?? etapa.aprovacao}</span>
            </div>
            {arquivos.length === 0 && (
              <div className="etapa-card-body" style={{ fontSize: 12.5, color: "var(--dim)" }}>Nenhum entregável ainda.</div>
            )}
            {arquivos.map((a) => {
              const s = ARQ_STATUS[a.status] ?? ARQ_STATUS.pendente;
              const href = a.tipo === "link" ? a.url : signed.get(a.id);
              return (
                <div key={a.id} className="ex-arq" style={{ borderBottom: "1px solid var(--line)", margin: "0 14px", paddingBottom: 8 }}>
                  <div className="an" style={{ minWidth: 180 }}>
                    <span style={{ color: "var(--dim)", marginRight: 5 }}>{a.tipo === "link" ? "🔗" : "📄"}</span>
                    {href ? <a className="ex-file" href={href} target="_blank" rel="noreferrer">{a.nome}</a> : a.nome}
                    <div className="am">Por {a.enviado_por ?? "—"} · {fmt(a.enviado_em)}{a.obs ? ` · ${a.obs}` : ""}</div>
                  </div>
                  <span className="ex-stat" style={{ background: `color-mix(in srgb,${s.c} 15%,transparent)`, color: s.c, flexShrink: 0 }}>{s.l}</span>
                  {a.status !== "aprovado" && <form action={decidirArquivo}><input type="hidden" name="arquivoId" value={a.id} /><input type="hidden" name="etapaId" value={etapa.id} /><input type="hidden" name="decisao" value="aprovado" /><button className="ex-arqbtn ok" type="submit">Aprovar</button></form>}
                  {a.status !== "ajuste" && <form action={decidirArquivo}><input type="hidden" name="arquivoId" value={a.id} /><input type="hidden" name="etapaId" value={etapa.id} /><input type="hidden" name="decisao" value="ajuste" /><button className="ex-arqbtn no" type="submit">Ajuste</button></form>}
                  <details>
                    <summary className="ex-arqbtn" style={{ listStyle: "none", cursor: "pointer" }}>Editar</summary>
                    <form action={editarArquivo} style={{ display: "grid", gap: 6, marginTop: 8, minWidth: 240 }}>
                      <input type="hidden" name="arquivoId" value={a.id} /><input type="hidden" name="etapaId" value={etapa.id} />
                      <input name="nome" defaultValue={a.nome} placeholder="Nome" style={inp} />
                      {a.tipo === "link" ? <input name="url" defaultValue={a.url ?? ""} placeholder="URL" style={inp} /> : null}
                      <input name="obs" defaultValue={a.obs ?? ""} placeholder="Observação" style={inp} />
                      <button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "6px 12px", fontSize: 12 }}>Salvar</button>
                    </form>
                  </details>
                  <form action={removerArquivo}><input type="hidden" name="arquivoId" value={a.id} /><input type="hidden" name="etapaId" value={etapa.id} /><button className="ex-arqbtn no" type="submit">Remover</button></form>
                </div>
              );
            })}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "14px 16px", borderTop: arquivos.length ? "1px solid var(--line)" : undefined }}>
              <form action={subirArquivo} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input type="hidden" name="etapaId" value={etapa.id} />
                <span style={{ ...lbl }}>Subir arquivo</span>
                <input type="file" name="file" required style={{ fontSize: 12, color: "var(--mut)" }} />
                <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "7px 13px", fontSize: 12, alignSelf: "flex-start" }}>Enviar</button>
              </form>
              <form action={adicionarLink} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input type="hidden" name="etapaId" value={etapa.id} />
                <span style={{ ...lbl }}>Adicionar link</span>
                <input name="nome" required placeholder="Nome do link" style={inp} />
                <input name="url" required placeholder="https://…" style={{ ...inp, marginTop: 4 }} />
                <button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "7px 13px", fontSize: 12, alignSelf: "flex-start", marginTop: 4 }}>Adicionar</button>
              </form>
            </div>
          </div>

          {/* Modelos */}
          <div className="etapa-card">
            <div className="etapa-card-head">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Como fazer</span>
              <span style={{ fontSize: 11, background: "var(--panel-2)", padding: "2px 8px", borderRadius: 20, color: "var(--dim)" }}>{modelos.length}</span>
              <span style={{ fontSize: 11, color: "var(--dim)", marginLeft: "auto" }}>modelos · exemplos · referências</span>
            </div>
            <div className="etapa-card-body">
              {modelos.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {modelos.map((m) => (
                    <div key={m.id} style={{ borderLeft: "3px solid var(--accent)", background: "color-mix(in srgb,var(--accent) 5%,var(--panel-2))", borderRadius: "0 10px 10px 0", padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{m.titulo}</span>
                        {m.url ? <a href={m.url} target="_blank" rel="noreferrer" className="ex-file" style={{ fontSize: 11 }}>abrir ↗</a> : null}
                        {isAdmin && <form action={removeModeloEtapa} style={{ marginLeft: "auto" }}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="etapaId" value={etapa.id} /><button className="ex-arqbtn no" type="submit" style={{ padding: "3px 8px", fontSize: 10.5 }}>remover</button></form>}
                      </div>
                      {m.conteudo ? <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, marginTop: 6, whiteSpace: "pre-wrap" }}>{m.conteudo}</div> : null}
                      {m.criado_por ? <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 6 }}>por {m.criado_por}</div> : null}
                    </div>
                  ))}
                </div>
              )}
              <details>
                <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 700, listStyle: "none" }}>+ Adicionar modelo / exemplo</summary>
                <form action={addModeloEtapa} style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  <input type="hidden" name="etapaId" value={etapa.id} />
                  <label><span style={lbl}>Título</span><input name="titulo" required placeholder="ex.: Ficha de dados cadastrais" style={inp} /></label>
                  <label><span style={lbl}>Como fazer / conteúdo</span><textarea name="conteudo" rows={4} placeholder="Passo a passo, o que pedir, campos da ficha…" style={{ ...inp, resize: "vertical" }} /></label>
                  <label><span style={lbl}>Link (Drive, planilha…) — opcional</span><input name="url" placeholder="https://…" style={inp} /></label>
                  <div><button className="hx-btn hx-btn-primary" type="submit">Adicionar</button></div>
                </form>
              </details>
            </div>
          </div>

          {/* Comentários */}
          <div className="etapa-card">
            <div className="etapa-card-head">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Comentários</span>
              <span style={{ fontSize: 11, background: "var(--panel-2)", padding: "2px 8px", borderRadius: 20, color: "var(--dim)" }}>{comentarios.length}</span>
            </div>
            <div className="etapa-card-body">
              {comentarios.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
                  {[...comentarios].reverse().map((c) => (
                    <div key={c.id} style={{ display: "flex", gap: 10 }}>
                      <div className="comentario-avatar">{(c.autor ?? "?").charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 3 }}>
                          {c.autor ?? "—"}
                          <span style={{ fontWeight: 400, color: "var(--dim)", fontSize: 10.5, marginLeft: 8 }}>{fmtHora(c.criado_em)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.55, background: "var(--panel-2)", borderRadius: 8, padding: "8px 12px" }}>{c.detalhe}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 14 }}>Nenhum comentário ainda. Deixe um abaixo.</p>
              )}
              <form action={comentarEtapa} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <input type="hidden" name="etapaId" value={etapa.id} />
                <textarea name="texto" required placeholder="Deixe um comentário, anotação ou observação…" rows={2} style={{ ...inp, resize: "vertical", flex: 1 }} />
                <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 16px", fontSize: 12.5, flexShrink: 0 }}>Comentar</button>
              </form>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="etapa-sidebar">

          {/* Info card */}
          <div className="etapa-card">
            <div className="etapa-card-head">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Informações</span>
            </div>
            <div className="etapa-card-body">
              <InfoRow label="Cliente">{cli?.nome ?? "—"}</InfoRow>
              <InfoRow label="Status"><span style={{ color: st.c, fontWeight: 700 }}>{st.l}</span></InfoRow>
              <InfoRow label="Área">{ar ? <span style={{ color: ar.cor }}>{ar.n}</span> : "—"}</InfoRow>
              <InfoRow label="Responsável">{etapa.responsavel_atual ?? etapa.responsavel ?? "—"}</InfoRow>
              <InfoRow label="SLA">{etapa.sla ?? "—"}</InfoRow>
              <InfoRow label="Prazo">{etapa.data_prevista ? fmt(etapa.data_prevista) : "—"}</InfoRow>
              <InfoRow label="Fase">{etapa.fase} · Etapa {etapa.ordem}</InfoRow>
              {etapa.marco && <InfoRow label="Marco"><span style={{ color: "var(--accent)" }}>◆ Marco do projeto</span></InfoRow>}
              {etapa.agente && <InfoRow label="Agente IA"><span style={{ color: AG_COR[etapa.agente] }}>⚡ {AG_NOME[etapa.agente]}</span></InfoRow>}
              {etapa.agente && <InfoRow label="Aprovação">{AG_APROVA[etapa.agente]}</InfoRow>}
              {etapa.gatilho && (
                <div style={{ marginTop: 10 }}>
                  <div style={lbl}>Começa quando</div>
                  <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5 }}>{etapa.gatilho}</div>
                </div>
              )}
            </div>
          </div>

          {/* Ações card */}
          <div className="etapa-card">
            <div className="etapa-card-head">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Ações</span>
            </div>
            <div className="etapa-card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Transferir */}
              <form action={transferirEtapa}>
                <input type="hidden" name="etapaId" value={etapa.id} />
                <div className="acao-label">Transferir para</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <select name="para" required style={{ ...inp, flex: 1 }}>
                    {perfis.map((p) => <option key={p.nome} value={p.nome}>{p.nome}{p.tipo === "agente" ? " (IA)" : ""}</option>)}
                  </select>
                  <button className="ex-arqbtn" type="submit" style={{ flexShrink: 0 }}>Ir</button>
                </div>
              </form>

              <div style={sep} />

              {/* Agendar */}
              <form action={agendarEtapa}>
                <input type="hidden" name="etapaId" value={etapa.id} />
                <div className="acao-label">Data prevista</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="date" name="data" defaultValue={etapa.data_prevista ?? ""} style={{ ...inp, flex: 1 }} />
                  <button className="ex-arqbtn" type="submit" style={{ flexShrink: 0 }}>OK</button>
                </div>
                {etapa.data_prevista && (
                  <button name="data" value="" className="ex-arqbtn no" type="submit" style={{ marginTop: 5, fontSize: 10.5 }}>Limpar data</button>
                )}
              </form>

              <div style={sep} />

              {/* Bloquear */}
              <form action={alternarBloqueio}>
                <input type="hidden" name="etapaId" value={etapa.id} />
                {!etapa.bloqueado && (
                  <div style={{ marginBottom: 6 }}>
                    <div className="acao-label">Motivo do bloqueio</div>
                    <input name="motivo" placeholder="Descreva o impedimento…" style={inp} />
                  </div>
                )}
                <button className="ex-arqbtn no" type="submit" style={{ width: "100%", textAlign: "center" }}>
                  {etapa.bloqueado ? "✓ Desbloquear tarefa" : "🔒 Bloquear tarefa"}
                </button>
              </form>

              <div style={sep} />

              {/* Chamado */}
              <form action={abrirChamado}>
                <input type="hidden" name="etapaId" value={etapa.id} />
                <div className="acao-label">Chamado / dúvida para o gestor</div>
                <textarea name="msg" required placeholder="Descreva a dúvida ou impedimento…" rows={2} style={{ ...inp, resize: "none", marginBottom: 6 }} />
                <button className="ex-arqbtn" type="submit" style={{ width: "100%", textAlign: "center" }}>Enviar chamado</button>
              </form>
            </div>
          </div>

          {/* Admin: Editar */}
          <details className="etapa-card">
            <summary style={{ listStyle: "none", cursor: "pointer", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13 }}>
              ✎ Editar tarefa
              <span style={{ fontSize: 10.5, fontWeight: 400, color: "var(--dim)", marginLeft: 4 }}>ajustes desta conta</span>
            </summary>
            <form action={editarEtapa} style={{ padding: "0 16px 16px", display: "grid", gap: 10, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <input type="hidden" name="etapaId" value={etapa.id} />
              <label><span style={lbl}>Título</span><input name="titulo" defaultValue={etapa.titulo} style={inp} /></label>
              <label><span style={lbl}>Critério de conclusão</span><textarea name="criterio" defaultValue={etapa.criterio ?? ""} rows={2} style={{ ...inp, resize: "vertical" }} /></label>
              <label><span style={lbl}>Gatilho</span><input name="gatilho" defaultValue={etapa.gatilho ?? ""} style={inp} /></label>
              <label><span style={lbl}>SLA</span><input name="sla" defaultValue={etapa.sla ?? ""} placeholder="ex.: 2 dias" style={inp} /></label>
              <label><span style={lbl}>Responsável</span>
                <select name="responsavel" defaultValue={etapa.responsavel ?? ""} style={inp}>
                  <option value="">—</option>
                  {perfis.map((p) => <option key={p.nome} value={p.nome}>{p.nome}{p.tipo === "agente" ? " (IA)" : ""}</option>)}
                </select>
              </label>
              <label><span style={lbl}>Agente que rascunha</span>
                <select name="agente" defaultValue={etapa.agente ?? ""} style={inp}>
                  <option value="">nenhum</option>
                  {agentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </label>
              <label><span style={lbl}>Qtd. esperada de arquivos</span><input name="qtd_esperada" type="number" min={1} defaultValue={etapa.qtd_esperada} style={inp} /></label>
              <label><span style={lbl}>Depende da etapa nº</span><input name="depende_de" type="number" min={1} defaultValue={etapa.depende_de ?? ""} placeholder="—" style={inp} /></label>
              <div style={{ display: "flex", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" name="marco" defaultChecked={etapa.marco} /> <span style={{ fontSize: 12 }}>Marco ◆</span></label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" name="visivel_cliente" defaultChecked={etapa.visivel_cliente} /> <span style={{ fontSize: 12 }}>Visível ao cliente</span></label>
              </div>
              <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 12.5 }}>Salvar alterações</button>
            </form>
          </details>

          {/* Admin: Promover */}
          {isAdmin && (
            <div className="etapa-card" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5, marginBottom: 10 }}>
                <b style={{ color: "var(--txt)" }}>Promover ao padrão?</b> Torna esta tarefa obrigatória para todos os clientes deste produto.
              </div>
              <form action={promoverParaProcesso}>
                <input type="hidden" name="etapaId" value={etapa.id} />
                <button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "8px 14px", fontSize: 12, width: "100%" }}>⬆ Promover ao processo padrão</button>
              </form>
            </div>
          )}

          {/* Histórico */}
          <div className="etapa-card">
            <div className="etapa-card-head">
              <span style={{ fontSize: 13, fontWeight: 700 }}>Histórico</span>
              <span style={{ fontSize: 11, background: "var(--panel-2)", padding: "2px 8px", borderRadius: 20, color: "var(--dim)" }}>{historico.length}</span>
            </div>
            <div className="etapa-card-body" style={{ maxHeight: 300, overflowY: "auto" }}>
              {historico.length > 0 ? historico.map((l) => (
                <div key={l.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.45 }}>{l.detalhe}</div>
                  <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 3 }}>{fmtHora(l.criado_em)}{l.autor ? ` · ${l.autor}` : ""}</div>
                </div>
              )) : <span style={{ fontSize: 12.5, color: "var(--dim)" }}>Sem registros ainda.</span>}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
