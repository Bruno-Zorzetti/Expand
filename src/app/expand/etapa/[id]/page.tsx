import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AREAS, AG_COR, AG_NOME, AG_APROVA } from "@/lib/expand-esteira";
import { APROVACAO_ROTULO, ARQ_STATUS, ETAPA_STATUS, type EtapaRow, type ArquivoRow } from "@/lib/expand-tarefas";
import { subirArquivo, decidirArquivo } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";
}

export default async function EtapaDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: et } = await supabase.from("expand_etapas").select("*").eq("id", id).single();
  if (!et) notFound();
  const etapa = et as EtapaRow;

  const { data: cli } = await supabase.from("expand_clientes").select("nome").eq("id", etapa.cliente_id).single();
  const { data: arqData } = await supabase.from("expand_arquivos").select("*").eq("etapa_id", id).order("enviado_em");
  const arquivos = (arqData ?? []) as ArquivoRow[];

  const signed = new Map<string, string>();
  for (const a of arquivos) {
    if (a.path) {
      const { data: s } = await supabase.storage.from("expand-entregaveis").createSignedUrl(a.path, 120);
      if (s?.signedUrl) signed.set(a.id, s.signedUrl);
    }
  }

  const aprovados = arquivos.filter((a) => a.status === "aprovado").length;
  const ar = etapa.area ? AREAS[etapa.area] : null;
  const st = ETAPA_STATUS[etapa.status] ?? ETAPA_STATUS.idle;

  return (
    <>
      <Link href={`/expand/board?c=${etapa.cliente_id}`} className="ex-back">← Voltar ao board de {cli?.nome ?? "conta"}</Link>
      <p className="hx-eyebrow">{cli?.nome} · Fase {etapa.fase}</p>
      <h1 className="ex-h1">{etapa.titulo}</h1>
      <p className="ex-sub">{etapa.criterio}</p>

      <div className="ex-kpis">
        <div className="ex-kpi hx-glass"><div className="lab">Contador</div><div className="val"><span className="hx-accent-text">{aprovados}</span>/{etapa.qtd_esperada}</div><div className="foot">Aprovados de {etapa.qtd_esperada} esperados</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Status</div><div className="val" style={{ fontSize: 17, color: st.c }}>{st.l}</div><div className="foot">{ar ? ar.n : ""}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Responsável</div><div className="val" style={{ fontSize: 16 }}>{etapa.responsavel_atual ?? etapa.responsavel}</div><div className="foot">{etapa.agente ? `⚡ ${AG_NOME[etapa.agente]} rascunha` : "Execução humana"}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Datas</div><div className="val" style={{ fontSize: 15 }}>{fmt(etapa.iniciada_em)} → {fmt(etapa.concluida_em)}</div><div className="foot">Início → fim · SLA {etapa.sla}</div></div>
      </div>

      <div className="ex-panel hx-glass" style={{ marginBottom: 16 }}>
        <div className="ph"><span className="pt">A tarefa</span><span className="pc">{APROVACAO_ROTULO[etapa.aprovacao] ?? etapa.aprovacao}</span></div>
        <div className="pb">
          <div className="ex-mini"><span className="ml">Começa quando</span><span className="mv" style={{ fontWeight: 600, color: "var(--mut)" }}>{etapa.gatilho}</span></div>
          <div className="ex-mini"><span className="ml">Conclui quando</span><span className="mv" style={{ fontWeight: 600, color: "var(--mut)" }}>{etapa.criterio}</span></div>
          {etapa.agente ? <div className="ex-mini"><span className="ml">Execução por IA</span><span className="mv" style={{ color: AG_COR[etapa.agente] }}>⚡ {AG_NOME[etapa.agente]} — {AG_APROVA[etapa.agente]}</span></div> : null}
        </div>
      </div>

      <div className="ex-panel hx-glass">
        <div className="ph"><span className="pt">Entregáveis</span><span className="pc">{arquivos.length}</span></div>
        {arquivos.length === 0 ? <div className="pb"><span style={{ color: "var(--dim)", fontSize: 12 }}>Nenhum arquivo enviado ainda.</span></div> : null}
        {arquivos.map((a) => {
          const s = ARQ_STATUS[a.status] ?? ARQ_STATUS.pendente;
          const url = signed.get(a.id);
          return (
            <div key={a.id} className="ex-arq">
              <div className="an">
                {url ? <a className="ex-file" href={url} target="_blank" rel="noreferrer">{a.nome}</a> : a.nome}
                <div className="am">Enviado por {a.enviado_por ?? "—"} · {fmt(a.enviado_em)}{a.aprovado_por ? ` · ${s.l.toLowerCase()} por ${a.aprovado_por}` : ""}</div>
              </div>
              <span className="ex-stat" style={{ background: `color-mix(in srgb, ${s.c} 15%, transparent)`, color: s.c }}>{s.l}</span>
              {a.status !== "aprovado" ? (
                <form action={decidirArquivo}><input type="hidden" name="arquivoId" value={a.id} /><input type="hidden" name="etapaId" value={etapa.id} /><input type="hidden" name="decisao" value="aprovado" /><button className="ex-arqbtn ok" type="submit">Aprovar</button></form>
              ) : null}
              {a.status !== "ajuste" ? (
                <form action={decidirArquivo}><input type="hidden" name="arquivoId" value={a.id} /><input type="hidden" name="etapaId" value={etapa.id} /><input type="hidden" name="decisao" value="ajuste" /><button className="ex-arqbtn no" type="submit">Pedir ajuste</button></form>
              ) : null}
            </div>
          );
        })}
        <form action={subirArquivo} className="ex-upload">
          <input type="hidden" name="etapaId" value={etapa.id} />
          <input type="file" name="file" required />
          <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 15px" }}>Subir entregável</button>
        </form>
      </div>
    </>
  );
}
