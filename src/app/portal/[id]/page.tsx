import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FASES } from "@/lib/expand-esteira";
import { faseDoCliente, type EtapaRow } from "@/lib/expand-tarefas";
import { TRACK, CLI_DEVERES } from "@/lib/expand-gov";
import Ajuda from "@/components/expand/Ajuda";
import { solicitarDemanda } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

export default async function EsteMes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cli } = await supabase.from("expand_cliente_publico").select("nome, maturidade").eq("id", id).single();
  const { data: etData } = await supabase.from("expand_etapas").select("*").eq("cliente_id", id).order("ordem");
  const etapas = (etData ?? []) as EtapaRow[];

  let faseAtual: number;
  if (etapas.length) {
    const run = etapas.filter((e) => e.status === "run").map((e) => e.fase);
    faseAtual = run.length ? Math.min(...run) : etapas.every((e) => e.status === "done") ? 15 : faseDoCliente(cli?.maturidade ?? null);
  } else {
    faseAtual = faseDoCliente(cli?.maturidade ?? null);
  }
  const faseNome = FASES.find((f) => f.id === faseAtual)?.nome ?? "";

  let pendentes: { etapa: EtapaRow; qtd: number }[] = [];
  let producao: EtapaRow[] = [];
  let entregues: EtapaRow[] = [];
  if (etapas.length) {
    const vis = etapas.filter((e) => e.visivel_cliente);
    const ids = etapas.map((e) => e.id);
    const { data: arqs } = await supabase.from("expand_arquivos").select("etapa_id,status").in("etapa_id", ids);
    const pend = new Map<string, number>();
    (arqs ?? []).forEach((a: { etapa_id: string; status: string }) => {
      if (a.status === "pendente") pend.set(a.etapa_id, (pend.get(a.etapa_id) ?? 0) + 1);
    });
    pendentes = vis.filter((e) => pend.get(e.id)).map((e) => ({ etapa: e, qtd: pend.get(e.id)! }));
    producao = vis.filter((e) => e.status === "run" && !pend.get(e.id)).slice(0, 4);
    entregues = vis.filter((e) => e.status === "done").slice(-4).reverse();
  }

  const IC = {
    voce: { i: "✎", c: "var(--accent)", bg: "color-mix(in srgb, var(--accent) 14%, transparent)" },
    prod: { i: "◐", c: "var(--green)", bg: "color-mix(in srgb, var(--green) 14%, transparent)" },
    ok: { i: "✓", c: "var(--green)", bg: "color-mix(in srgb, var(--green) 13%, transparent)" },
  };

  return (
    <>
      <div className="ex-hero">
        <div className="eb">Você está aqui</div>
        <h2>Olá, {cli?.nome}</h2>
        <p>Sua marca está na fase de <b style={{ color: "var(--txt)" }}>{faseNome}</b>. Acompanhe abaixo o que está com você, o que está em produção na Expand e o que já foi entregue.</p>
        <div className="ex-track">
          {TRACK.map((s, i) => {
            const de = i ? TRACK[i - 1].ate : 0;
            const st = faseAtual > s.ate ? "done" : faseAtual > de ? "now" : "";
            return <div key={s.l} className={`ex-st ${st}`}><i>{st === "done" ? "✓" : i + 1}</i><div className="l">{s.l}</div></div>;
          })}
        </div>
      </div>

      <div className="ex-kpis" style={{ marginBottom: 16 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Fase atual</div><div className="val" style={{ fontSize: 16 }}>{faseNome}</div><div className="foot">Fase {faseAtual} de 15</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Aguardando você</div><div className="val" style={{ color: pendentes.length ? "var(--accent)" : "var(--green)" }}>{pendentes.length}</div><div className="foot">Itens para aprovar</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Em produção</div><div className="val">{producao.length}</div><div className="foot">A equipe está tocando</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Já entregue</div><div className="val" style={{ color: "var(--green)" }}>{entregues.length}</div><div className="foot">Concluídos</div></div>
      </div>

      {/* Cliente solicita uma nova demanda → entra na esteira e avisa a equipe */}
      <details className="hx-glass" style={{ borderRadius: 12, marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
        <summary style={{ listStyle: "none", cursor: "pointer", padding: "13px 17px", fontWeight: 700, fontSize: 13.5 }}>＋ Solicitar uma nova demanda <span style={{ fontWeight: 400, fontSize: 12, color: "var(--mut)" }}>· pediu algo novo? registre aqui que a equipe recebe na hora</span></summary>
        <form action={solicitarDemanda} style={{ display: "grid", gap: 10, padding: "0 17px 16px", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <input type="hidden" name="clienteId" value={id} />
          <label><span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, display: "block", marginBottom: 4 }}>O que você precisa</span><input name="titulo" required placeholder="ex.: Um vídeo extra para a campanha de junho" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 13.5, outline: "none", fontFamily: "inherit" }} /></label>
          <label><span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, display: "block", marginBottom: 4 }}>Detalhes (opcional)</span><textarea name="desc" rows={2} placeholder="contexto, prazo desejado, referências…" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 13.5, outline: "none", fontFamily: "inherit", resize: "vertical" }} /></label>
          <div><button className="hx-btn hx-btn-primary" type="submit">Enviar demanda</button></div>
        </form>
      </details>

      <div className="ex-two">
        <div className="ex-panel hx-glass">
          <div className="ph"><span className="pt">Aguardando você<Ajuda t="Arquivos que a Expand enviou e que precisam do seu aval. Você aprova ou pede ajuste na aba Aprovações." /></span><span className="pc">{pendentes.length}</span></div>
          <div className="pb" style={{ gap: 0 }}>
            {pendentes.length ? pendentes.map(({ etapa, qtd }) => (
              <div key={etapa.id} className="ex-item">
                <div className="ii" style={{ background: IC.voce.bg, color: IC.voce.c }}>{IC.voce.i}</div>
                <div style={{ flex: 1 }}><div className="it">{etapa.titulo}</div><div className="idx">{qtd} {qtd > 1 ? "arquivos" : "arquivo"} para conferir e aprovar</div></div>
                <Link href={`/portal/${id}/aprovacoes`} className="hx-btn hx-btn-primary ia" style={{ padding: "7px 13px", fontSize: 12 }}>Revisar</Link>
              </div>
            )) : <span style={{ color: "var(--dim)", fontSize: 12, padding: "6px 0" }}>Nada aguardando você agora. 👍</span>}
          </div>
        </div>

        <div className="ex-panel hx-glass">
          <div className="ph"><span className="pt">Em produção na Expand<Ajuda t="O que a nossa equipe está tocando agora no seu projeto." /></span><span className="pc">{producao.length}</span></div>
          <div className="pb" style={{ gap: 0 }}>
            {producao.length ? producao.map((e) => (
              <div key={e.id} className="ex-item">
                <div className="ii" style={{ background: IC.prod.bg, color: IC.prod.c }}>{IC.prod.i}</div>
                <div style={{ flex: 1 }}><div className="it">{e.titulo}</div><div className="idx">{e.responsavel_atual ?? e.responsavel} · em andamento</div></div>
              </div>
            )) : <span style={{ color: "var(--dim)", fontSize: 12, padding: "6px 0" }}>A equipe está preparando os próximos passos.</span>}
          </div>
        </div>
      </div>

      <div className="ex-panel hx-glass" style={{ marginTop: 16 }}>
        <div className="ph"><span className="pt">Já entregue<Ajuda t="Entregas já concluídas e aprovadas." /></span><span className="pc">{entregues.length}</span></div>
        <div className="pb" style={{ gap: 0 }}>
          {entregues.length ? entregues.map((e) => (
            <div key={e.id} className="ex-item">
              <div className="ii" style={{ background: IC.ok.bg, color: IC.ok.c }}>{IC.ok.i}</div>
              <div style={{ flex: 1 }}><div className="it">{e.titulo}</div><div className="idx">{e.responsavel_atual ?? e.responsavel} · concluído</div></div>
            </div>
          )) : <span style={{ color: "var(--dim)", fontSize: 12, padding: "6px 0" }}>Assim que os primeiros entregáveis forem aprovados, aparecem aqui.</span>}
        </div>
      </div>

      <div className="ex-grph" style={{ marginTop: 24 }}><span className="gt">O combinado — o que depende de você</span><span className="gl" /></div>
      <div className="ex-cards">
        {CLI_DEVERES.map((d) => (
          <div key={d.h} className="hx-glass" style={{ padding: "15px 17px", borderLeft: "3px solid var(--accent)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{d.h}</div>
            <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55 }}>{d.p}</div>
          </div>
        ))}
      </div>
    </>
  );
}
