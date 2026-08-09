import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { derive, MAT_COR, RISCO_ROTULO, type ClienteRow } from "@/lib/expand";
import { getAcesso } from "@/lib/expand-acesso";
import { listarGrupos } from "@/lib/whatsapp";
import { salvarLinkDrive, salvarGrupoCliente, testarGrupoCliente } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

type Cli = ClienteRow & { whatsapp_grupo?: string | null; whatsapp_grupo_nome?: string | null; drive_folder_url?: string | null; agente_id?: string | null };
type Etapa = { id: string; titulo: string; area: string | null; status: string | null; origem: string | null; visivel_cliente: boolean; criado_em: string; data_prevista: string | null };
type Log = { id: string; tipo: string | null; detalhe: string | null; autor: string | null; criado_em: string };

const ABAS = [
  { k: "geral", l: "Visão geral" },
  { k: "drive", l: "Pasta / Drive" },
  { k: "grupo", l: "Grupo & Mensagens" },
  { k: "agente", l: "Agente" },
  { k: "historico", l: "Histórico" },
  { k: "diagnosticos", l: "Diagnósticos" },
  { k: "solicitacoes", l: "Solicitações & Extras" },
];

const fld: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit", flex: 1, minWidth: 220 };
const ST_COR: Record<string, string> = { done: "var(--green)", run: "var(--accent)", idle: "var(--dim)", block: "var(--red)" };

