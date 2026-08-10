import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FASES } from "@/lib/expand-esteira";
import { faseDoCliente, type EtapaRow } from "@/lib/expand-tarefas";
import { TRACK, CLI_DEVERES } from "@/lib/expand-gov";
import Ajuda from "@/components/expand/Ajuda";

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

  // Frase de status: em 2 segundos o cliente sabe se precisa agir.
  const totalEntregue = etapas.filter((e) => e.visivel_cliente && e.status === "done").length;
  const status = pendentes.length
    ? { t: `${pendentes.length} ${pendentes.length > 1 ? "itens esperam" : "item espera"} sua aprovação`, s: "Sua resposta destrava a próxima entrega.", c: "var(--accent)", i: "✎" }
    : producao.length
      ? { t: "Tudo em dia — estamos produzindo", s: `${producao.length} ${producao.length > 1 ? "entregas em andamento" : "entrega em andamento"} agora.`, c: "var(--green)", i: "◐" }
      : { t: "Tudo em dia", s: "Nada pendente com você no momento.", c: "var(--green)", i: "✓" };

  // Próxima entrega prevista (a data mais próxima ainda no futuro).
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const prox = etapas
    .filter((e) => e.visivel_cliente && e.status !== "done" && e.data_prevista)
    .map((e) => ({ e, d: new Date(String(e.data_prevista) + "T12:00") }))
    .filter((x) => x.d >= hoje)
    .sort((a, b) => a.d.getTime() - b.d.getTime())[0] ?? null;

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

      {/* Frase de status + próxima entrega + prova de valor acumulada */}
      <div className="hx-glass" style={{ borderRadius: 14, padding: "16px 18px", marginBottom: 16, borderLeft: `4px solid ${status.c}`, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${status.c} 15%, transparent)`, color: status.c, fontSize: 20, flexShrink: 0 }}>{status.i}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: status.c }}>{status.t}</div>
          <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 2 }}>{status.s}</div>
        </div>
        {prox ? (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>Próxima entrega</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{prox.d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</div>
            <div style={{ fontSize: 11, color: "var(--mut)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prox.e.titulo}</div>
          </div>
        ) : null}
        {totalEntregue ? (
          <div style={{ textAlign: "right", paddingLeft: 16, borderLeft: "1px solid var(--line)" }}>
            <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>Já entregamos</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{totalEntregue}</div>
            <div style={{ fontSize: 11, color: "var(--mut)" }}>neste contrato</div>
          </div>
        ) : null}
      </div>

      <div className="ex-kpis" style={{ marginBottom: 16 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Fase atual</div><div className="val" style={{ fontSize: 16 }}>{faseNome}</div><div className="foot">Fase {faseAtual} de 15</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Aguardando você</div><div className="val" style={{ color: pendentes.length ? "var(--accent)" : "var(--green)" }}>{pendentes.length}</div><div className="foot">Itens para aprovar</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Em produção</div><div className="val">{producao.length}</div><div className="foot">A equipe está tocando</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Já entregue</div><div className="val" style={{ color: "var(--green)" }}>{entregues.length}</div><div className="foot">Concluídos</div></div>
      </div>

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

      {/* Acordeão: aparece só quando o cliente quiser saber (menos carga cognitiva) */}
      <details className="hx-glass" style={{ borderRadius: 12, marginTop: 24, borderLeft: "3px solid var(--accent)" }}>
        <summary style={{ listStyle: "none", cursor: "pointer", padding: "13px 17px", fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ color: "var(--accent)" }}>▸</span> Esperamos de você
          <span style={{ fontWeight: 400, fontSize: 12, color: "var(--mut)" }}>· o que faz seu projeto andar mais rápido</span>
        </summary>
        <div className="ex-cards" style={{ padding: "12px 17px 17px", borderTop: "1px solid var(--line)" }}>
          {CLI_DEVERES.map((d) => (
            <div key={d.h} className="hx-glass" style={{ padding: "15px 17px", borderLeft: "3px solid var(--accent)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{d.h}</div>
              <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55 }}>{d.p}</div>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
