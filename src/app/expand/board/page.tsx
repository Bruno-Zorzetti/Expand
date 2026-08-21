import type { CSSProperties } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FASES, AREAS, AG_COR, AG_NOME } from "@/lib/expand-esteira";
import { MAT_COR, type ClienteRow } from "@/lib/expand";
import { ETAPA_STATUS, type EtapaRow } from "@/lib/expand-tarefas";
import { garantirEtapas, adicionarEtapaCliente, salvarGrupoCliente, testarGrupoCliente } from "@/app/expand/actions";
import { getAcesso } from "@/lib/expand-acesso";
import { listarGrupos } from "@/lib/whatsapp";
import { KanbanBoard, type EtapaK } from "./KanbanBoard";
import { BoardSidebar, type SidebarCliente } from "./BoardSidebar";

export const dynamic = "force-dynamic";

function urgencia(c: ClienteRow): "critico" | "atencao" | "normal" {
  const risco =
    c.exec != null && c.rel != null && c.exec - c.rel >= 4 ? "churn"
    : c.exec != null && c.exec <= 4 ? "execucao"
    : c.rel != null && c.rel <= 5 ? "relacao" : "ok";
  if (risco === "churn" || (c.exec != null && c.exec <= 3)) return "critico";
  if (c.perfil?.crit) return "atencao";
  return "normal";
}

const URG_COR: Record<string, string> = {
  critico: "var(--red)", atencao: "var(--warn)", normal: "var(--green)",
};

const inputSt: CSSProperties = {
  width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)",
  borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13,
  outline: "none", fontFamily: "inherit",
};
const labelCap: CSSProperties = {
  fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em",
  color: "var(--dim)", fontWeight: 700, display: "block", marginBottom: 4,
};

