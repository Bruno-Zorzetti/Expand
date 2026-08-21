import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { derive, MAT_COR, RISCO_ROTULO, type ClienteRow } from "@/lib/expand";
import { getAcesso } from "@/lib/expand-acesso";
import { listarGrupos } from "@/lib/whatsapp";
import type { CSSProperties } from "react";
import {
  salvarLinkDrive, salvarGrupoCliente, testarGrupoCliente, rodarResumoAgora,
  adotarDemanda, salvarLinkGrupo, adicionarDiagnostico, gerarConvitePortal,
  atualizarCliente, excluirCliente, arquivarCliente,
} from "@/app/expand/actions";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Cli = ClienteRow & {
  whatsapp_grupo?: string | null; whatsapp_grupo_nome?: string | null;
  whatsapp_grupo_link?: string | null; drive_folder_url?: string | null;
  agente_id?: string | null; status?: string | null; produto_slug?: string | null;
  meta_receita?: number | null; logo_url?: string | null;
};
type Etapa = { id: string; titulo: string; area: string | null; sla: string | null; status: string | null; origem: string | null; visivel_cliente: boolean; criado_em: string; data_prevista: string | null };
type Log = { id: string; tipo: string | null; detalhe: string | null; autor: string | null; criado_em: string };

const ABAS = [
  { k: "geral", l: "Visão Geral" },
  { k: "drive", l: "Drive" },
  { k: "grupo", l: "WhatsApp" },
  { k: "historico", l: "Histórico" },
  { k: "diagnosticos", l: "Diagnósticos" },
  { k: "editar", l: "Configurações" },
];

const MOTIVOS = ["Preço", "Resultado insatisfatório", "Mudança de estratégia", "Concorrente", "Encerramento da empresa", "Prazo encerrado", "Outro"];

const fld: CSSProperties = { background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit", flex: 1, minWidth: 220 };
const ST_COR: Record<string, string> = { done: "var(--green)", run: "var(--accent)", idle: "var(--dim)", block: "var(--red)" };
const SEC: CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 8 };

