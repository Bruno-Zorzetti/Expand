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
  enviarMensagemPadrao, adicionarNotaHistorico, enviarEmailCliente,
} from "@/app/expand/actions";
import { siteUrl } from "@/lib/site";
import LogoUpload from "@/components/expand/LogoUpload";
import DriveEstruturaBtn from "@/components/expand/DriveEstruturaBtn";
import GrupoSelector from "@/components/expand/GrupoSelector";
import AgendarReuniao from "@/components/expand/AgendarReuniao";

export const dynamic = "force-dynamic";

type Cli = ClienteRow & {
  whatsapp_grupo?: string | null; whatsapp_grupo_nome?: string | null;
  whatsapp_grupo_link?: string | null; drive_folder_url?: string | null;
  drive_folder_id?: string | null; drive_estrutura_criada?: boolean | null;
  agente_id?: string | null; produto_slug?: string | null;
  meta_receita?: number | null; imagem_url?: string | null;
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

  // Queries paralelas: cliente + etapas + logs em simultâneo
  const [{ data: cData }, { data: etData }, { data: lgData }] = await Promise.all([
    supabase.from("expand_clientes").select("*").eq("id", id).maybeSingle(),
    supabase.from("expand_etapas").select("id, titulo, area, sla, status, origem, visivel_cliente, criado_em, data_prevista").eq("cliente_id", id).order("criado_em", { ascending: false }),
    supabase.from("expand_log").select("id, tipo, detalhe, autor, criado_em").eq("cliente_id", id).order("criado_em", { ascending: false }).limit(60),
  ]);
  if (!cData) notFound();
  const cli = cData as Cli;
  const d = derive(cli);
  const etapas = (etData ?? []) as Etapa[];
  const logs = (lgData ?? []) as Log[];

  // Queries condicionais por aba (paralelas entre si quando aplicável)
  type Perspectivas = { pmo?: string; cs?: string; comercial?: string };
  type Resumo = { dia: string; resumo: string | null; atividades: string[]; demandas: { titulo: string; urgencia: string; importancia: string; citacao: string }[]; perspectivas: Perspectivas | null; msgs_lidas: number; tokens_in: number; tokens_out: number; custo: number; modelo: string | null };
  let resumos: Resumo[] = [];
  let pessoas: { id: string; nome: string }[] = [];
  let grupos: Awaited<ReturnType<typeof listarGrupos>> = [];
  if (aba === "grupo") {
    const [rzRes, psRes, grRes] = await Promise.all([
      supabase.from("expand_cliente_resumo").select("dia, resumo, atividades, demandas, perspectivas, msgs_lidas, tokens_in, tokens_out, custo, modelo").eq("cliente_id", id).order("dia", { ascending: false }).limit(30),
      isAdmin ? supabase.from("expand_perfis").select("id, nome").eq("tipo", "humano").order("nome") : Promise.resolve({ data: null }),
      isAdmin ? listarGrupos() : Promise.resolve([]),
    ]);
    resumos = (rzRes.data ?? []) as Resumo[];
    pessoas = ((psRes as { data: unknown }).data ?? []) as { id: string; nome: string }[];
    grupos = grRes as Awaited<ReturnType<typeof listarGrupos>>;
  }
  const resumo = resumos[0] ?? null; // mais recente
  type Diag = { id: string; detalhe: string | null; autor: string | null; criado_em: string };
  type DiagCliente = { id: string; tipo: string; pessoa_nome: string; pessoa_papel: string | null; dominante: string; apoio: string | null; rotulo: string | null; scores: Record<string, number>; segundos: number | null; criado_em: string };
  type Reuniao = { id: string; titulo: string; data_hora: string; duracao_min: number; meet_link: string | null; google_event_id: string | null; enviado_grupo: boolean; transcricao: string | null; criado_em: string };
  let diagnosticos: Diag[] = [];
  let diagCliente: DiagCliente[] = [];
  let reunioes: Reuniao[] = [];
  if (aba === "diagnosticos") {
    const [{ data: dg }, { data: dc }] = await Promise.all([
      supabase.from("expand_log").select("id, detalhe, autor, criado_em").eq("cliente_id", id).eq("tipo", "diagnostico").order("criado_em", { ascending: false }),
      supabase.from("expand_diag_cliente").select("id, tipo, pessoa_nome, pessoa_papel, dominante, apoio, rotulo, scores, segundos, criado_em").eq("cliente_id", id).order("criado_em", { ascending: false }),
    ]);
    diagnosticos = (dg ?? []) as Diag[];
    diagCliente = (dc ?? []) as DiagCliente[];
  }
  if (aba === "grupo") {
    const { data: rns } = await supabase.from("expand_reunioes").select("id, titulo, data_hora, duracao_min, meet_link, google_event_id, enviado_grupo, transcricao, criado_em").eq("cliente_id", id).order("data_hora", { ascending: false }).limit(10);
    reunioes = (rns ?? []) as Reuniao[];
  }

  const isArchived = cli.ativo === false;
  const extras = etapas.filter((e) => e.origem && e.origem !== "processo");
  const cor = MAT_COR[cli.maturidade ?? ""] ?? "var(--accent)";
  const stCor = d.risco === "ok" ? "var(--green)" : d.risco === "churn" ? "var(--red)" : "var(--warn)";
  const stLabel = d.risco === "ok" ? (cli.maturidade ?? "Saudável") : RISCO_ROTULO[d.risco];
  const dt = (s: string) => new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const feitas = etapas.filter((e) => e.status === "done").length;
  const emRun = etapas.filter((e) => e.status === "run").length;
  // portUrl aponta para o portal do CLIENTE (rota /portal), não o hub admin
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
          {cli.imagem_url ? (
            <img src={cli.imagem_url} alt={cli.nome} style={{ width: 56, height: 56, borderRadius: 13, objectFit: "contain", background: "var(--panel-2)", padding: 4, flexShrink: 0 }} />
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

          {/* Archived banner */}
          {isArchived && (
            <div style={{ padding: "10px 16px", background: "color-mix(in srgb,var(--dim) 8%,transparent)", border: "1px solid var(--line-2)", borderRadius: 10, fontSize: 12.5, color: "var(--dim)", display: "flex", gap: 10, alignItems: "center" }}>
              <span>📦</span>
              <span>Cliente arquivado — histórico, diagnósticos e drive ainda estão acessíveis.</span>
            </div>
          )}

          {!isArchived && <>
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
          </>}
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
            {isAdmin && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 10 }}>Estrutura de pastas padrão</div>
                <DriveEstruturaBtn clienteId={id} jaExiste={!!cli.drive_estrutura_criada} />
              </div>
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
                {/* Seletor com busca */}
                <form action={salvarGrupoCliente} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
                  <input type="hidden" name="clienteId" value={id} />
                  {grupos.length ? (
                    <GrupoSelector grupos={grupos} clienteId={id} jidAtual={cli.whatsapp_grupo ?? null} linkAtual={cli.whatsapp_grupo_link ?? null} />
                  ) : (
                    <input name="jid" defaultValue={cli.whatsapp_grupo ?? ""} placeholder="JID do grupo (…@g.us)" style={fld} />
                  )}
                  <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 15px", fontSize: 12.5 }}>Salvar grupo</button>
                </form>

                {/* Ações básicas */}
                {cli.whatsapp_grupo && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    <form action={testarGrupoCliente}><input type="hidden" name="clienteId" value={id} /><button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>📨 Enviar teste</button></form>
                    <form action={rodarResumoAgora}><input type="hidden" name="clienteId" value={id} /><button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>🧠 Rodar resumo agora</button></form>
                  </div>
                )}

                {/* Mensagens rápidas */}
                {cli.whatsapp_grupo && (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 10 }}>Mensagens rápidas</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 8 }}>
                      {[
                        { tipo: "boas_vindas", emoji: "👋", label: "Boas-vindas ao grupo" },
                        { tipo: "onboarding", emoji: "🚀", label: "Início do projeto" },
                        { tipo: "followup_reuniao", emoji: "📅", label: "Follow-up de reunião (1h)" },
                        { tipo: "relatorio", emoji: "📊", label: "Entrega de relatório" },
                      ].map(({ tipo, emoji, label }) => (
                        <form key={tipo} action={enviarMensagemPadrao}>
                          <input type="hidden" name="clienteId" value={id} />
                          <input type="hidden" name="tipo" value={tipo} />
                          <button className="hx-btn hx-btn-ghost" type="submit" style={{ width: "100%", textAlign: "left", padding: "10px 12px", fontSize: 12, borderRadius: 10, display: "flex", flexDirection: "column", gap: 3, height: "auto" }}>
                            <span style={{ fontSize: 18 }}>{emoji}</span>
                            <span style={{ fontWeight: 600, lineHeight: 1.3 }}>{label}</span>
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link de convite */}
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

          {/* Reuniões */}
          <AgendarReuniao
            clienteId={id}
            temGrupo={!!cli.whatsapp_grupo}
            reunioes={reunioes}
          />

          {/* Chamados diários — timeline */}
          {resumos.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {resumos.map((rz, idx) => (
                <div key={rz.dia} className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {idx === 0 ? "Chamado de hoje" : `Chamado de ${new Date(rz.dia + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--dim)" }}>
                      {rz.msgs_lidas} msgs · {rz.tokens_in + rz.tokens_out} tokens · ~US$ {Number(rz.custo).toFixed(4)}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6, margin: "0 0 12px" }}>{rz.resumo || "—"}</p>

                  {/* Perspectivas por perfil */}
                  {rz.perspectivas && (rz.perspectivas.pmo || rz.perspectivas.cs || rz.perspectivas.comercial) ? (
                    <div style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 8 }}>
                      {rz.perspectivas.pmo && (
                        <div style={{ padding: "10px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderLeft: "3px solid var(--accent)" }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--accent)", marginBottom: 5 }}>PMO</div>
                          <p style={{ fontSize: 12, color: "var(--mut)", margin: 0, lineHeight: 1.6 }}>{rz.perspectivas.pmo}</p>
                        </div>
                      )}
                      {rz.perspectivas.cs && (
                        <div style={{ padding: "10px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 8%, transparent)", borderLeft: "3px solid var(--green)" }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--green)", marginBottom: 5 }}>CS</div>
                          <p style={{ fontSize: 12, color: "var(--mut)", margin: 0, lineHeight: 1.6 }}>{rz.perspectivas.cs}</p>
                        </div>
                      )}
                      {rz.perspectivas.comercial && (
                        <div style={{ padding: "10px 12px", borderRadius: 10, background: "color-mix(in srgb, #D4A02A 8%, transparent)", borderLeft: "3px solid #D4A02A" }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#D4A02A", marginBottom: 5 }}>Comercial</div>
                          <p style={{ fontSize: 12, color: "var(--mut)", margin: 0, lineHeight: 1.6 }}>{rz.perspectivas.comercial}</p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Temas / combinados */}
                  {rz.atividades?.length ? (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--dim)", fontWeight: 700, marginBottom: 6 }}>Principais temas e combinados</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {rz.atividades.map((a, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--mut)" }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: 6 }} />
                            <span>{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Demandas → tarefas */}
                  {rz.demandas?.length ? (
                    <div>
                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--warn)", fontWeight: 700, marginBottom: 8 }}>
                        Demandas detectadas — {rz.demandas.length}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {rz.demandas.map((dm, i) => (
                          <div key={i} className="hx-glass" style={{ borderRadius: 10, padding: "10px 12px", borderLeft: `3px solid ${dm.urgencia === "alta" ? "var(--red)" : dm.urgencia === "media" ? "var(--warn)" : "var(--dim)"}` }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{dm.titulo}</span>
                              <span style={{ fontSize: 10, color: "var(--dim)", background: "var(--panel-2)", padding: "2px 7px", borderRadius: 6 }}>urg. {dm.urgencia} · imp. {dm.importancia}</span>
                            </div>
                            {dm.citacao && <p style={{ fontSize: 11.5, color: "var(--mut)", margin: "5px 0 0", fontStyle: "italic" }}>"{dm.citacao}"</p>}
                            {isAdmin && idx === 0 && (
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
                  ) : <p style={{ fontSize: 12, color: "var(--dim)" }}>Nenhuma demanda nova detectada.</p>}
                </div>
              ))}
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
          {/* Adicionar anotação */}
          {isAdmin && (
            <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", marginBottom: 4 }}>
              <form action={adicionarNotaHistorico} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <input type="hidden" name="clienteId" value={id} />
                <input name="nota" placeholder="Adicionar anotação ao histórico…" required style={{ ...fld, flex: 1, minWidth: 200 }} />
                <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 15px", fontSize: 12.5 }}>Adicionar nota</button>
              </form>
            </div>
          )}
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

          {/* Resultados reais de expand_diag_cliente */}
          {diagCliente.length > 0 ? (
            <div>
              {/* Temperamento */}
              {diagCliente.filter(d => d.tipo === "temperamento").length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={SEC}>Temperamento ({diagCliente.filter(d => d.tipo === "temperamento").length} resultado{diagCliente.filter(d => d.tipo === "temperamento").length > 1 ? "s" : ""})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {diagCliente.filter(d => d.tipo === "temperamento").map(dc => (
                      <div key={dc.id} className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${cor}` }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{dc.pessoa_nome}{dc.pessoa_papel ? ` · ${dc.pessoa_papel}` : ""}</span>
                          <span style={{ fontSize: 10, background: `color-mix(in srgb, ${cor} 15%, transparent)`, color: cor, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{dc.dominante}{dc.apoio ? ` / ${dc.apoio}` : ""}</span>
                          <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{dt(dc.criado_em)}</span>
                        </div>
                        {dc.rotulo && <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 8, fontStyle: "italic" }}>{dc.rotulo}</div>}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {Object.entries(dc.scores ?? {}).sort(([, a], [, b]) => (b as number) - (a as number)).map(([k, v]) => (
                            <div key={k} style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 2, minWidth: 60, alignItems: "center" }}>
                              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)" }}>{k}</div>
                              <div style={{ width: 50, height: 4, borderRadius: 2, background: "var(--line-2)", overflow: "hidden" }}>
                                <div style={{ width: `${Math.min(100, ((v as number) / 40) * 100)}%`, height: "100%", background: cor }} />
                              </div>
                              <div style={{ fontWeight: 700, color: "var(--txt)" }}>{v as number}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Arquétipo de Marca */}
              {diagCliente.filter(d => d.tipo === "arquetipo_marca").length > 0 && (
                <div>
                  <div style={SEC}>Arquétipo de Marca ({diagCliente.filter(d => d.tipo === "arquetipo_marca").length} resultado{diagCliente.filter(d => d.tipo === "arquetipo_marca").length > 1 ? "s" : ""})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {diagCliente.filter(d => d.tipo === "arquetipo_marca").map(dc => (
                      <div key={dc.id} className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid var(--dourado, #c9a227)` }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{dc.pessoa_nome}{dc.pessoa_papel ? ` · ${dc.pessoa_papel}` : ""}</span>
                          <span style={{ fontSize: 10, background: "color-mix(in srgb, var(--dourado, #c9a227) 15%, transparent)", color: "var(--dourado, #c9a227)", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{dc.dominante}</span>
                          <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{dt(dc.criado_em)}</span>
                        </div>
                        {dc.rotulo && <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt)", marginBottom: 4 }}>{dc.rotulo}</div>}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {Object.entries(dc.scores ?? {}).sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 6).map(([k, v]) => (
                            <div key={k} style={{ fontSize: 11, display: "flex", flexDirection: "column", gap: 2, minWidth: 60, alignItems: "center" }}>
                              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)" }}>{k.substring(0, 8)}</div>
                              <div style={{ width: 50, height: 4, borderRadius: 2, background: "var(--line-2)", overflow: "hidden" }}>
                                <div style={{ width: `${Math.min(100, ((v as number) / 36) * 100)}%`, height: "100%", background: "var(--dourado, #c9a227)" }} />
                              </div>
                              <div style={{ fontWeight: 700, color: "var(--txt)" }}>{v as number}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", color: "var(--dim)", fontSize: 13 }}>
              Nenhum diagnóstico preenchido pelo cliente ainda.
            </div>
          )}

          {/* Links para o cliente preencher */}
          <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Links de diagnóstico para o cliente</div>
            <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 10 }}>
              Envie os links abaixo para o cliente preencher pelo portal.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 130 }}>Temperamento</span>
                <input readOnly value={`${portUrl}/diagnosticos?novo=temperamento`} style={{ ...fld, fontFamily: "monospace", fontSize: 11, flex: 1 }} />
                <a href={`${portUrl}/diagnosticos?novo=temperamento`} target="_blank" rel="noreferrer" className="hx-btn hx-btn-ghost" style={{ padding: "8px 13px", fontSize: 12 }}>↗</a>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 130 }}>Arquétipo de Marca</span>
                <input readOnly value={`${portUrl}/diagnosticos?novo=arquetipo`} style={{ ...fld, fontFamily: "monospace", fontSize: 11, flex: 1 }} />
                <a href={`${portUrl}/diagnosticos?novo=arquetipo`} target="_blank" rel="noreferrer" className="hx-btn hx-btn-ghost" style={{ padding: "8px 13px", fontSize: 12 }}>↗</a>
              </div>
            </div>
          </div>

          {/* Devolutivas (ex "Registrar diagnóstico") */}
          {diagnosticos.length > 0 && (
            <div>
              <div style={SEC}>Devolutivas registradas ({diagnosticos.length})</div>
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
          )}

          {isAdmin && (
            <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Registrar devolutiva</div>
              <form action={adicionarDiagnostico} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input type="hidden" name="clienteId" value={id} />
                <select name="titulo" required style={fld}>
                  <option value="">Selecione o contexto…</option>
                  <option value="Reunião de resultado">Reunião de resultado</option>
                  <option value="Feedback mensal">Feedback mensal</option>
                  <option value="Diagnóstico inicial">Diagnóstico inicial</option>
                  <option value="Revisão de estratégia">Revisão de estratégia</option>
                  <option value="Outro">Outro</option>
                </select>
                <textarea name="detalhe" placeholder="Observações, pontos-chave, conclusões…" rows={3} style={{ ...fld, resize: "vertical" }} />
                <div><button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 16px", fontSize: 12.5 }}>Salvar devolutiva</button></div>
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
                <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Logo</label>
                <LogoUpload clienteId={id} logoAtual={cli.imagem_url ?? null} />
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
                  <label style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Ativo</label>
                  <select name="ativo_str" defaultValue={cli.ativo === false ? "false" : "true"} style={fld}>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
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

          {/* Enviar e-mail ao cliente */}
          <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Enviar e-mail</div>
            <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 12 }}>Envie uma notificação, relatório ou mensagem diretamente para o cliente via Resend.</div>
            <form action={enviarEmailCliente} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="hidden" name="clienteId" value={id} />
              <input name="emailTo" type="email" placeholder="destinatario@empresa.com" required style={fld} />
              <input name="assunto" placeholder="Assunto do e-mail" required style={fld} />
              <textarea name="mensagem" placeholder="Mensagem (pode usar quebras de linha)…" rows={4} required style={{ ...fld, resize: "vertical" }} />
              <div><button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 16px", fontSize: 12.5 }}>Enviar e-mail</button></div>
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