export default async function Board({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; v?: string }>;
}) {
  const sp = await searchParams;
  const viewMode = sp.v === "kanban" ? "kanban" : "lista";
  const supabase = await createClient();

  const { data } = await supabase.from("expand_clientes").select("*").eq("ativo", true).order("nome");
  const clientes = (data ?? []) as ClienteRow[];
  const sel = clientes.find((c) => c.id === sp.c) ?? clientes[0];

  if (!sel) {
    return (
      <>
        <p className="hx-eyebrow">Estado da conta</p>
        <h1 className="ex-h1">Board de Entrega</h1>
        <p className="ex-sub">Nenhuma conta ativa.</p>
      </>
    );
  }

  const { data: etData } = await supabase.from("expand_etapas").select("*").eq("cliente_id", sel.id).order("ordem");
  const etapas = (etData ?? []) as EtapaRow[];
  const { isAdmin } = await getAcesso();
  const grupos = isAdmin ? await listarGrupos() : [];
  const selWpp = sel as ClienteRow & { whatsapp_grupo?: string | null; whatsapp_grupo_nome?: string | null };

  const { data: prodData } = await supabase.from("expand_prod_etapas").select("produto_slug");
  const prodSlugs = Array.from(new Set((prodData ?? []).map((p: { produto_slug: string }) => p.produto_slug)));
  const { data: prodNomes } = await supabase.from("products").select("slug, name").in("slug", prodSlugs.length ? prodSlugs : ["_"]);
  const nomeProduto = new Map((prodNomes ?? []).map((p: { slug: string; name: string }) => [p.slug, p.name]));
  const produtos = prodSlugs
    .map((s) => ({ slug: s, nome: nomeProduto.get(s) ?? s }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const counts = new Map<string, { total: number; aprovados: number }>();
  if (etapas.length) {
    const ids = etapas.map((e) => e.id);
    const { data: arqs } = await supabase.from("expand_arquivos").select("etapa_id,status").in("etapa_id", ids);
    (arqs ?? []).forEach((a: { etapa_id: string; status: string }) => {
      const g = counts.get(a.etapa_id) ?? { total: 0, aprovados: 0 };
      g.total++; if (a.status === "aprovado") g.aprovados++;
      counts.set(a.etapa_id, g);
    });
  }

  const porFase = new Map<number, EtapaRow[]>();
  etapas.forEach((e) => { const arr = porFase.get(e.fase) ?? []; arr.push(e); porFase.set(e.fase, arr); });

  const concluidas = etapas.filter((e) => e.status === "done").length;
  const emExecucao = etapas.filter((e) => e.status === "run").length;
  const pct = etapas.length ? Math.round((concluidas / etapas.length) * 100) : 0;
  const matCor = MAT_COR[sel.maturidade ?? ""] ?? "var(--accent)";

  const etapasK: EtapaK[] = etapas.map((e) => {
    const cnt = counts.get(e.id) ?? { total: 0, aprovados: 0 };
    return {
      id: e.id, titulo: e.titulo, area: e.area, agente: e.agente,
      responsavel: e.responsavel, responsavel_atual: e.responsavel_atual,
      status: e.status, sla: e.sla, marco: e.marco ?? false,
      data_prevista: e.data_prevista, iniciada_em: e.iniciada_em, ordem: e.ordem ?? 0,
      arquivos_total: cnt.total, arquivos_aprovados: cnt.aprovados,
      bloqueado: !!(e as { bloqueado?: boolean }).bloqueado,
      chamado: !!(e as { chamado?: boolean }).chamado,
    };
  });

  const sidebarClientes: SidebarCliente[] = clientes.map((c) => ({
    id: c.id, nome: c.nome, maturidade: c.maturidade,
    urgencia: urgencia(c),
  }));

  return (
    <>
      <style>{`
        /* ── Board responsive layout ─────────────────────────── */
        .board-layout { display: flex; gap: 20px; align-items: flex-start; }
        .board-sidebar-wrap { display: contents; }
        .board-mobile-nav { display: none; }

        /* client banner: stack on narrow screens */
        .board-banner-inner { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
        .board-banner-stats { display: flex; gap: 20px; align-items: center; }

        /* action bar: wrap on mobile */
        .board-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }

        /* phase list task row */
        .board-taskrow { display: flex; align-items: center; gap: 12px; padding: 10px 16px; }
        .board-taskrow-meta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

        @media (max-width: 900px) {
          /* hide desktop sidebar, show mobile nav */
          .board-sidebar-wrap { display: none; }
          .board-mobile-nav { display: flex; }
          .board-layout { display: block; }

          .board-banner-stats { gap: 14px; }
        }

        @media (max-width: 640px) {
          .board-banner-inner { gap: 10px; }
          .board-banner-stats { display: none; }
          .board-taskrow { padding: 9px 12px; gap: 8px; }
          .board-taskrow-meta { gap: 6px; }
        }

        /* hover on task rows */
        .board-phaserow:hover { background: var(--panel-2) !important; }
      `}</style>

      <p className="hx-eyebrow">Estado da conta</p>
      <h1 className="ex-h1" style={{ marginBottom: 16 }}>
        Board de <span className="hx-accent-text">Entrega</span>
      </h1>

      {/* Mobile client strip — appears only below 900px */}
      <div className="board-mobile-nav" style={{
        overflowX: "auto", gap: 6, paddingBottom: 8, marginBottom: 14,
        scrollSnapType: "x mandatory",
      }}>
        {clientes.map((c) => {
          const ug = urgencia(c);
          const isSel = c.id === sel.id;
          return (
            <Link key={c.id}
              href={`/expand/board?c=${c.id}${viewMode === "kanban" ? "&v=kanban" : ""}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 12px", borderRadius: 22, textDecoration: "none",
                flexShrink: 0, scrollSnapAlign: "start",
                background: isSel ? "var(--accent)" : "var(--panel)",
                border: `1px solid ${isSel ? "var(--accent)" : "var(--line-2)"}`,
                color: isSel ? "#fff" : "var(--txt)",
                fontSize: 12.5, fontWeight: isSel ? 700 : 500,
                transition: "all .12s",
              }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: isSel ? "rgba(255,255,255,.75)" : URG_COR[ug],
                boxShadow: isSel ? "none" : `0 0 4px ${URG_COR[ug]}`,
                flexShrink: 0,
              }} />
              {c.nome}
            </Link>
          );
        })}
      </div>

      <div className="board-layout">

        {/* ── Desktop sidebar (client component with toggle) ─── */}
        <div className="board-sidebar-wrap">
          <BoardSidebar
            clientes={sidebarClientes}
            selectedId={sel.id}
            viewMode={viewMode}
          />
        </div>

        {/* ── Main content column ──────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Client header + progress */}
          <div style={{
            background: "var(--panel)", border: "1px solid var(--line-2)",
            borderRadius: 14, padding: "16px 20px", marginBottom: 14,
          }}>
            <div className="board-banner-inner" style={{ marginBottom: etapas.length ? 14 : 0 }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "var(--txt)" }}>{sel.nome}</span>
                  {sel.maturidade && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: matCor,
                      background: `color-mix(in srgb, ${matCor} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${matCor} 28%, transparent)`,
                      borderRadius: 20, padding: "2px 10px",
                    }}>{sel.maturidade}</span>
                  )}
                  {sel.segmento && (
                    <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{sel.segmento}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 5 }}>
                  Relação {sel.rel ?? "—"} · Execução {sel.exec ?? "—"}
                  {sel.depende_de && (
                    <span style={{ marginLeft: 8 }}>
                      · Depende de: <b style={{ color: "var(--warn)" }}>{sel.depende_de}</b>
                    </span>
                  )}
                </div>
              </div>

              {etapas.length > 0 && (
                <div className="board-banner-stats">
                  {emExecucao > 0 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>{emExecucao}</div>
                      <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em" }}>ativas</div>
                    </div>
                  )}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--txt)" }}>
                      {concluidas}/{etapas.length}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em" }}>etapas</div>
                  </div>
                </div>
              )}
            </div>

            {etapas.length > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "var(--dim)" }}>Progresso geral</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 80 ? "var(--green)" : "var(--accent)" }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: "var(--line)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 4, width: `${pct}%`,
                    background: "linear-gradient(90deg, var(--accent), var(--green))",
                    transition: "width .5s ease",
                  }} />
                </div>
              </>
            )}

            {sel.pendencia && (
              <div style={{
                marginTop: 12, padding: "8px 12px",
                background: "color-mix(in srgb, var(--warn) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--warn) 25%, transparent)",
                borderRadius: 8, fontSize: 12.5, color: "var(--warn)",
              }}>⚠ {sel.pendencia}</div>
            )}
          </div>

          {/* Action bar */}
          <div className="board-actions">
            <div style={{ display: "flex", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 9, padding: 2 }}>
              <Link href={`/expand/board?c=${sel.id}`} style={{
                textDecoration: "none", fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 7,
                background: viewMode === "lista" ? "var(--accent)" : "transparent",
                color: viewMode === "lista" ? "#fff" : "var(--dim)", transition: "all .15s",
              }}>Fases</Link>
              <Link href={`/expand/board?c=${sel.id}&v=kanban`} style={{
                textDecoration: "none", fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 7,
                background: viewMode === "kanban" ? "var(--accent)" : "transparent",
                color: viewMode === "kanban" ? "#fff" : "var(--dim)", transition: "all .15s",
              }}>Kanban</Link>
            </div>
            <Link href={`/portal/${sel.id}`} className="hx-btn hx-btn-ghost" style={{ padding: "7px 13px", fontSize: 12 }}>
              Portal ↗
            </Link>
            {etapas.length ? (
              <Link href={`/expand/board/squad?c=${sel.id}`} className="hx-btn hx-btn-ghost" style={{ padding: "7px 13px", fontSize: 12 }}>
                🧩 Squad
              </Link>
            ) : null}
          </div>

          {/* Nova tarefa */}
          <details className="hx-glass" style={{ borderRadius: 12, marginBottom: 12 }}>
            <summary style={{ listStyle: "none", cursor: "pointer", padding: "10px 16px", fontWeight: 700, fontSize: 13 }}>
              ＋ Nova tarefa para <span style={{ color: "var(--accent)" }}>{sel.nome}</span>
              <span style={{ fontWeight: 400, fontSize: 11.5, color: "var(--dim)", marginLeft: 6 }}>· demanda avulsa</span>
            </summary>
            <form action={adicionarEtapaCliente} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, padding: "12px 16px 16px", borderTop: "1px solid var(--line)" }}>
              <input type="hidden" name="clienteId" value={sel.id} />
              <label style={{ gridColumn: "1 / -1" }}>
                <span style={labelCap}>O que precisa ser feito</span>
                <input name="titulo" required placeholder="ex.: Gravar 2 reels extras" style={inputSt} />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <span style={labelCap}>Critério de conclusão</span>
                <input name="criterio" placeholder="o que caracteriza pronto" style={inputSt} />
              </label>
              <label>
                <span style={labelCap}>Responsável</span>
                <input name="responsavel" placeholder="A definir" style={inputSt} />
              </label>
              <label>
                <span style={labelCap}>SLA</span>
                <input name="sla" placeholder="ex.: 2 dias" style={inputSt} />
              </label>
              <div style={{ gridColumn: "1 / -1" }}>
                <button className="hx-btn hx-btn-primary" type="submit">Adicionar à esteira</button>
              </div>
            </form>
          </details>

          {/* WhatsApp (admin) */}
          {isAdmin && (
            <details className="hx-glass" style={{ borderRadius: 12, marginBottom: 12, borderLeft: "3px solid var(--green)" }}>
              <summary style={{ listStyle: "none", cursor: "pointer", padding: "10px 16px", fontWeight: 700, fontSize: 13 }}>
                💬 Grupo de WhatsApp
                <span style={{ fontWeight: 400, fontSize: 11.5, color: "var(--dim)", marginLeft: 6 }}>
                  {selWpp.whatsapp_grupo ? `conectado: ${selWpp.whatsapp_grupo_nome ?? "grupo"}` : "não configurado"}
                </span>
              </summary>
              <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
                {grupos.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--warn)", margin: 0 }}>Conecte o WhatsApp em Integrações para listar os grupos.</p>
                )}
                <form action={salvarGrupoCliente} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="hidden" name="clienteId" value={sel.id} />
                  {grupos.length ? (
                    <select name="jid" defaultValue={selWpp.whatsapp_grupo ?? ""}
                      style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 12.5, minWidth: 220, fontFamily: "inherit" }}>
                      <option value="">— sem grupo —</option>
                      {grupos.map((g) => <option key={g.jid} value={g.jid}>{g.nome}</option>)}
                    </select>
                  ) : (
                    <input name="jid" defaultValue={selWpp.whatsapp_grupo ?? ""} placeholder="JID do grupo"
                      style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 12.5, minWidth: 240, fontFamily: "inherit" }} />
                  )}
                  <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>Salvar</button>
                </form>
                {selWpp.whatsapp_grupo && (
                  <form action={testarGrupoCliente}>
                    <input type="hidden" name="clienteId" value={sel.id} />
                    <button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>📨 Enviar mensagem de teste</button>
                  </form>
                )}
              </div>
            </details>
          )}

          {/* ── Main content: empty / kanban / fases ─────────── */}
          {etapas.length === 0 ? (
            <div style={{
              background: "var(--panel)", border: "1px solid var(--line-2)",
              borderRadius: 14, padding: "28px 24px",
            }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>📋</div>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Esteira não preparada</p>
              <p style={{ color: "var(--mut)", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                Escolha o produto contratado por <b>{sel.nome}</b> — a sequência de trabalho é criada automaticamente com os status corretos para a maturidade atual.
              </p>
              <form action={garantirEtapas} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                <input type="hidden" name="clienteId" value={sel.id} />
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={labelCap}>Produto</span>
                  <select name="produtoSlug"
                    defaultValue={(sel as { produto_slug?: string | null }).produto_slug ?? "pide"}
                    style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 12px", fontSize: 13, minWidth: 220, fontFamily: "inherit" }}>
                    {produtos.map((p) => <option key={p.slug} value={p.slug}>{p.nome}</option>)}
                  </select>
                </label>
                <button className="hx-btn hx-btn-primary" type="submit">Criar sequência de trabalho</button>
              </form>
              <p style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 16, lineHeight: 1.5, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                Depois, o <a href="/expand/equipe/gerente-projetos" style={{ color: "var(--accent)", textDecoration: "none" }}>PMO</a> distribui as tarefas conforme a agenda da equipe.
              </p>
            </div>

          ) : viewMode === "kanban" ? (
            <KanbanBoard etapas={etapasK} clienteId={sel.id} />

          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FASES.map((f) => {
                const es = porFase.get(f.id) ?? [];
                if (!es.length) return null;
                const st = es.every((e) => e.status === "done") ? "done"
                  : es.some((e) => e.status === "run") ? "run" : "idle";
                const faseDone = es.filter((e) => e.status === "done").length;
                const SC = {
                  done: { c: "var(--green)", bg: "color-mix(in srgb, var(--green) 10%, transparent)" },
                  run: { c: "var(--accent)", bg: "color-mix(in srgb, var(--accent) 10%, transparent)" },
                  idle: { c: "var(--dim)", bg: "var(--panel-2)" },
                }[st];
                return (
                  <div key={f.id} style={{ background: "var(--panel)", border: "1px solid var(--line-2)", borderRadius: 14, overflow: "hidden" }}>
                    {/* Phase header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line)", background: SC.bg, flexWrap: "wrap" }}>
                      <span style={{ width: 28, height: 28, borderRadius: "50%", background: SC.c, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{f.id}</span>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--txt)" }}>{f.nome}</div>
                        <div style={{ fontSize: 11, color: "var(--dim)" }}>{f.janela} · {f.obj}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--dim)" }}>{faseDone}/{es.length}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: SC.c, background: `color-mix(in srgb, ${SC.c} 14%, transparent)`, borderRadius: 20, padding: "2px 10px" }}>
                          {st === "done" ? "Concluída" : st === "run" ? "Em execução" : "Aguardando"}
                        </span>
                      </div>
                    </div>

                    {/* Tasks */}
                    {es.map((e, idx) => {
                      const cnt = counts.get(e.id) ?? { total: 0, aprovados: 0 };
                      const ar = e.area ? AREAS[e.area] : null;
                      const s = ETAPA_STATUS[e.status] ?? ETAPA_STATUS.idle;
                      return (
                        <Link key={e.id} href={`/expand/etapa/${e.id}`}
                          className="board-phaserow"
                          style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
                            textDecoration: "none", color: "inherit",
                            borderBottom: idx < es.length - 1 ? "1px solid var(--line)" : "none",
                            borderLeft: `3px solid ${ar ? ar.cor : "var(--line-2)"}`,
                          }}>
                          <span style={{
                            width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                            border: `2px solid ${e.status === "done" ? "var(--green)" : e.status === "run" ? "var(--accent)" : "var(--line-2)"}`,
                            background: e.status === "done" ? "var(--green)" : "transparent",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontSize: 10, fontWeight: 800,
                          }}>{e.status === "done" ? "✓" : ""}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {e.marco && <span style={{ color: "var(--accent)", marginRight: 4 }}>◆</span>}
                              {e.titulo}
                              {e.agente ? <span style={{ color: AG_COR[e.agente] ?? "var(--accent)", marginLeft: 8, fontSize: 11 }}>⚡ {AG_NOME[e.agente] ?? e.agente}</span> : null}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>
                              {ar && <span style={{ color: ar.cor, fontWeight: 700 }}>{ar.n}</span>}
                              {ar && " · "}
                              {e.responsavel_atual ?? e.responsavel}
                              {e.sla && ` · SLA ${e.sla}`}
                            </div>
                          </div>
                          <div className="board-taskrow-meta">
                            {cnt.total > 0 && (
                              <span style={{ fontSize: 11, color: cnt.aprovados === e.qtd_esperada ? "var(--green)" : "var(--dim)", fontWeight: 600 }}>
                                📎 {cnt.aprovados}/{e.qtd_esperada}
                              </span>
                            )}
                            <span style={{ fontSize: 11, fontWeight: 600, color: s.c }}>{s.l}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

        </div>{/* end main column */}
      </div>{/* end board-layout */}
    </>
  );
}
