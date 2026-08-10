import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TEMPERAMENTOS, ORDEM_TEMP, type TempKey } from "@/lib/expand-temperamento";
import { salvarTemperamentoCliente } from "@/app/expand/actions";
import TesteTemperamento from "@/components/expand/TesteTemperamento";

export const dynamic = "force-dynamic";

type Diag = { id: string; pessoa_nome: string; pessoa_papel: string | null; tipo: string; scores: Record<string, number>; dominante: string | null; apoio: string | null; rotulo: string | null; segundos: number | null; criado_em: string };

const Sec = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", fontWeight: 700, marginBottom: 5 }}>{t}</div>
    <div style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.6 }}>{children}</div>
  </div>
);

export default async function Diagnosticos({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> }) {
  const { id } = await params;
  const { novo } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("expand_diag_cliente").select("id, pessoa_nome, pessoa_papel, tipo, scores, dominante, apoio, rotulo, segundos, criado_em").eq("cliente_id", id).order("criado_em", { ascending: false });
  const diags = (data ?? []) as Diag[];
  const temps = diags.filter((d) => d.tipo === "temperamento");

  if (novo === "temperamento" || (!temps.length && novo !== "0")) {
    return (
      <>
        <div className="ex-hero">
          <div className="eb">Diagnóstico 1 de 3</div>
          <h2>Temperamento</h2>
          <p>Entender como você funciona nos ajuda a trabalhar do seu jeito: como comunicamos, com que ritmo entregamos e como conduzimos as decisões. São {32} afirmações — responda pensando em como você é de verdade, não em como gostaria de ser. Leva cerca de 5 minutos.</p>
        </div>
        <TesteTemperamento clienteId={id} salvar={salvarTemperamentoCliente} />
      </>
    );
  }

  const tempo = (s: number | null) => (s == null ? "" : s < 90 ? `${s}s` : `${Math.round(s / 60)} min`);

  return (
    <>
      <div className="ex-hero">
        <div className="eb">Perfil comportamental</div>
        <h2>Diagnósticos</h2>
        <p>O que já sabemos sobre quem toca este projeto. Cada sócio ou responsável pode fazer o seu — quanto mais gente, melhor a leitura do time.</p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <Link href={`/portal/${id}/diagnosticos?novo=temperamento`} className="hx-btn hx-btn-primary" style={{ textDecoration: "none" }}>＋ Fazer o teste de Temperamento</Link>
      </div>

      {temps.map((d) => {
        const dom = TEMPERAMENTOS[(d.dominante ?? "sanguineo") as TempKey];
        const apo = d.apoio ? TEMPERAMENTOS[d.apoio as TempKey] : null;
        const rapido = (d.segundos ?? 999) < 60;
        return (
          <div key={d.id} className="hx-glass" style={{ borderRadius: 16, padding: "20px 22px", marginBottom: 16, borderLeft: `4px solid ${dom.cor}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${dom.cor} 18%, transparent)`, color: dom.cor, fontSize: 24, flexShrink: 0 }}>◈</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 19, fontWeight: 800 }}>{d.rotulo} <span style={{ fontSize: 13, fontWeight: 600, color: dom.cor }}>· {dom.arquetipo}</span></div>
                <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{d.pessoa_nome}{d.pessoa_papel ? ` · ${d.pessoa_papel}` : ""} · {new Date(d.criado_em).toLocaleDateString("pt-BR")}{d.segundos ? ` · respondeu em ${tempo(d.segundos)}` : ""}</div>
              </div>
              {rapido ? <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--warn) 16%, transparent)", color: "var(--warn)" }}>respondido muito rápido</span> : null}
            </div>

            {/* Gráfico de barras dos 4 temperamentos */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
              {ORDEM_TEMP.map((k) => {
                const v = d.scores?.[k] ?? 0;
                const t = TEMPERAMENTOS[k];
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 92, fontSize: 12, color: k === d.dominante ? "var(--txt)" : "var(--mut)", fontWeight: k === d.dominante ? 700 : 400 }}>{t.nome}</span>
                    <div style={{ flex: 1, height: 9, borderRadius: 5, background: "var(--panel-2)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${v}%`, background: t.cor, opacity: k === d.dominante ? 1 : 0.55, borderRadius: 5 }} />
                    </div>
                    <span style={{ width: 34, textAlign: "right", fontSize: 12, color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>{v}%</span>
                  </div>
                );
              })}
            </div>

            <p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.6, marginBottom: 18 }}>{dom.resumo}{apo ? ` Com um traço forte de ${apo.nome.toLowerCase()}: ${apo.resumo.toLowerCase()}` : ""}</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
              <div>
                <Sec t="1 · Filtro de percepção"><b>Intensidade:</b> {dom.percepcao.intensidade}<br /><b>Duração:</b> {dom.percepcao.duracao}</Sec>
                <Sec t="2 · Reação imediata"><b>Velocidade:</b> {dom.reacao.velocidade}<br /><b>Direção:</b> {dom.reacao.direcao}</Sec>
                <Sec t="3 · Energia e ritmo"><b>Ritmo:</b> {dom.energia.ritmo}<br /><b>Motivação:</b> {dom.energia.motivacao}</Sec>
              </div>
              <div>
                <Sec t="4 · Expressão e comunicação"><b>Tom:</b> {dom.expressao.tom}<br /><b>Abertura:</b> {dom.expressao.abertura}</Sec>
                <Sec t="5 · Relacionamentos"><b>Foco:</b> {dom.relacoes.foco}<br /><b>Conflitos:</b> {dom.relacoes.conflitos}</Sec>
                <Sec t="6 · Luz e sombra">
                  <b style={{ color: "var(--green)" }}>Virtudes:</b> {dom.luzSombra.virtudes.join(" · ")}<br />
                  <b style={{ color: "var(--warn)" }}>Pontos cegos:</b> {dom.luzSombra.sombras.join(" · ")}
                </Sec>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: dom.cor, marginBottom: 10 }}>{dom.arquetipo} — {dom.figuras}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
                <div>
                  <Sec t="Desejo sagrado"><b>Busca:</b> {dom.desejo.busca}<br /><b>Valor inegociável:</b> {dom.desejo.valor}</Sec>
                  <Sec t="Medo primordial">{dom.medo}</Sec>
                </div>
                <div>
                  <Sec t="Jornada do herói">{dom.jornada}</Sec>
                  <Sec t="Habilidades naturais">{dom.habilidades.join(" · ")}</Sec>
                </div>
              </div>
              <div style={{ background: "var(--panel-2)", borderRadius: 10, padding: "13px 15px", marginTop: 6 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", fontWeight: 700, marginBottom: 7 }}>Como trabalhar bem com esta pessoa</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--mut)", lineHeight: 1.7 }}>
                  {dom.comoLidar.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
            </div>
          </div>
        );
      })}

      <div className="hx-glass" style={{ borderRadius: 12, padding: "16px 18px", marginTop: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Próximos diagnósticos</p>
        <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.55 }}>Depois do Temperamento vêm o <b>DISC</b> (perfil de trabalho, com blendas) e o <b>Arquétipo de Marca</b> (posicionamento da sua empresa). Em breve por aqui.</p>
      </div>
    </>
  );
}
