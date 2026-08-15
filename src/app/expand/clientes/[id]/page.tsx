import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { derive, MAT_COR, RISCO_ROTULO, type ClienteRow } from "@/lib/expand";
import { getAcesso } from "@/lib/expand-acesso";
import { listarGrupos } from "@/lib/whatsapp";
import { salvarLinkDrive, salvarGrupoCliente, testarGrupoCliente, rodarResumoAgora, adotarDemanda, salvarLinkGrupo } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

type Cli = ClienteRow & { whatsapp_grupo?: string | null; whatsapp_grupo_nome?: string | null; whatsapp_grupo_link?: string | null; drive_folder_url?: string | null; agente_id?: string | null };
type Etapa = { id: string; titulo: string; area: string | null; sla: string | null; status: string | null; origem: string | null; visivel_cliente: boolean; criado_em: string; data_prevista: string | null };
type Log = { id: string; tipo: string | null; detalhe: string | null; autor: string | null; criado_em: string };

const ABAS = [
  { k: "geral", l: "Visão geral" },
  { k: "drive", l: "Pasta / Drive" },
  { k: "grupo", l: "Grupo & Mensagens" },
  { k: "sla", l: "Rituais & SLA" },
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

  const extras = etapas.filter((e) => e.origem && e.origem !== "processo");
  const cor = MAT_COR[cli.maturidade ?? ""] ?? "var(--accent)";
  const stCor = d.risco === "ok" ? "var(--green)" : d.risco === "churn" ? "var(--red)" : "var(--warn)";
  const stLabel = d.risco === "ok" ? (cli.maturidade ?? "Saudável") : RISCO_ROTULO[d.risco];
  const dt = (s: string) => new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const feitas = etapas.filter((e) => e.status === "done").length;
  const meta: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 2 };
  const metaLab: React.CSSProperties = { fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 };
  const metaVal: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "var(--txt)", fontVariantNumeric: "tabular-nums" };

  return (
    <>
      <p className="hx-eyebrow"><Link href="/expand/carteira" style={{ color: "var(--dim)", textDecoration: "none" }}>Clientes</Link> · dossiê da conta</p>

      {/* Cabeçalho — hero da conta */}
      <div className="hx-glass" style={{ borderRadius: 16, padding: "18px 20px", marginBottom: 2, position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${cor}, transparent 70%)` }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 56, height: 56, borderRadius: 15, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${cor} 20%, transparent)`, color: cor, fontWeight: 800, fontSize: 24, fontFamily: "var(--font-cinzel), serif", flexShrink: 0 }}>{cli.nome[0]}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 className="ex-h1" style={{ margin: 0, lineHeight: 1.1 }}>{cli.nome}</h1>
              <span className="ex-pill" style={{ background: `color-mix(in srgb, ${stCor} 16%, transparent)`, color: stCor }}><i className="ex-dot" />{stLabel}</span>
            </div>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--mut)" }}>{cli.segmento ?? "Sem segmento"}{cli.maturidade ? ` · ${cli.maturidade}` : ""}</p>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div style={meta}><span style={metaLab}>Contrato</span><span style={metaVal}>{cli.contrato_tipo ?? "—"}{cli.contrato_dur ? ` · ${cli.contrato_dur}m` : ""}</span></div>
            <div style={meta}><span style={metaLab}>Relação / Exec</span><span style={metaVal}>{cli.rel ?? "—"} / {cli.exec ?? "—"}</span></div>
            <div style={meta}><span style={metaLab}>Tarefas</span><span style={metaVal}>{feitas}/{etapas.length}</span></div>
          </div>
        </div>
      </div>

      {/* Abas — fixas ao rolar */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: "linear-gradient(var(--bg) 78%, transparent)", display: "flex", gap: 2, flexWrap: "wrap", borderBottom: "1px solid var(--line)", marginBottom: 20, paddingTop: 8 }}>
        {ABAS.map((a) => {
          const on = aba === a.k;
          return (
            <Link key={a.k} href={`/expand/clientes/${id}?t=${a.k}`} scroll={false}
              style={{ padding: "9px 14px", fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? "var(--txt)" : "var(--mut)", borderBottom: `2px solid ${on ? cor : "transparent"}`, textDecoration: "none", marginBottom: -1, transition: "color .15s" }}>
              {a.l}{a.k === "solicitacoes" && extras.length ? <span style={{ marginLeft: 6, fontSize: 10.5, background: on ? `color-mix(in srgb, ${cor} 22%, transparent)` : "var(--panel-2)", borderRadius: 20, padding: "1px 7px", color: on ? cor : "var(--dim)", fontWeight: 700 }}>{extras.length}</span> : null}
            </Link>
          );
        })}
      </div>

      {aba === "geral" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${stCor}` }}>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}><div style={metaLab}>Pendência hoje</div><div style={{ fontSize: 14, color: "var(--txt)", marginTop: 3 }}>{cli.pendencia ?? "Nada pendente."}</div></div>
              <div><div style={metaLab}>Depende de</div><div style={{ fontSize: 14, color: "var(--txt)", marginTop: 3 }}>{cli.depende_de ?? "—"}</div></div>
              <div><div style={metaLab}>Tarefas em aberto</div><div style={{ ...metaVal, fontSize: 18, marginTop: 3 }}>{etapas.filter((e) => e.status === "run" || e.status === "idle").length}</div></div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {[
              { k: "drive", t: "Pasta / Drive", d: cli.drive_folder_url ? "vinculada" : "configurar", ic: "📂" },
              { k: "grupo", t: "Grupo & Mensagens", d: cli.whatsapp_grupo ? "conectado" : "configurar", ic: "💬" },
              { k: "historico", t: "Histórico", d: `${logs.length} eventos`, ic: "🕑" },
              { k: "solicitacoes", t: "Solicitações & Extras", d: `${extras.length} extra(s)`, ic: "＋" },
            ].map((x) => (
              <Link key={x.k} href={`/expand/clientes/${id}?t=${x.k}`} scroll={false} className="hx-glass hx-glass-hover" style={{ borderRadius: 12, padding: "13px 14px", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 18 }}>{x.ic}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{x.t}</span>
                <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{x.d}</span>
              </Link>
            ))}
          </div>
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
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <form action={testarGrupoCliente}><input type="hidden" name="clienteId" value={id} /><button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>📨 Enviar teste</button></form>
                  <form action={rodarResumoAgora}><input type="hidden" name="clienteId" value={id} /><button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>🧠 Rodar resumo agora</button></form>
                </div>
              ) : null}
              {cli.whatsapp_grupo ? (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 12 }}>
                  <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55, margin: "0 0 8px" }}>
                    <b style={{ color: "var(--txt)" }}>Link de convite do grupo</b> — liga o botão “Falar com a equipe” no portal do cliente. Cole o link (WhatsApp → grupo → Convidar via link) ou deixe vazio e clique para o sistema buscar.
                    {cli.whatsapp_grupo_link
                      ? <><br /><a href={cli.whatsapp_grupo_link} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{cli.whatsapp_grupo_link}</a></>
                      : <><br /><span style={{ color: "var(--warn)" }}>Sem link — o botão fica oculto para o cliente.</span></>}
                  </p>
                  <form action={salvarLinkGrupo} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input type="hidden" name="clienteId" value={id} />
                    <input name="link" defaultValue={cli.whatsapp_grupo_link ?? ""} placeholder="https://chat.whatsapp.com/…" style={fld} />
                    <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "9px 15px", fontSize: 12.5 }}>Salvar / buscar link</button>
                  </form>
                </div>
              ) : null}
            </>
          ) : null}

          {resumo ? (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Resumo do dia</span>
                <span style={{ fontSize: 11, color: "var(--dim)" }}>{new Date(resumo.dia + "T12:00").toLocaleDateString("pt-BR")} · {resumo.msgs_lidas} msgs · {resumo.tokens_in + resumo.tokens_out} tokens · ~US$ {Number(resumo.custo).toFixed(4)}{resumo.modelo ? ` · ${resumo.modelo}` : ""}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6, margin: "0 0 10px" }}>{resumo.resumo || "—"}</p>
              {resumo.atividades?.length ? (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--dim)", margin: "0 0 4px" }}>Combinados</p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6 }}>{resumo.atividades.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </div>
              ) : null}
              {resumo.demandas?.length ? (
                <div>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--dim)", margin: "0 0 6px" }}>Possíveis demandas <span style={{ color: "var(--warn)" }}>(o PMO decide)</span></p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {resumo.demandas.map((dm, i) => (
                      <div key={i} className="hx-glass" style={{ borderRadius: 10, padding: "10px 12px", borderLeft: `3px solid ${dm.urgencia === "alta" ? "var(--red)" : dm.urgencia === "media" ? "var(--warn)" : "var(--dim)"}` }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{dm.titulo}</span>
                          <span style={{ fontSize: 10, color: "var(--dim)" }}>urg. {dm.urgencia} · imp. {dm.importancia}</span>
                        </div>
                        {dm.citacao ? <p style={{ fontSize: 11.5, color: "var(--mut)", margin: "6px 0 4px", fontStyle: "italic" }}>“{dm.citacao}”</p> : null}
                        {isAdmin ? (
                          <details style={{ marginTop: 6 }}>
                            <summary style={{ listStyle: "none", cursor: "pointer", fontSize: 11.5, color: "var(--accent)", fontWeight: 600 }}>✓ Adotar / decidir</summary>
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
                                  <option value="ia">PMO IA (prepara)</option>
                                  {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </select>
                              </label>
                              <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 14px", fontSize: 12 }}>Criar tarefa(s)</button>
                            </form>
                          </details>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p style={{ fontSize: 12, color: "var(--dim)" }}>Nenhuma demanda nova detectada.</p>}
            </div>
          ) : isAdmin ? <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 14 }}>Ainda sem resumo. Configure o grupo e clique em “Rodar resumo agora”.</p> : null}
        </div>
      ) : null}

      {aba === "sla" ? (() => {
        function slaDias(sla: string | null): number | null {
          if (!sla) return null;
          const md = sla.toLowerCase().match(/(\d+)\s*dia/); if (md) return Number(md[1]);
          const mh = sla.toLowerCase().match(/(\d+)\s*h/); if (mh) return Math.max(1, Math.round(Number(mh[1]) / 24));
          return null;
        }
        const abertas = etapas.filter((e) => e.status === "run" || e.status === "idle");
        const comSla = abertas.filter((e) => e.sla);
        const hojeISO = new Intl.DateTimeFormat("sv", { timeZone: "America/Sao_Paulo" }).format(new Date());
        const atrasadas = abertas.filter((e) =>
          e.status === "idle" && !!e.data_prevista && e.data_prevista < hojeISO
        );
        const onTime = comSla.filter((e) => !atrasadas.some((a) => a.id === e.id));
        const semSla = abertas.filter((e) => !e.sla);
        const riscoCor = d.risco === "ok" ? "var(--green)" : d.risco === "churn" ? "var(--red)" : "var(--warn)";
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* KPIs de SLA */}
            <div className="ex-kpis">
              <div className="ex-kpi hx-glass"><div className="lab">Tarefas abertas</div><div className="val">{abertas.length}</div><div className="foot">Run + na fila</div></div>
              <div className="ex-kpi hx-glass"><div className="lab">Com SLA definido</div><div className="val hx-accent-text">{comSla.length}</div><div className="foot">de {abertas.length} abertas</div></div>
              <div className="ex-kpi hx-glass"><div className="lab">Vencidas / em risco</div><div className="val" style={{ color: atrasadas.length ? "var(--red)" : "var(--green)" }}>{atrasadas.length}</div><div className="foot">Data passada</div></div>
              <div className="ex-kpi hx-glass"><div className="lab">Saúde do cliente</div><div className="val" style={{ color: riscoCor, fontSize: 16 }}>{d.risco === "ok" ? "Saudável" : d.risco === "churn" ? "Risco de churn" : "Atenção"}</div><div className="foot">Risco calculado</div></div>
            </div>

            {/* Tarefas com SLA */}
            {comSla.length > 0 && (
              <div>
                <div className="ex-grph"><span className="gt">Tarefas com SLA</span><span className="gc">{comSla.length}</span><span className="gl" /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {comSla.map((e) => {
                    const vencida = atrasadas.some((a) => a.id === e.id);
                    return (
                      <Link key={e.id} href={`/expand/etapa/${e.id}`} className="hx-glass hx-glass-hover" style={{ display: "flex", gap: 12, padding: "10px 14px", borderRadius: 10, alignItems: "center", textDecoration: "none", color: "inherit", borderLeft: `3px solid ${vencida ? "var(--red)" : e.status === "run" ? "var(--accent)" : "var(--dim)"}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{e.titulo}</div>
                          {e.area && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{e.area}</div>}
                        </div>
                        <span style={{ fontSize: 11.5, padding: "3px 8px", borderRadius: 6, background: "var(--panel-2)", color: "var(--mut)", fontWeight: 600 }}>SLA {e.sla}</span>
                        {e.data_prevista && <span style={{ fontSize: 11, color: "var(--dim)" }}>{new Date(e.data_prevista + "T12:00").toLocaleDateString("pt-BR")}</span>}
                        <span style={{ fontSize: 11, fontWeight: 700, color: vencida ? "var(--red)" : e.status === "run" ? "var(--accent)" : "var(--dim)" }}>{vencida ? "VENCIDA" : e.status === "run" ? "Em execução" : "Na fila"}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sem SLA */}
            {semSla.length > 0 && (
              <div>
                <div className="ex-grph"><span className="gt" style={{ color: "var(--warn)" }}>Sem SLA definido</span><span className="gc">{semSla.length}</span><span className="gl" /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {semSla.map((e) => (
                    <Link key={e.id} href={`/expand/etapa/${e.id}`} className="hx-glass hx-glass-hover" style={{ display: "flex", gap: 12, padding: "9px 14px", borderRadius: 10, alignItems: "center", textDecoration: "none", color: "inherit" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{e.titulo}</span>
                      <span style={{ fontSize: 11, color: "var(--dim)" }}>{e.status === "run" ? "Em execução" : "Na fila"}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Rituais — link para página de rotinas */}
            <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6 }}>Rituais & Automações</div>
              <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.55, marginBottom: 12 }}>
                As rotinas automáticas (resumo diário, alertas de SLA, resumo de grupo) são configuradas globalmente. O grupo de WhatsApp desta conta precisa estar conectado para as automações funcionarem.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href="/expand/rotinas" className="hx-btn hx-btn-ghost" style={{ padding: "8px 14px", fontSize: 12.5 }}>Gerenciar rotinas ↗</Link>
                <Link href={`/expand/clientes/${id}?t=grupo`} className="hx-btn hx-btn-ghost" style={{ padding: "8px 14px", fontSize: 12.5 }}>Configurar grupo WhatsApp</Link>
              </div>
            </div>
          </div>
        );
      })() : null}

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