export default async function ClienteHub({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  const aba = ABAS.find((a) => a.k === t)?.k ?? "geral";
  const supabase = await createClient();
  const { isAdmin } = await getAcesso();

  const { data: cData } = await supabase.from("expand_clientes").select("*").eq("id", id).maybeSingle();
  if (!cData) notFound();
  const cli = cData as Cli;
  const d = derive(cli);

  const { data: etData } = await supabase.from("expand_etapas").select("id, titulo, area, status, origem, visivel_cliente, criado_em, data_prevista").eq("cliente_id", id).order("criado_em", { ascending: false });
  const etapas = (etData ?? []) as Etapa[];
  const { data: lgData } = await supabase.from("expand_log").select("id, tipo, detalhe, autor, criado_em").eq("cliente_id", id).order("criado_em", { ascending: false }).limit(60);
  const logs = (lgData ?? []) as Log[];
  const grupos = isAdmin && aba === "grupo" ? await listarGrupos() : [];

  const extras = etapas.filter((e) => e.origem && e.origem !== "processo");
  const cor = MAT_COR[cli.maturidade ?? ""] ?? "var(--accent)";
  const dt = (s: string) => new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <>
      <p className="hx-eyebrow"><Link href="/expand/carteira" style={{ color: "var(--dim)" }}>Clientes</Link> · dossiê</p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${cor} 18%, transparent)`, color: cor, fontWeight: 800, fontSize: 20, fontFamily: "var(--font-cinzel), serif" }}>{cli.nome[0]}</div>
        <div>
          <h1 className="ex-h1" style={{ margin: 0 }}>{cli.nome}</h1>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--mut)" }}>{cli.segmento ?? "—"}{cli.maturidade ? ` · ${cli.maturidade}` : ""} · <span style={{ color: d.risco === "ok" ? "var(--green)" : "var(--warn)" }}>{d.risco === "ok" ? "sem alerta" : RISCO_ROTULO[d.risco]}</span></p>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "1px solid var(--line)", marginBottom: 18, marginTop: 12 }}>
        {ABAS.map((a) => (
          <Link key={a.k} href={`/expand/clientes/${id}?t=${a.k}`} scroll={false}
            style={{ padding: "8px 13px", fontSize: 12.5, fontWeight: aba === a.k ? 700 : 500, color: aba === a.k ? "var(--txt)" : "var(--mut)", borderBottom: `2px solid ${aba === a.k ? cor : "transparent"}`, textDecoration: "none", marginBottom: -1 }}>
            {a.l}{a.k === "solicitacoes" && extras.length ? <span style={{ marginLeft: 6, fontSize: 10.5, background: "var(--panel-2)", borderRadius: 20, padding: "1px 6px", color: "var(--dim)" }}>{extras.length}</span> : null}
          </Link>
        ))}
      </div>

      {aba === "geral" ? (
        <div className="ex-kpis">
          <div className="ex-kpi hx-glass"><div className="lab">Contrato</div><div className="val" style={{ fontSize: 16 }}>{cli.contrato_tipo ?? "—"}</div><div className="foot">{cli.contrato_dur ? `${cli.contrato_dur} meses` : "sem prazo"}</div></div>
          <div className="ex-kpi hx-glass"><div className="lab">Relação / Execução</div><div className="val" style={{ fontSize: 16 }}>{cli.rel ?? "—"} / {cli.exec ?? "—"}</div><div className="foot">health · dossiê</div></div>
          <div className="ex-kpi hx-glass"><div className="lab">Pendência hoje</div><div className="val" style={{ fontSize: 14 }}>{cli.pendencia ?? "—"}</div><div className="foot">depende de {cli.depende_de ?? "—"}</div></div>
          <div className="ex-kpi hx-glass"><div className="lab">Tarefas</div><div className="val">{etapas.length}</div><div className="foot">{etapas.filter((e) => e.status === "done").length} concluídas</div></div>
        </div>
      ) : null}

      {aba === "drive" ? (
        <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Pasta do cliente no Google Drive</p>
          <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.55, marginBottom: 14 }}>Onboarding: <b>Criar pasta no Drive</b>. Cole o link da pasta (o projeto pode já ter começado) e valide, ou peça a criação com IA.</p>
          {cli.drive_folder_url ? (
            <p style={{ marginBottom: 12 }}><a href={cli.drive_folder_url} target="_blank" rel="noreferrer" className="hx-btn hx-btn-primary" style={{ padding: "8px 14px", fontSize: 12.5, textDecoration: "none" }}>📂 Abrir pasta no Drive</a></p>
          ) : null}
          {isAdmin ? (
            <form action={salvarLinkDrive} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input type="hidden" name="clienteId" value={id} />
              <input name="url" defaultValue={cli.drive_folder_url ?? ""} placeholder="Cole o link da pasta do Drive" style={fld} />
              <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 15px", fontSize: 12.5 }}>Salvar link</button>
            </form>
          ) : null}
          <p style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 12, lineHeight: 1.55 }}>Estrutura padrão (a criar por checkbox): 01 Documentos · 02 Planilhas · 03 Apresentações · 04 Entregáveis (Copy · Arte Bruto/Editado · Vídeo Bruto/Editado) · 05 Recebidos. Criação/validação automática pelo sistema depende da conta de serviço Google (fase seguinte).</p>
        </div>
      ) : null}

      {aba === "grupo" ? (
        <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Grupo de WhatsApp {cli.whatsapp_grupo ? <span style={{ color: "var(--green)", fontSize: 12 }}>· conectado ({cli.whatsapp_grupo_nome ?? "grupo"})</span> : <span style={{ color: "var(--warn)", fontSize: 12 }}>· não configurado</span>}</p>
          <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.55, marginBottom: 14 }}>Onboarding: <b>Criar grupo oficial com o cliente</b>. Avisos, links e aprovações passam por ele; e (fase B) o resumo diário das conversas aparece aqui.</p>
          {isAdmin ? (
            <>
              <form action={salvarGrupoCliente} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <input type="hidden" name="clienteId" value={id} />
                {grupos.length ? (
                  <select name="jid" defaultValue={cli.whatsapp_grupo ?? ""} style={fld}>
                    <option value="">— sem grupo —</option>
                    {grupos.map((g) => <option key={g.jid} value={g.jid}>{g.nome}</option>)}
                  </select>
                ) : (
                  <input name="jid" defaultValue={cli.whatsapp_grupo ?? ""} placeholder="JID do grupo (…@g.us) — conecte o WhatsApp p/ listar" style={fld} />
                )}
                <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 15px", fontSize: 12.5 }}>Salvar grupo</button>
              </form>
              {cli.whatsapp_grupo ? (
                <form action={testarGrupoCliente}><input type="hidden" name="clienteId" value={id} /><button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>📨 Enviar teste ao grupo</button></form>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {aba === "agente" ? (
        <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Agente do cliente</p>
          <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.55 }}>Em breve: chat com o agente usando a memória separada deste cliente (RAG por cliente). O agente nunca inventa cliente — só usa o contexto real desta conta.</p>
        </div>
      ) : null}

      {aba === "historico" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {logs.length ? logs.map((l) => (
            <div key={l.id} className="hx-glass" style={{ display: "flex", gap: 12, padding: "10px 14px", borderRadius: 10, alignItems: "baseline" }}>
              <span style={{ fontSize: 10.5, color: "var(--dim)", minWidth: 52, fontVariantNumeric: "tabular-nums" }}>{dt(l.criado_em)}</span>
              <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--accent)", minWidth: 60 }}>{l.tipo ?? "—"}</span>
              <span style={{ fontSize: 12.5, color: "var(--txt)", flex: 1 }}>{l.detalhe ?? "—"}</span>
              <span style={{ fontSize: 11, color: "var(--dim)" }}>{l.autor ?? ""}</span>
            </div>
          )) : <p style={{ fontSize: 12.5, color: "var(--dim)" }}>Sem atividades registradas ainda.</p>}
        </div>
      ) : null}

      {aba === "diagnosticos" ? (
        <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Diagnósticos & briefings</p>
          <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.55 }}>Em breve: os diagnósticos e briefings preenchidos deste cliente reunidos aqui.</p>
        </div>
      ) : null}

      {aba === "solicitacoes" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 4 }}>Demandas e extras solicitados para esta conta (fora do processo padrão).</p>
          {extras.length ? extras.map((e) => (
            <Link key={e.id} href={`/expand/etapa/${e.id}`} className="hx-glass hx-glass-hover" style={{ display: "flex", gap: 12, padding: "11px 14px", borderRadius: 10, alignItems: "center", textDecoration: "none", color: "inherit", borderLeft: `3px solid ${ST_COR[e.status ?? "idle"] ?? "var(--dim)"}` }}>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{e.titulo}</span>
              {e.origem ? <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--dim)" }}>{e.origem}</span> : null}
              <span style={{ fontSize: 11, color: ST_COR[e.status ?? "idle"] ?? "var(--dim)" }}>{e.status ?? "—"}</span>
              <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{dt(e.criado_em)}</span>
            </Link>
          )) : <p style={{ fontSize: 12.5, color: "var(--dim)" }}>Nenhuma demanda extra registrada. Novas solicitações do cliente ou da equipe aparecem aqui.</p>}
        </div>
      ) : null}
    </>
  );
}
