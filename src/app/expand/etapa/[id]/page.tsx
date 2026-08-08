import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AREAS, AG_COR, AG_NOME, AG_APROVA } from "@/lib/expand-esteira";
import { APROVACAO_ROTULO, ARQ_STATUS, ETAPA_STATUS, type EtapaRow, type ArquivoRow } from "@/lib/expand-tarefas";
import {
  subirArquivo, decidirArquivo, iniciarEtapa, concluirEtapa, transferirEtapa,
  abrirChamado, alternarBloqueio, adicionarLink, editarArquivo, removerArquivo, agendarEtapa,
  editarEtapa, addModeloEtapa, removeModeloEtapa, promoverParaProcesso,
} from "@/app/expand/actions";
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
  const { data: logData } = await supabase.from("expand_log").select("*").eq("etapa_id", id).order("criado_em", { ascending: false }).limit(40);
  const logs = (logData ?? []) as LogRow[];
  const { data: modData } = await supabase.from("expand_etapa_modelos").select("id, titulo, conteudo, url, criado_por").eq("etapa_id", id).order("criado_em");
  const modelos = (modData ?? []) as ModeloRow[];

  // pré-requisito (dependência)
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
  const ar = etapa.area ? AREAS[etapa.area] : null;
  const st = ETAPA_STATUS[etapa.status] ?? ETAPA_STATUS.idle;

  // tempo de execução
  const rodando = etapa.status === "run" && etapa.iniciada_em && !etapa.concluida_em;
  const minutos = etapa.duracao_min ?? (etapa.iniciada_em ? Math.round(((etapa.concluida_em ? new Date(etapa.concluida_em).getTime() : Date.now()) - new Date(etapa.iniciada_em).getTime()) / 60000) : null);
  const slaD = slaDias(etapa.sla);
  const estourou = slaD != null && minutos != null && minutos > slaD * 1440;

  return (
    <>
      <Link href={`/expand/board?c=${etapa.cliente_id}`} className="ex-back">← Voltar ao board de {cli?.nome ?? "conta"}</Link>
      <p className="hx-eyebrow">{cli?.nome} · Fase {etapa.fase}</p>
      <h1 className="ex-h1">{etapa.marco ? <span style={{ color: "var(--accent)" }}>◆ </span> : null}{etapa.titulo}</h1>
      <p className="ex-sub">{etapa.criterio}</p>

      {/* avisos */}
      {etapa.bloqueado ? <div className="hx-glass" style={{ borderLeft: "3px solid var(--red)", padding: "10px 14px", marginBottom: 10, fontSize: 12.5 }}><b style={{ color: "var(--red)" }}>Bloqueada</b> — {etapa.bloqueio_motivo || "sem motivo"}</div> : null}
      {etapa.chamado ? <div className="hx-glass" style={{ borderLeft: "3px solid var(--warn)", padding: "10px 14px", marginBottom: 10, fontSize: 12.5 }}><b style={{ color: "var(--warn)" }}>Chamado aberto</b> — {etapa.chamado_msg}</div> : null}
      {prereq && !prereq.ok ? <div className="hx-glass" style={{ borderLeft: "3px solid var(--warn)", padding: "10px 14px", marginBottom: 10, fontSize: 12.5 }}>Depende de <b>&ldquo;{prereq.titulo}&rdquo;</b> (#{etapa.depende_de}), que ainda não foi concluída.</div> : null}

      <div className="ex-kpis">
        <div className="ex-kpi hx-glass"><div className="lab">Contador</div><div className="val"><span className="hx-accent-text">{aprovados}</span>/{etapa.qtd_esperada}</div><div className="foot">Aprovados de {etapa.qtd_esperada} esperados</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Status</div><div className="val" style={{ fontSize: 17, color: st.c }}>{st.l}</div><div className="foot">{ar ? ar.n : ""}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Responsável</div><div className="val" style={{ fontSize: 16 }}>{etapa.responsavel_atual ?? etapa.responsavel}</div><div className="foot">{etapa.agente ? `⚡ ${AG_NOME[etapa.agente]} rascunha` : "Execução humana"}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Tempo de execução</div><div className="val" style={{ fontSize: 16, color: estourou ? "var(--red)" : "var(--txt)" }}>{minutos != null ? duracaoTexto(minutos) : "—"}{rodando ? " ⏱" : ""}</div><div className="foot">{fmt(etapa.iniciada_em)} → {fmt(etapa.concluida_em)} · SLA {etapa.sla}{estourou ? " · acima" : ""}</div></div>
      </div>

      {/* AÇÕES — toolbar em linha única */}
      <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
        <div className="ph"><span className="pt">Ações</span></div>
        <div className="pb" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {etapa.status !== "done" ? (
            !etapa.iniciada_em || etapa.status === "idle" ? (
              <form action={iniciarEtapa}><input type="hidden" name="etapaId" value={etapa.id} /><button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 16px" }}>▶ Iniciar</button></form>
            ) : (
              <form action={concluirEtapa}><input type="hidden" name="etapaId" value={etapa.id} /><button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 16px" }}>✓ Concluir</button></form>
            )
          ) : <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>✓ Concluída{minutos != null ? ` em ${duracaoTexto(minutos)}` : ""}</span>}

          <span style={{ width: 1, alignSelf: "stretch", background: "var(--line)", margin: "0 2px" }} />

          <form action={transferirEtapa} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input type="hidden" name="etapaId" value={etapa.id} />
            <select name="para" required style={{ ...inp, width: "auto", minWidth: 120, padding: "6px 8px" }}>{perfis.map((p) => <option key={p.nome} value={p.nome}>{p.nome}{p.tipo === "agente" ? " (IA)" : ""}</option>)}</select>
            <button className="ex-arqbtn" type="submit" title="Transferir responsável">Transferir</button>
          </form>

          <span style={{ width: 1, alignSelf: "stretch", background: "var(--line)", margin: "0 2px" }} />

          <form action={alternarBloqueio} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input type="hidden" name="etapaId" value={etapa.id} />
            {!etapa.bloqueado ? <input name="motivo" placeholder="motivo do bloqueio" style={{ ...inp, width: "auto", minWidth: 140, padding: "6px 8px" }} /> : null}
            <button className="ex-arqbtn no" type="submit">{etapa.bloqueado ? "Desbloquear" : "Bloquear"}</button>
          </form>

          <span style={{ width: 1, alignSelf: "stretch", background: "var(--line)", margin: "0 2px" }} />

          <form action={agendarEtapa} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input type="hidden" name="etapaId" value={etapa.id} />
            <span style={{ fontSize: 11, color: "var(--dim)" }}>📅</span>
            <input type="date" name="data" defaultValue={etapa.data_prevista ?? ""} style={{ ...inp, width: "auto", minWidth: 130, padding: "6px 8px" }} />
            <button className="ex-arqbtn" type="submit">Agendar</button>
          </form>

          <span style={{ width: 1, alignSelf: "stretch", background: "var(--line)", margin: "0 2px" }} />

          <form action={abrirChamado} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input type="hidden" name="etapaId" value={etapa.id} />
            <input name="msg" required placeholder="dúvida p/ o gestor…" style={{ ...inp, width: "auto", minWidth: 150, padding: "6px 8px" }} />
            <button className="ex-arqbtn" type="submit">Chamado</button>
          </form>
        </div>
      </div>

      {/* EDITAR TAREFA — CRUD por cliente (ajustes sobre o padrão do produto) */}
      <details className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
        <summary style={{ listStyle: "none", cursor: "pointer", padding: "13px 17px", display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13 }}>
          ✎ Editar esta tarefa <span style={{ fontSize: 11, fontWeight: 400, color: "var(--dim)" }}>· ajustes desta conta (SLA, responsável, o que fazer…)</span>
        </summary>
        <form action={editarEtapa} className="pb" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <input type="hidden" name="etapaId" value={etapa.id} />
          <label style={{ gridColumn: "1 / -1" }}><span style={lbl}>Título da tarefa</span><input name="titulo" defaultValue={etapa.titulo} style={inp} /></label>
          <label style={{ gridColumn: "1 / -1" }}><span style={lbl}>O que fazer aqui (critério de conclusão)</span><textarea name="criterio" defaultValue={etapa.criterio ?? ""} rows={2} style={{ ...inp, resize: "vertical" }} /></label>
          <label style={{ gridColumn: "1 / -1" }}><span style={lbl}>Começa quando (gatilho)</span><input name="gatilho" defaultValue={etapa.gatilho ?? ""} style={inp} /></label>
          <label><span style={lbl}>SLA</span><input name="sla" defaultValue={etapa.sla ?? ""} placeholder="ex.: 2 dias" style={inp} /></label>
          <label><span style={lbl}>Responsável</span><select name="responsavel" defaultValue={etapa.responsavel ?? ""} style={inp}><option value="">—</option>{perfis.map((p) => <option key={p.nome} value={p.nome}>{p.nome}{p.tipo === "agente" ? " (IA)" : ""}</option>)}</select></label>
          <label><span style={lbl}>Agente que rascunha</span><select name="agente" defaultValue={etapa.agente ?? ""} style={inp}><option value="">nenhum</option>{agentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></label>
          <label><span style={lbl}>Qtd. esperada de arquivos</span><input name="qtd_esperada" type="number" min={1} defaultValue={etapa.qtd_esperada} style={inp} /></label>
          <label><span style={lbl}>Depende da etapa nº (ordem)</span><input name="depende_de" type="number" min={1} defaultValue={etapa.depende_de ?? ""} placeholder="—" style={inp} /></label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "end" }}><input type="checkbox" name="marco" defaultChecked={etapa.marco} /> <span style={{ fontSize: 12.5, color: "var(--mut)" }}>É um marco ◆</span></label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "end" }}><input type="checkbox" name="visivel_cliente" defaultChecked={etapa.visivel_cliente} /> <span style={{ fontSize: 12.5, color: "var(--mut)" }}>Visível ao cliente</span></label>
          <div style={{ gridColumn: "1 / -1" }}><button className="hx-btn hx-btn-primary" type="submit">Salvar alterações</button></div>
        </form>
      </details>

      {isAdmin ? (
        <div className="hx-glass" style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderLeft: "3px solid var(--accent)" }}>
          <div style={{ flex: 1, minWidth: 220, fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5 }}>
            <b style={{ color: "var(--txt)" }}>Virou padrão?</b> Se essa tarefa (ex.: definida como importante num debriefing) deve valer para <b>todos os clientes</b> deste produto, promova ela ao processo padrão.
          </div>
          <form action={promoverParaProcesso}><input type="hidden" name="etapaId" value={etapa.id} /><button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "8px 14px", fontSize: 12.5 }}>⬆ Promover ao processo padrão</button></form>
        </div>
      ) : null}

      <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
        <div className="ph"><span className="pt">A tarefa</span><span className="pc">{APROVACAO_ROTULO[etapa.aprovacao] ?? etapa.aprovacao}</span></div>
        <div className="pb">
          <div className="ex-mini"><span className="ml">Começa quando</span><span className="mv" style={{ fontWeight: 600, color: "var(--mut)" }}>{etapa.gatilho}</span></div>
          <div className="ex-mini"><span className="ml">Conclui quando</span><span className="mv" style={{ fontWeight: 600, color: "var(--mut)" }}>{etapa.criterio}</span></div>
          {etapa.agente ? <div className="ex-mini"><span className="ml">Execução por IA</span><span className="mv" style={{ color: AG_COR[etapa.agente] }}>⚡ {AG_NOME[etapa.agente]} — {AG_APROVA[etapa.agente]}</span></div> : null}
        </div>
      </div>

      {/* MODELOS & EXEMPLOS — o que fazer nesta tarefa */}
      <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
        <div className="ph"><span className="pt">Modelos & exemplos</span><span className="pc">{modelos.length}</span><span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--dim)" }}>como fazer · fichas · referências</span></div>
        <div className="pb">
          <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55, marginBottom: modelos.length ? 12 : 8 }}>Em dúvida sobre o que fazer nesta tarefa? Aqui ficam o passo a passo, as fichas e os exemplos. Ex.: em <i>&ldquo;Solicitar dados cadastrais&rdquo;</i>, anexe a ficha de cadastro e como preenchê-la.</p>
          {modelos.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {modelos.map((m) => (
                <div key={m.id} style={{ borderLeft: "3px solid var(--accent)", background: "var(--panel-2)", borderRadius: "0 10px 10px 0", padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{m.titulo}</span>
                    {m.url ? <a href={m.url} target="_blank" rel="noreferrer" className="ex-file" style={{ fontSize: 11 }}>abrir ↗</a> : null}
                    <form action={removeModeloEtapa} style={{ marginLeft: "auto" }}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="etapaId" value={etapa.id} /><button className="ex-arqbtn no" type="submit" style={{ padding: "3px 8px", fontSize: 10.5 }}>remover</button></form>
                  </div>
                  {m.conteudo ? <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, marginTop: 6, whiteSpace: "pre-wrap" }}>{m.conteudo}</div> : null}
                  {m.criado_por ? <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 6 }}>por {m.criado_por}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
          <details>
            <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>+ Adicionar modelo / exemplo</summary>
            <form action={addModeloEtapa} style={{ display: "grid", gap: 8, marginTop: 10 }}>
              <input type="hidden" name="etapaId" value={etapa.id} />
              <label><span style={lbl}>Título</span><input name="titulo" required placeholder="ex.: Ficha de dados cadastrais" style={inp} /></label>
              <label><span style={lbl}>Como fazer / conteúdo</span><textarea name="conteudo" rows={4} placeholder="Passo a passo, o que pedir, campos da ficha, cuidados…" style={{ ...inp, resize: "vertical" }} /></label>
              <label><span style={lbl}>Link (modelo, Drive, planilha) — opcional</span><input name="url" placeholder="https://…" style={inp} /></label>
              <div><button className="hx-btn hx-btn-primary" type="submit">Adicionar</button></div>
            </form>
          </details>
        </div>
      </div>

      {/* ENTREGÁVEIS */}
      <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
        <div className="ph"><span className="pt">Entregáveis</span><span className="pc">{arquivos.length}</span></div>
        {arquivos.length === 0 ? <div className="pb"><span style={{ color: "var(--dim)", fontSize: 12 }}>Nenhum entregável ainda.</span></div> : null}
        {arquivos.map((a) => {
          const s = ARQ_STATUS[a.status] ?? ARQ_STATUS.pendente;
          const href = a.tipo === "link" ? a.url : signed.get(a.id);
          return (
            <div key={a.id} className="ex-arq">
              <div className="an">
                <span style={{ color: "var(--dim)", marginRight: 6 }}>{a.tipo === "link" ? "🔗" : "📄"}</span>
                {href ? <a className="ex-file" href={href} target="_blank" rel="noreferrer">{a.nome}</a> : a.nome}
                <div className="am">Por {a.enviado_por ?? "—"} · {fmt(a.enviado_em)}{a.aprovado_por ? ` · ${s.l.toLowerCase()} por ${a.aprovado_por}` : ""}{a.obs ? ` · ${a.obs}` : ""}</div>
              </div>
              <span className="ex-stat" style={{ background: `color-mix(in srgb, ${s.c} 15%, transparent)`, color: s.c }}>{s.l}</span>
              {a.status !== "aprovado" ? <form action={decidirArquivo}><input type="hidden" name="arquivoId" value={a.id} /><input type="hidden" name="etapaId" value={etapa.id} /><input type="hidden" name="decisao" value="aprovado" /><button className="ex-arqbtn ok" type="submit">Aprovar</button></form> : null}
              {a.status !== "ajuste" ? <form action={decidirArquivo}><input type="hidden" name="arquivoId" value={a.id} /><input type="hidden" name="etapaId" value={etapa.id} /><input type="hidden" name="decisao" value="ajuste" /><button className="ex-arqbtn no" type="submit">Ajuste</button></form> : null}
              <details><summary className="ex-arqbtn" style={{ listStyle: "none", cursor: "pointer" }}>Editar</summary>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "14px 16px", borderTop: "1px solid var(--line)" }}>
          <form action={subirArquivo} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="hidden" name="etapaId" value={etapa.id} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", width: "100%" }}>Subir arquivo</span>
            <input type="file" name="file" required style={{ fontSize: 12, color: "var(--mut)", maxWidth: "100%" }} />
            <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "7px 13px", fontSize: 12 }}>Enviar</button>
          </form>
          <form action={adicionarLink} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <input type="hidden" name="etapaId" value={etapa.id} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", width: "100%" }}>Ou adicionar link (Drive, planilha, imagem…)</span>
            <input name="nome" required placeholder="Nome" style={{ ...inp, flex: 1, minWidth: 90 }} />
            <input name="url" required placeholder="https://…" style={{ ...inp, flex: 2, minWidth: 120 }} />
            <button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "7px 13px", fontSize: 12 }}>Adicionar</button>
          </form>
        </div>
      </div>

      {/* HISTÓRICO */}
      <div className="ex-panel hx-glass">
        <div className="ph"><span className="pt">Histórico</span><span className="pc">{logs.length}</span></div>
        <div className="pb">
          {logs.length ? logs.map((l) => (
            <div key={l.id} className="ex-mini"><span className="ml">{l.detalhe}<br /><span style={{ color: "var(--dim)", fontSize: 10.5 }}>{fmtHora(l.criado_em)}{l.autor ? ` · ${l.autor}` : ""}</span></span></div>
          )) : <span style={{ color: "var(--dim)", fontSize: 12 }}>Sem registros ainda — as ações desta tarefa aparecem aqui.</span>}
        </div>
      </div>
    </>
  );
}