export default async function ClienteHub({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; ok?: string }> }) {
  const { id } = await params;
  const { t, ok } = await searchParams;
  const aba = ABAS.find((a) => a.k === t)?.k ?? "geral";
  const supabase = await createClient();
  const { isAdmin } = await getAcesso();

  const { data: cData } = await supabase.from("expand_clientes").select("*").eq("id", id).maybeSingle();
  if (!cData) notFound();
  const cli = cData as Cli;
  const d = derive(cli);

  const { data: etData } = await supabase.from("expand_etapas").select("id, titulo, area, sla, status, origem, visivel_cliente, criado_em, data_prevista").eq("cliente_id", id).order("criado_em", { ascending: false });
  const etapas = (etData ?? []) as Etapa[];
  const { data: lgData } = await supabase.from("expand_log").select("id, tipo, detalhe, autor, criado_em").eq("cliente_id", id).order("criado_em", { ascending: false }).limit(60);
  const logs = (lgData ?? []) as Log[];

  const grupos = isAdmin && aba === "grupo" ? await listarGrupos() : [];
  type Resumo = { dia: string; resumo: string | null; atividades: string[]; demandas: { titulo: string; urgencia: string; importancia: string; citacao: string }[]; msgs_lidas: number; tokens_in: number; tokens_out: number; custo: number; modelo: string | null };
  let resumo: Resumo | null = null;
  let pessoas: { id: string; nome: string }[] = [];
  if (aba === "grupo") {
    const { data: rz } = await supabase.from("expand_cliente_resumo").select("dia, resumo, atividades, demandas, msgs_lidas, tokens_in, tokens_out, custo, modelo").eq("cliente_id", id).order("dia", { ascending: false }).limit(1).maybeSingle();
    resumo = (rz as Resumo) ?? null;
    if (isAdmin) { const { data: ps } = await supabase.from("expand_perfis").select("id, nome").eq("tipo", "humano").order("nome"); pessoas = (ps ?? []) as { id: string; nome: string }[]; }
  }
  type Diag = { id: string; detalhe: string | null; autor: string | null; criado_em: string };
  let diagnosticos: Diag[] = [];
  if (aba === "diagnosticos") {
    const { data: dg } = await supabase.from("expand_log").select("id, detalhe, autor, criado_em").eq("cliente_id", id).eq("tipo", "diagnostico").order("criado_em", { ascending: false });
    diagnosticos = (dg ?? []) as Diag[];
  }

  const extras = etapas.filter((e) => e.origem && e.origem !== "processo");
  const cor = MAT_COR[cli.maturidade ?? ""] ?? "var(--accent)";
  const stCor = d.risco === "ok" ? "var(--green)" : d.risco === "churn" ? "var(--red)" : "var(--warn)";
  const stLabel = d.risco === "ok" ? (cli.maturidade ?? "Saudável") : RISCO_ROTULO[d.risco];
  const dt = (s: string) => new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const feitas = etapas.filter((e) => e.status === "done").length;
  const emRun = etapas.filter((e) => e.status === "run").length;
  const portUrl = `${siteUrl()}/portal/${id}`;
  const ini = cli.nome.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <>
      <p className="hx-eyebrow"><Link href="/expand/carteira" style={{ color: "var(--dim)", textDecoration: "none" }}>Clientes</Link> · dossiê da conta</p>

      {/* ── Hero da conta ── */}
      <div className="hx-glass" style={{ borderRadius: 16, padding: "18px 20px", marginBottom: 4, position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${cor}, transparent 70%)` }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {/* Logo ou inicial */}
          {cli.logo_url ? (
            <img src={cli.logo_url} alt={cli.nome} style={{ width: 56, height: 56, borderRadius: 13, objectFit: "contain", background: "var(--panel-2)", padding: 4, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 15, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${cor} 20%, transparent)`, color: cor, fontWeight: 800, fontSize: 22, fontFamily: "var(--font-cinzel), serif", flexShrink: 0 }}>{ini}</div>
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 className="ex-h1" style={{ margin: 0, lineHeight: 1.1 }}>{cli.nome}</h1>
              <span className="ex-pill" style={{ background: `color-mix(in srgb, ${stCor} 16%, transparent)`, color: stCor }}>
                <i className="ex-dot" />{stLabel}
              </span>
            </div>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--mut)" }}>
              {cli.segmento ?? "Sem segmento"}{cli.maturidade ? ` · ${cli.maturidade}` : ""}
            </p>
          </div>
          {/* Métricas rápidas */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>Contrato</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)" }}>{cli.contrato_tipo ?? "—"}{(cli as { contrato_dur?: number | null }).contrato_dur ? ` · ${(cli as { contrato_dur?: number | null }).contrato_dur}m` : ""}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>Tarefas</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", fontVariantNumeric: "tabular-nums" }}>{feitas}/{etapas.length}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={portUrl} target="_blank" rel="noreferrer" className="hx-btn hx-btn-ghost" style={{ padding: "7px 13px", fontSize: 12 }}>Portal ↗</a>
              {cli.drive_folder_url && (
                <a href={cli.drive_folder_url} target="_blank" rel="noreferrer" className="hx-btn hx-btn-ghost" style={{ padding: "7px 13px", fontSize: 12 }}>Drive ↗</a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: "linear-gradient(var(--bg) 78%, transparent)", display: "flex", gap: 2, flexWrap: "wrap", borderBottom: "1px solid var(--line)", marginBottom: 20, paddingTop: 8 }}>
        {ABAS.map((a) => {
          const on = aba === a.k;
          return (
            <Link key={a.k} href={`/expand/clientes/${id}?t=${a.k}`} scroll={false}
              style={{ padding: "9px 14px", fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? "var(--txt)" : "var(--mut)", borderBottom: `2px solid ${on ? cor : "transparent"}`, textDecoration: "none", marginBottom: -1, transition: "color .15s" }}>
              {a.l}
              {a.k === "grupo" && resumo ? <span style={{ marginLeft: 5, fontSize: 10, background: "color-mix(in srgb,var(--green) 20%,transparent)", color: "var(--green)", borderRadius: 20, padding: "1px 6px", fontWeight: 700 }}>✓</span> : null}
              {a.k === "historico" && extras.length ? <span style={{ marginLeft: 5, fontSize: 10, background: "var(--panel-2)", color: "var(--dim)", borderRadius: 20, padding: "1px 6px", fontWeight: 700 }}>{extras.length}</span> : null}
            </Link>
          );
        })}
      </div>

      {/* ══════════ GERAL ══════════ */}
      {aba === "geral" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* KPIs */}
          <div className="ex-kpis">
            <div className="ex-kpi hx-glass"><div className="lab">Em execução</div><div className="val" style={{ color: "var(--accent)" }}>{emRun}</div><div className="foot">Tarefas ativas</div></div>
            <div className="ex-kpi hx-glass"><div className="lab">Concluídas</div><div className="val" style={{ color: "var(--green)" }}>{feitas}</div><div className="foot">de {etapas.length} total</div></div>
            <div className="ex-kpi hx-glass"><div className="lab">Saúde</div><div className="val" style={{ color: stCor, fontSize: 15 }}>{stLabel}</div><div className="foot">Risco calculado</div></div>
            <div className="ex-kpi hx-glass"><div className="lab">Extras</div><div className="val">{extras.length}</div><div className="foot">Fora do processo</div></div>
          </div>

          {/* Ações rápidas */}
          <div>
            <div style={SEC}>Ações rápidas</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
              {[
                { href: portUrl, ext: true, ic: "↗", t: "Portal do cliente", d: "Visão do cliente", c: "var(--accent)" },
                { href: `/expand/clientes/${id}?t=drive`, ic: "📂", t: "Drive", d: cli.drive_folder_url ? "Vinculado" : "Configurar", c: cli.drive_folder_url ? "var(--green)" : "var(--warn)" },
                { href: `/expand/clientes/${id}?t=grupo`, ic: "💬", t: "WhatsApp", d: cli.whatsapp_grupo ? `Conectado` : "Configurar", c: cli.whatsapp_grupo ? "var(--green)" : "var(--warn)" },
                { href: `/expand/clientes/${id}?t=diagnosticos`, ic: "◈", t: "Diagnósticos", d: "Ver e registrar", c: "var(--mut)" },
                { href: `/expand/v2?cliente=${id}`, ic: "⊞", t: "Tarefas (Kanban)", d: "Gerenciar etapas", c: "var(--mut)" },
                { href: `/expand/clientes/${id}?t=editar`, ic: "⚙", t: "Configurações", d: "Editar dados", c: "var(--mut)" },
              ].map((x) => (
                x.ext ? (
                  <a key={x.t} href={x.href} target="_blank" rel="noreferrer" className="hx-glass hx-glass-hover" style={{ borderRadius: 12, padding: "13px 14px", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 20 }}>{x.ic}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{x.t}</span>
                    <span style={{ fontSize: 11, color: x.c }}>{x.d}</span>
                  </a>
                ) : (
                  <Link key={x.t} href={x.href} scroll={false} className="hx-glass hx-glass-hover" style={{ borderRadius: 12, padding: "13px 14px", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 20 }}>{x.ic}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{x.t}</span>
                    <span style={{ fontSize: 11, color: x.c }}>{x.d}</span>
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Pendências + execução */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px" }}>
              <div style={SEC}>Em execução agora</div>
              {etapas.filter(e => e.status === "run").slice(0, 5).length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {etapas.filter(e => e.status === "run").slice(0, 5).map((e) => (
                    <Link key={e.id} href={`/expand/etapa/${e.id}`} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, textDecoration: "none", color: "inherit", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.titulo}</span>
                    </Link>
                  ))}
                </div>
              ) : <span style={{ fontSize: 12, color: "var(--dim)" }}>Nenhuma em execução.</span>}
            </div>
            <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px" }}>
              <div style={SEC}>Últimos eventos</div>
              {logs.slice(0, 5).length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {logs.slice(0, 5).map((l) => (
                    <div key={l.id} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--mut)", padding: "5px 0", borderBottom: "1px solid var(--line)" }}>
                      <span style={{ color: "var(--accent)", minWidth: 50, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}>{l.tipo ?? "—"}</span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.detalhe ?? "—"}</span>
                      <span style={{ fontSize: 10.5, color: "var(--dim)", flexShrink: 0 }}>{dt(l.criado_em)}</span>
                    </div>
                  ))}
                </div>
              ) : <span style={{ fontSize: 12, color: "var(--dim)" }}>Sem eventos ainda.</span>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ DRIVE ══════════ */}
      {aba === "drive" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: 32 }}>📂</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Pasta do cliente no Google Drive</div>
                <div style={{ fontSize: 12, color: "var(--mut)" }}>{cli.drive_folder_url ? "Vinculada — clique para abrir" : "Não configurada"}</div>
              </div>
              {cli.drive_folder_url && (
                <a href={cli.drive_folder_url} target="_blank" rel="noreferrer" className="hx-btn hx-btn-primary" style={{ padding: "9px 16px", fontSize: 12.5, textDecoration: "none" }}>
                  Abrir no Drive ↗
                </a>
              )}
            </div>
            {isAdmin && (
              <form action={salvarLinkDrive} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input type="hidden" name="clienteId" value={id} />
                <input name="url" defaultValue={cli.drive_folder_url ?? ""} placeholder="Cole o link da pasta do Drive (drive.google.com/…)" style={fld} />
                <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 15px", fontSize: 12.5 }}>Salvar</button>
              </form>
            )}
          </div>
          <div className="hx-glass" style={{ borderRadius: 14, padding: "14px 16px", opacity: .7 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Estrutura padrão de pastas</div>
            <div style={{ fontSize: 11.5, color: "var(--mut)", lineHeight: 1.7 }}>
              01 Documentos · 02 Planilhas · 03 Apresentações · 04 Entregáveis (Copy · Arte · Vídeo) · 05 Recebidos
            </div>
          </div>
        </div>
      )}

      {/* ══════════ GRUPO / WHATSAPP ══════════ */}
      {aba === "grupo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 28 }}>💬</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Grupo de WhatsApp</div>
                <div style={{ fontSize: 12, color: cli.whatsapp_grupo ? "var(--green)" : "var(--warn)" }}>
                  {cli.whatsapp_grupo ? `Conectado · ${cli.whatsapp_grupo_nome ?? "grupo"}` : "Não configurado"}
                </div>
              </div>
            </div>
            {isAdmin && (
              <>
                <form action={salvarGrupoCliente} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                  <input type="hidden" name="clienteId" value={id} />
                  {grupos.length ? (
                    <select name="jid" defaultValue={cli.whatsapp_grupo ?? ""} style={fld}>
                      <option value="">— sem grupo —</option>
                      {grupos.map((g) => <option key={g.jid} value={g.jid}>{g.nome}</option>)}
                    </select>
                  ) : (
                    <input name="jid" defaultValue={cli.whatsapp_grupo ?? ""} placeholder="JID do grupo (…@g.us)" style={fld} />
                  )}
                  <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 15px", fontSize: 12.5 }}>Salvar grupo</button>
                </form>
                {cli.whatsapp_grupo && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    <form action={testarGrupoCliente}><input type="hidden" name="clienteId" value={id} /><button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>📨 Enviar teste</button></form>
                    <form action={rodarResumoAgora}><input type="hidden" name="clienteId" value={id} /><button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>🧠 Rodar resumo agora</button></form>
                  </div>
                )}
                {cli.whatsapp_grupo && (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Link de convite (botão no portal)</div>
                    {cli.whatsapp_grupo_link && <a href={cli.whatsapp_grupo_link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--accent)", display: "block", marginBottom: 8 }}>{cli.whatsapp_grupo_link}</a>}
                    <form action={salvarLinkGrupo} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input type="hidden" name="clienteId" value={id} />
                      <input name="link" defaultValue={cli.whatsapp_grupo_link ?? ""} placeholder="https://chat.whatsapp.com/…" style={fld} />
                      <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 15px", fontSize: 12.5 }}>Salvar link</button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Resumo do dia */}
          {resumo ? (
            <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Resumo do dia</span>
                <span style={{ fontSize: 11, color: "var(--dim)" }}>
                  {new Date(resumo.dia + "T12:00").toLocaleDateString("pt-BR")} · {resumo.msgs_lidas} msgs · {resumo.tokens_in + resumo.tokens_out} tokens · ~US$ {Number(resumo.custo).toFixed(4)}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6, margin: "0 0 12px" }}>{resumo.resumo || "—"}</p>

              {/* Temas / combinados */}
              {resumo.atividades?.length ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--dim)", fontWeight: 700, marginBottom: 6 }}>Principais temas e combinados</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {resumo.atividades.map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--mut)" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Demandas → tarefas */}
              {resumo.demandas?.length ? (
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--warn)", fontWeight: 700, marginBottom: 8 }}>
                    Demandas detectadas — {resumo.demandas.length} (o PMO decide quais viram tarefas)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {resumo.demandas.map((dm, i) => (
                      <div key={i} className="hx-glass" style={{ borderRadius: 10, padding: "10px 12px", borderLeft: `3px solid ${dm.urgencia === "alta" ? "var(--red)" : dm.urgencia === "media" ? "var(--warn)" : "var(--dim)"}` }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{dm.titulo}</span>
                          <span style={{ fontSize: 10, color: "var(--dim)", background: "var(--panel-2)", padding: "2px 7px", borderRadius: 6 }}>urg. {dm.urgencia} · imp. {dm.importancia}</span>
                        </div>
                        {dm.citacao && <p style={{ fontSize: 11.5, color: "var(--mut)", margin: "5px 0 0", fontStyle: "italic" }}>"{dm.citacao}"</p>}
                        {isAdmin && (
                          <details style={{ marginTop: 8 }}>
                            <summary style={{ listStyle: "none", cursor: "pointer", fontSize: 11.5, color: "var(--accent)", fontWeight: 600 }}>↳ Criar tarefa a partir desta demanda</summary>
                            <form action={adotarDemanda} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                              <input type="hidden" name="clienteId" value={id} />
                              <input type="hidden" name="titulo" value={dm.titulo} />
                              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700 }}>Escopo</span>
                                <select name="escopo" defaultValue="cliente" style={{ ...fld, minWidth: 190, flex: "none" }}>
                                  <option value="cliente">Só este cliente</option>
                                  <option value="todos">Todos os clientes ativos</option>
                                  <option value="padrao">Incluir no processo padrão</option>
                                </select>
                              </label>
                              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700 }}>Responsável</span>
                                <select name="responsavel" defaultValue="ia" style={{ ...fld, minWidth: 170, flex: "none" }}>
                                  <option value="ia">PMO IA</option>
                                  {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                              </label>
                              <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 14px", fontSize: 12 }}>Criar tarefa</button>
                            </form>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p style={{ fontSize: 12, color: "var(--dim)" }}>Nenhuma demanda nova detectada hoje.</p>}
            </div>
          ) : isAdmin ? (
            <div className="hx-glass" style={{ borderRadius: 14, padding: 18, textAlign: "center", color: "var(--dim)", fontSize: 13 }}>
              Ainda sem resumo para este cliente. Configure o grupo acima e clique em "Rodar resumo agora".
            </div>
          ) : null}
        </div>
      )}

      {/* ══════════ HISTÓRICO ══════════ */}
      {aba === "historico" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {extras.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ ...SEC, marginBottom: 6 }}>Solicitações & Extras ({extras.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {extras.map((e) => (
                  <Link key={e.id} href={`/expand/etapa/${e.id}`} className="hx-glass hx-glass-hover" style={{ display: "flex", gap: 12, padding: "10px 14px", borderRadius: 10, alignItems: "center", textDecoration: "none", color: "inherit", borderLeft: `3px solid ${ST_COR[e.status ?? "idle"] ?? "var(--dim)"}` }}>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{e.titulo}</span>
                    {e.origem && <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--dim)" }}>{e.origem}</span>}
                    <span style={{ fontSize: 11, color: ST_COR[e.status ?? "idle"] ?? "var(--dim)" }}>{e.status ?? "—"}</span>
                    <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{dt(e.criado_em)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div style={SEC}>Histórico de eventos</div>
          {logs.length ? logs.map((l) => (
            <div key={l.id} className="hx-glass" style={{ display: "flex", gap: 12, padding: "9px 14px", borderRadius: 10, alignItems: "baseline" }}>
              <span style={{ fontSize: 10.5, color: "var(--dim)", minWidth: 52, fontVariantNumeric: "tabular-nums" }}>{dt(l.criado_em)}</span>
              <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--accent)", minWidth: 70 }}>{l.tipo ?? "—"}</span>
              <span style={{ fontSize: 12.5, color: "var(--txt)", flex: 1 }}>{l.detalhe ?? "—"}</span>
              <span style={{ fontSize: 11, color: "var(--dim)" }}>{l.autor ?? ""}</span>
            </div>
          )) : <p style={{ fontSize: 12.5, color: "var(--dim)" }}>Sem atividades registradas.</p>}
        </div>
      )}

      {/* ══════════ DIAGNÓSTICOS ══════════ */}
      {aba === "diagnosticos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {diagnosticos.length > 0 ? (
            <div>
              <div style={SEC}>Diagnósticos registrados ({diagnosticos.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {diagnosticos.map(dg => (
                  <div key={dg.id} className="hx-glass" style={{ borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${cor}` }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{dg.detalhe}</span>
                      <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{dg.autor}</span>
                      <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{dt(dg.criado_em)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--dim)" }}>Nenhum diagnóstico registrado ainda.</p>
          )}

          {/* Link para o cliente responder */}
          <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Link de diagnóstico para o cliente</div>
            <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 10 }}>
              Envie este link para o cliente preencher pelo portal dele.
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input readOnly value={`${portUrl}/diagnosticos?novo=temperamento`} style={{ ...fld, fontFamily: "monospace", fontSize: 11.5, flex: 1 }} />
              <a href={`${portUrl}/diagnosticos`} target="_blank" rel="noreferrer" className="hx-btn hx-btn-ghost" style={{ padding: "9px 14px", fontSize: 12.5 }}>Abrir ↗</a>
            </div>
          </div>

          {isAdmin && (
            <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Registrar diagnóstico</div>
              <form action={adicionarDiagnostico} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input type="hidden" name="clienteId" value={id} />
                <input name="titulo" placeholder="Título (ex: Diagnóstico Inicial PIDE)" required style={fld} />
                <textarea name="detalhe" placeholder="Observações, pontos-chave, conclusões…" rows={3} style={{ ...fld, resize: "vertical" }} />
                <div><button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 16px", fontSize: 12.5 }}>Registrar</button></div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ══════════ CONFIGURAÇÕES / EDITAR ══════════ */}
      {aba === "editar" && isAdmin && (
        <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
          {ok === "1" && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)", color: "var(--green)", fontSize: 13 }}>
              Dados salvos com sucesso.
            </div>
          )}

          {/* Dados básicos */}
          <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Dados do cliente</div>
            <form action={atualizarCliente} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input type="hidden" name="id" value={id} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Nome *</label>
                  <input name="nome" defaultValue={cli.nome} required style={fld} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Segmento</label>
                  <input name="segmento" defaultValue={(cli.segmento as string | null) ?? ""} style={fld} placeholder="ex: Marketing Digital" />
                </div>
              </div>

              {/* Logo */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Logo (URL da imagem)</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {cli.logo_url && (
                    <img src={cli.logo_url} alt="logo" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "contain", background: "var(--panel-2)", padding: 4, flexShrink: 0 }} />
                  )}
                  <input name="logo_url" defaultValue={cli.logo_url ?? ""} style={{ ...fld, flex: 1 }} placeholder="https://…/logo.png ou logo.svg" />
                </div>
                <span style={{ fontSize: 10.5, color: "var(--dim)" }}>Aceita URL pública. Para subir um arquivo, arraste para o Drive e copie o link público.</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Maturidade</label>
                  <select name="maturidade" defaultValue={(cli.maturidade as string | null) ?? ""} style={fld}>
                    <option value="">—</option>
                    {["iniciante", "intermediario", "avancado", "especialista"].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Contrato</label>
                  <select name="contrato_tipo" defaultValue={(cli.contrato_tipo as string | null) ?? ""} style={fld}>
                    <option value="">—</option>
                    {["mensal", "trimestral", "semestral", "anual"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Status</label>
                  <select name="status" defaultValue={(cli.status as string | null) ?? ""} style={fld}>
                    <option value="">—</option>
                    {["ativo", "pausado", "cancelado", "churned"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Produto (slug)</label>
                  <input name="produto_slug" defaultValue={(cli.produto_slug as string | null) ?? ""} style={fld} placeholder="ex: pide" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Meta de receita (R$)</label>
                  <input type="number" name="meta_receita" defaultValue={(cli.meta_receita as number | null) ?? ""} style={fld} placeholder="0" min={0} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button type="submit" className="hx-btn hx-btn-primary" style={{ padding: "10px 24px" }}>Salvar dados</button>
              </div>
            </form>
          </div>

          {/* Acesso ao portal */}
          <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Acesso ao portal do cliente</div>
            <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 12 }}>
              URL do portal personalizado deste cliente:
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
              <input readOnly value={portUrl} style={{ ...fld, fontFamily: "monospace", fontSize: 11.5, flex: 1 }} />
              <a href={portUrl} target="_blank" rel="noreferrer" className="hx-btn hx-btn-ghost" style={{ padding: "9px 14px", fontSize: 12.5 }}>Abrir ↗</a>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Gerar convite de primeiro acesso</div>
            <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 10 }}>
              O cliente receberá um email para definir a senha — papel definido como <strong>cliente</strong> e vinculado a esta conta.
            </div>
            <form action={gerarConvitePortal} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <input type="hidden" name="clienteId" value={id} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", marginBottom: 4 }}>Email do cliente</label>
                <input name="email" type="email" placeholder="email@empresa.com.br" required style={fld} />
              </div>
              <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 16px", fontSize: 12.5 }}>Enviar convite</button>
            </form>
          </div>

          {/* Arquivar cliente */}
          <div style={{ padding: "18px", borderRadius: 14, border: "1px solid color-mix(in srgb, var(--warn) 35%, transparent)", background: "color-mix(in srgb, var(--warn) 5%, transparent)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--warn)", marginBottom: 6 }}>Arquivar cliente</div>
            <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.6, marginBottom: 14 }}>
              Quando o cliente encerra o contrato, arquive-o aqui. O registro <strong>não é deletado</strong> — o status muda para <em>churned</em> e o motivo fica salvo no PMO para análise.
              <br /><br />
              <strong>Após arquivar:</strong> mova manualmente a pasta do Drive para {`"Arquivados > ${cli.nome}"`} para guardar os registros.
            </div>
            <form action={arquivarCliente} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="hidden" name="id" value={id} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Motivo principal *</label>
                <select name="motivo" required style={fld}>
                  <option value="">— selecione —</option>
                  {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Feedback real (o que o cliente disse ou o PMO entendeu)</label>
                <textarea name="detalhe" rows={3} placeholder="Descreva o contexto — isso fica salvo no PMO e ajuda a melhorar o produto…" style={{ ...fld, resize: "vertical", minWidth: "auto" }} />
              </div>
              <div>
                <button type="submit" className="hx-btn" style={{ padding: "9px 20px", fontSize: 12.5, background: "color-mix(in srgb, var(--warn) 15%, transparent)", border: "1px solid var(--warn)", color: "var(--warn)", borderRadius: 8, cursor: "pointer" }}>
                  Arquivar {cli.nome}
                </button>
              </div>
            </form>
          </div>

          {/* Danger zone — excluir permanente */}
          <div style={{ padding: "14px 18px", borderRadius: 12, border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)", background: "color-mix(in srgb, var(--red) 6%, transparent)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", marginBottom: 6 }}>Excluir permanentemente</div>
            <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 10 }}>Remove o registro do banco. Irreversível — use Arquivar para casos de churn.</div>
            <form action={excluirCliente} style={{ display: "inline" }}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" className="hx-btn" style={{ padding: "7px 14px", fontSize: 12, background: "color-mix(in srgb, var(--red) 14%, transparent)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: 8, cursor: "pointer" }}>
                Excluir {cli.nome}
              </button>
            </form>
          </div>
        </div>
      )}

      {aba === "editar" && !isAdmin && (
        <p style={{ fontSize: 13, color: "var(--dim)" }}>Somente administradores podem editar dados do cliente.</p>
      )}
    </>
  );
}
