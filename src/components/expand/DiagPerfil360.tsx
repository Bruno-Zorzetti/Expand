"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DiscKey } from "@/lib/expand-disc";
import type { TempKey } from "@/lib/expand-temperamento";
import type { ArqKey } from "@/lib/expand-arquetipo";
import type { DiscAnalise, TempAnalise, ArqAnalise, VisaoIntegrada } from "@/lib/expand-analise-prompt";
import { TEMPERAMENTOS } from "@/lib/expand-temperamento";
import { ARQUETIPOS } from "@/lib/expand-arquetipo";

// ── Tipos de dados recebidos do servidor ──────────────────────────────────────
export type DiagData = {
  perfil: {
    id: string; nome: string; cargo: string | null;
    disc: Record<DiscKey, number> | null;
    disc_segmento: string | null; disc_blenda: string | null;
    arquetipo: Record<ArqKey, number> | null;
    arquetipo_dominante: ArqKey | null;
    temperamento: Record<TempKey, number> | null;
    temperamento_dominante: TempKey | null;
    temperamento_apoio: TempKey | null;
    cor: string | null;
  };
  analises: {
    disc: DiscAnalise | null;
    temperamento: TempAnalise | null;
    arquetipo: ArqAnalise | null;
    visao_integrada: VisaoIntegrada | null;
  };
};

const DISC_NOME: Record<DiscKey, string> = { D: "Dominância", I: "Influência", S: "Estabilidade", C: "Conformidade" };
const DISC_COR: Record<DiscKey, string> = { D: "#CE6A5F", I: "#E0BC85", S: "#6FBF92", C: "#4F6BED" };
const TEMP_NOME: Record<TempKey, string> = { sanguineo: "Sanguíneo", colerico: "Colérico", melancolico: "Melancólico", fleumatico: "Fleumático" };
const ARQ_NOME: Record<ArqKey, string> = {
  inocente: "Inocente", explorador: "Explorador", sabio: "Sábio", heroi: "Herói",
  foradalei: "Fora-da-lei", mago: "Mago", caracomum: "Cara Comum", amante: "Amante",
  bobo: "Bobo da Corte", prestativo: "Prestativo", criador: "Criador", governante: "Governante",
};

// ── Componentes utilitários ───────────────────────────────────────────────────

function Barra({ label, value, max, cor, pct }: { label: string; value: number; max: number; cor: string; pct?: number }) {
  const p = pct ?? (max > 0 ? (value / max) * 100 : 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: "var(--mut)", width: 106, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 9, borderRadius: 5, background: "var(--panel-2)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${p}%`, background: cor, borderRadius: 5, transition: "width .6s ease" }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--dim)", width: 30, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {typeof pct === "number" ? `${Math.round(p)}%` : value}
      </span>
    </div>
  );
}

function Radar({ disc, cor }: { disc: Record<DiscKey, number>; cor: string }) {
  const keys: DiscKey[] = ["D", "I", "S", "C"];
  const total = Object.values(disc).reduce((a, b) => a + b, 0);
  const N = keys.length, cx = 100, cy = 96, R = 68;
  const pt = (i: number, r: number) => {
    const a = (-90 + (i * 360) / N) * (Math.PI / 180);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const vals = keys.map(k => total > 0 ? disc[k] / total : 0.25);
  const poly = vals.map((v, i) => pt(i, R * Math.max(0.08, Math.min(1, v * 4))).join(",")).join(" ");
  return (
    <svg viewBox="0 0 200 192" style={{ width: "100%", maxWidth: 200, display: "block", margin: "0 auto" }}>
      {[0.33, 0.66, 1].map((rr, k) => (
        <polygon key={k} points={keys.map((_, i) => pt(i, R * rr).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth={1} />
      ))}
      {keys.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} />; })}
      <polygon points={poly} fill={`color-mix(in srgb,${cor} 22%,transparent)`} stroke={cor} strokeWidth={2} />
      {keys.map((k, i) => { const [x, y] = pt(i, R + 14); return <text key={k} x={x} y={y} fill="var(--mut)" fontSize={9} textAnchor="middle" dominantBaseline="middle">{k}</text>; })}
    </svg>
  );
}

function Lista({ items, cor }: { items: string[]; cor?: string }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--txt)", lineHeight: 1.5 }}>
          <span style={{ color: cor ?? "var(--accent)", flexShrink: 0, marginTop: 2 }}>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Secao({ titulo, children, cor }: { titulo: string; children: React.ReactNode; cor?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: cor ?? "var(--dim)", marginBottom: 8 }}>
        {titulo}
      </div>
      {children}
    </div>
  );
}

function GerarBtn({ perfilId, tipo, label, onDone }: { perfilId: string; tipo: string; label: string; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function gerar() {
    start(async () => {
      setErr(null);
      const r = await fetch("/api/expand/diag/gerar-analise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ perfilId, tipo }),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); setErr((j as Record<string,string>).error ?? "Erro"); return; }
      onDone();
    });
  }

  return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      {err && <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 10 }}>{err}</p>}
      <button
        onClick={gerar}
        disabled={pending}
        className="hx-btn hx-btn-primary"
        style={{ padding: "9px 22px", fontSize: 13 }}
      >
        {pending ? "Gerando análise…" : `✦ ${label}`}
      </button>
      <p style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 8 }}>Análise gerada por IA — leva alguns segundos</p>
    </div>
  );
}

// ── Aba DISC ─────────────────────────────────────────────────────────────────

function TabDISC({ data, onAnaliseGerada }: { data: DiagData; onAnaliseGerada: () => void }) {
  const { perfil, analises } = data;
  if (!perfil.disc) return <p style={{ color: "var(--dim)", fontSize: 13 }}>Sem dados DISC. Complete o questionário primeiro.</p>;

  const total = Object.values(perfil.disc).reduce((a, b) => a + b, 0);
  const cor = perfil.cor ?? "var(--accent)";

  // Montar segmento label
  const ord = (Object.entries(perfil.disc) as [DiscKey, number][]).sort((a, b) => b[1] - a[1]);
  const pri = ord[0][0]; const sec = ord[1][1] >= ord[0][1] * 0.8 ? ord[1][0] : null;
  const segmento = sec ? `${pri}${sec}` : pri;
  const segNome = sec ? `${DISC_NOME[pri]} com ${DISC_NOME[sec]}` : `${DISC_NOME[pri]}`;
  const a = analises.disc;

  return (
    <div>
      {/* Header visual */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <Radar disc={perfil.disc} cor={cor} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: cor, letterSpacing: "-1px", marginBottom: 2 }}>{segmento}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", marginBottom: 10 }}>{segNome}</div>
          {(["D", "I", "S", "C"] as DiscKey[]).map(k => (
            <Barra key={k} label={DISC_NOME[k]} value={perfil.disc![k]} max={total} cor={DISC_COR[k]} pct={(perfil.disc![k] / total) * 100} />
          ))}
        </div>
      </div>

      {!a ? (
        <GerarBtn perfilId={perfil.id} tipo="disc" label="Gerar análise DISC completa" onDone={onAnaliseGerada} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <Secao titulo="Perfil geral">
            <p style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.7 }}>{a.perfil_geral}</p>
          </Secao>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Pontos fortes" cor="#6FBF92"><Lista items={a.pontos_fortes} cor="#6FBF92" /></Secao>
            <Secao titulo="Pontos de atenção" cor="var(--warn)"><Lista items={a.pontos_atencao} cor="var(--warn)" /></Secao>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Motivadores" cor="var(--accent)"><Lista items={a.motivadores} /></Secao>
            <Secao titulo="Desmotivadores" cor="var(--dim)"><Lista items={a.desmotivadores} cor="var(--dim)" /></Secao>
          </div>
          <Secao titulo="Tomada de decisão">
            <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.tomada_decisao}</p>
          </Secao>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Como ela fala">
              <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.comunicacao.como_fala}</p>
            </Secao>
            <Secao titulo="Como falar com ela">
              <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.comunicacao.como_falar_com}</p>
            </Secao>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Sob pressão">
              <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.sob_pressao}</p>
            </Secao>
            <Secao titulo="Em conflitos">
              <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.em_conflitos}</p>
            </Secao>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Como lidera">
              <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.lideranca.como_lidera}</p>
            </Secao>
            <Secao titulo="Como prefere ser liderada">
              <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.lideranca.como_ser_liderado}</p>
            </Secao>
          </div>
          <Secao titulo="Feedback">
            <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.feedback}</p>
          </Secao>
          <Secao titulo="Trabalho em equipe">
            <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.trabalho_equipe}</p>
          </Secao>
          <ManualCard manual={a.manual} />
        </div>
      )}
    </div>
  );
}

// ── Aba Temperamentos ─────────────────────────────────────────────────────────

function TabTemperamento({ data, onAnaliseGerada }: { data: DiagData; onAnaliseGerada: () => void }) {
  const { perfil, analises } = data;
  if (!perfil.temperamento) return <p style={{ color: "var(--dim)", fontSize: 13 }}>Sem dados de Temperamento. Complete o questionário primeiro.</p>;

  const dom = perfil.temperamento_dominante;
  const apo = perfil.temperamento_apoio;
  const perfDesc = dom ? `${TEMP_NOME[dom]}${apo ? ` com traços de ${TEMP_NOME[apo]}` : ""}` : "";
  const T = dom ? TEMPERAMENTOS[dom] : null;
  const a = analises.temperamento;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          {dom && T && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `color-mix(in srgb,${T.cor} 18%,transparent)`, border: `2px solid ${T.cor}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>{dom === "sanguineo" ? "😄" : dom === "colerico" ? "⚡" : dom === "melancolico" ? "🌙" : "🌊"}</span>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: T.cor }}>{perfDesc}</div>
                <div style={{ fontSize: 12, color: "var(--mut)" }}>{T.arquetipo}</div>
              </div>
            </div>
          )}
          {(["sanguineo", "colerico", "melancolico", "fleumatico"] as TempKey[]).map(k => (
            <Barra key={k} label={TEMP_NOME[k]} value={perfil.temperamento![k]} max={100} cor={TEMPERAMENTOS[k].cor} pct={perfil.temperamento![k]} />
          ))}
        </div>
        {T && (
          <div style={{ width: 220, flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 8 }}>Características naturais</div>
            <Lista items={T.luzSombra.virtudes} cor={T.cor} />
          </div>
        )}
      </div>

      {!a ? (
        <GerarBtn perfilId={perfil.id} tipo="temperamento" label="Gerar análise de Temperamento" onDone={onAnaliseGerada} />
      ) : (
        <div>
          <Secao titulo="Resumo">
            <p style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.7 }}>{a.resumo}</p>
          </Secao>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Pontos fortes" cor="#6FBF92"><Lista items={a.pontos_fortes} cor="#6FBF92" /></Secao>
            <Secao titulo="Pontos de atenção" cor="var(--warn)"><Lista items={a.pontos_atencao} cor="var(--warn)" /></Secao>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Motivadores"><Lista items={a.motivadores} /></Secao>
            <Secao titulo="Necessidades no trabalho">
              <p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.necessidades}</p>
            </Secao>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Como fala"><p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.comunicacao.como_fala}</p></Secao>
            <Secao titulo="Como falar com ela"><p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.comunicacao.como_falar_com}</p></Secao>
          </div>
          {/* Como conversar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Faça" cor="#6FBF92"><Lista items={a.como_conversar.faca} cor="#6FBF92" /></Secao>
            <Secao titulo="Evite" cor="var(--red)"><Lista items={a.como_conversar.evite} cor="var(--red)" /></Secao>
          </div>
          {/* Simulador */}
          <Secao titulo="Como tende a reagir">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Ao receber uma cobrança", a.simulador.cobranca],
                ["Ao receber uma crítica", a.simulador.critica],
                ["Quando uma ideia é rejeitada", a.simulador.ideia_rejeitada],
                ["Diante de uma meta agressiva", a.simulador.meta_agressiva],
                ["Com uma mudança brusca", a.simulador.mudanca_brusca],
              ].map(([label, text]) => (
                <div key={label} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--panel-2)", border: "1px solid var(--line-2)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 6 }}>{label}</div>
                  <p style={{ fontSize: 12.5, color: "var(--txt)", lineHeight: 1.55, margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          </Secao>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Sob pressão"><p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.sob_pressao}</p></Secao>
            <Secao titulo="Em conflitos"><p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.conflitos}</p></Secao>
          </div>
          <ManualCard manual={a.manual} />
        </div>
      )}
    </div>
  );
}

// ── Aba Arquétipos ────────────────────────────────────────────────────────────

function TabArquetipo({ data, onAnaliseGerada }: { data: DiagData; onAnaliseGerada: () => void }) {
  const { perfil, analises } = data;
  if (!perfil.arquetipo) return <p style={{ color: "var(--dim)", fontSize: 13 }}>Sem dados de Arquétipo. Complete o questionário primeiro.</p>;

  const ord = (Object.entries(perfil.arquetipo) as [ArqKey, number][]).sort((a, b) => b[1] - a[1]);
  const top3 = ord.slice(0, 3);
  const dom = top3[0]?.[0];
  const A = dom ? ARQUETIPOS[dom] : null;
  const a = analises.arquetipo;

  return (
    <div>
      {/* Top 3 badges */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {top3.map(([k, v], i) => (
          <div key={k} style={{ padding: "10px 16px", borderRadius: 12, background: `color-mix(in srgb,${ARQUETIPOS[k].cor} 14%,transparent)`, border: `1px solid color-mix(in srgb,${ARQUETIPOS[k].cor} 35%,transparent)` }}>
            <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 3 }}>
              {i === 0 ? "Dominante" : i === 1 ? "Secundário" : "Complementar"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: ARQUETIPOS[k].cor }}>{ARQ_NOME[k]}</div>
            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>{Math.round((v / 5) * 100)}%</div>
          </div>
        ))}
      </div>

      {/* Barras de todos os arquétipos */}
      <div style={{ marginBottom: 20 }}>
        {ord.map(([k, v]) => (
          <Barra key={k} label={ARQ_NOME[k]} value={v} max={5} cor={ARQUETIPOS[k].cor} pct={(v / 5) * 100} />
        ))}
      </div>

      {!a ? (
        <GerarBtn perfilId={perfil.id} tipo="arquetipo" label="Gerar análise de Arquétipo" onDone={onAnaliseGerada} />
      ) : (
        <div>
          <Secao titulo="Essência">
            <p style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.7 }}>{a.essencia}</p>
          </Secao>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginBottom: 20 }}>
            {[
              ["Motivação central", a.motivacao],
              ["Desejo", a.desejo],
              ["Meta", a.meta],
              ["Medo", a.medo],
              ["Estratégia", a.estrategia],
              ["Dádiva", a.dadiva],
            ].map(([label, text]) => (
              <Secao key={label} titulo={label}><p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{text}</p></Secao>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Lado luz" cor="#6FBF92"><Lista items={a.luz} cor="#6FBF92" /></Secao>
            <Secao titulo="Lado sombra" cor="var(--dim)"><Lista items={a.sombra} cor="var(--warn)" /></Secao>
          </div>
          {/* Profissional */}
          <Secao titulo="Perfil profissional">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Liderança", a.profissional.lideranca],
                ["Vendas", a.profissional.vendas],
                ["Criatividade", a.profissional.criatividade],
                ["Negociação", a.profissional.negociacao],
                ["Equipe", a.profissional.equipe],
              ].map(([label, text]) => (
                <div key={label} style={{ padding: "10px 14px", borderRadius: 10, background: "var(--panel-2)", border: "1px solid var(--line-2)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 5 }}>{label}</div>
                  <p style={{ fontSize: 12.5, color: "var(--txt)", lineHeight: 1.55, margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          </Secao>
          {/* Marca pessoal */}
          <Secao titulo="Marca pessoal">
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "var(--panel-2)", border: "1px solid var(--line-2)", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <Secao titulo="Personalidade"><p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.marca_pessoal.personalidade}</p></Secao>
                  <Secao titulo="Tom de voz"><p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.marca_pessoal.tom_voz}</p></Secao>
                  <Secao titulo="Direção criativa"><p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{a.marca_pessoal.estilo}</p></Secao>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <Secao titulo="Palavras que combinam"><Lista items={a.marca_pessoal.palavras_combinam} /></Secao>
                  <Secao titulo="Palavras a evitar" cor="var(--dim)"><Lista items={a.marca_pessoal.palavras_evitar} cor="var(--dim)" /></Secao>
                </div>
              </div>
              {/* Paleta */}
              <Secao titulo="Paleta sugerida">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {Object.entries(a.marca_pessoal.paleta).map(([key, hex]) => (
                    <div key={key} title={`${key}: ${hex}`} style={{ textAlign: "center" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: hex, border: "2px solid color-mix(in srgb,#fff 20%,transparent)", marginBottom: 4 }} />
                      <div style={{ fontSize: 9, color: "var(--dim)", textTransform: "capitalize" }}>{key}</div>
                    </div>
                  ))}
                </div>
              </Secao>
            </div>
          </Secao>
          <ManualCard manual={a.manual} />
        </div>
      )}
    </div>
  );
}

// ── Aba Visão Integrada ───────────────────────────────────────────────────────

function TabVisaoIntegrada({ data, onAnaliseGerada }: { data: DiagData; onAnaliseGerada: () => void }) {
  const { perfil, analises } = data;
  const temTudo = perfil.disc && perfil.arquetipo_dominante && perfil.temperamento_dominante;
  if (!temTudo) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <p style={{ fontSize: 14, color: "var(--dim)" }}>Complete os 3 diagnósticos para gerar a Visão Integrada 360°.</p>
      </div>
    );
  }
  const a = analises.visao_integrada;
  const dom = perfil.temperamento_dominante;
  const apo = perfil.temperamento_apoio;
  const arqDom = perfil.arquetipo_dominante;

  // Badges resumo
  const ord = perfil.disc ? (Object.entries(perfil.disc) as [DiscKey, number][]).sort((a, b) => b[1] - a[1]) : [];
  const dpri = ord[0]?.[0]; const dsec = ord[1] && ord[1][1] >= ord[0]?.[1] * 0.8 ? ord[1][0] : null;
  const discLabel = dsec ? `${dpri}${dsec}` : dpri;

  return (
    <div>
      {/* Badges resumo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "DISC", value: discLabel ?? "—", cor: "#4F6BED" },
          { label: "Temperamento", value: dom ? `${TEMP_NOME[dom]}${apo ? ` / ${TEMP_NOME[apo]}` : ""}` : "—", cor: dom ? TEMPERAMENTOS[dom].cor : "var(--dim)" },
          { label: "Arquétipo", value: arqDom ? ARQ_NOME[arqDom] : "—", cor: arqDom ? ARQUETIPOS[arqDom].cor : "var(--dim)" },
        ].map(b => (
          <div key={b.label} style={{ padding: "8px 14px", borderRadius: 10, background: `color-mix(in srgb,${b.cor} 10%,transparent)`, border: `1px solid color-mix(in srgb,${b.cor} 28%,transparent)` }}>
            <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 2 }}>{b.label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: b.cor }}>{b.value}</div>
          </div>
        ))}
      </div>

      {!a ? (
        <GerarBtn perfilId={perfil.id} tipo="visao_integrada" label="Gerar Síntese 360°" onDone={onAnaliseGerada} />
      ) : (
        <div>
          <Secao titulo="Quem é esta pessoa">
            <p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.8, whiteSpace: "pre-line" }}>{a.quem_e}</p>
          </Secao>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {[
              ["Como pensa", a.como_pensa],
              ["Como age", a.como_age],
              ["Como decide", a.como_decide],
              ["Como se comunica", a.como_comunica],
              ["Como se relaciona", a.como_relaciona],
              ["Sob pressão", a.como_pressao],
              ["Como lidera", a.como_lidera],
            ].map(([label, text]) => (
              <Secao key={label} titulo={label}><p style={{ fontSize: 13, color: "var(--txt)", lineHeight: 1.6 }}>{text}</p></Secao>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginBottom: 20 }}>
            <Secao titulo="Principais forças" cor="#6FBF92"><Lista items={a.forcas} cor="#6FBF92" /></Secao>
            <Secao titulo="Áreas de desenvolvimento" cor="var(--accent)"><Lista items={a.desenvolvimento} /></Secao>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <Secao titulo="Motivadores"><Lista items={a.motivadores} /></Secao>
            <Secao titulo="Resistências" cor="var(--warn)"><Lista items={a.resistencias} cor="var(--warn)" /></Secao>
          </div>
          {/* Manual de instruções */}
          <div style={{ padding: "20px 22px", borderRadius: 14, background: "color-mix(in srgb,var(--accent) 7%,transparent)", border: "1px solid color-mix(in srgb,var(--accent) 22%,transparent)", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--accent)", marginBottom: 14 }}>
              Manual de instruções
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["Para obter o melhor", a.manual.para_obter_melhor],
                ["Ao falar com ela", a.manual.ao_falar],
                ["Ao cobrar", a.manual.ao_cobrar],
                ["Ao discordar", a.manual.ao_discordar],
                ["Ao apresentar uma ideia", a.manual.ao_apresentar_ideia],
                ["Quando estiver sob pressão", a.manual.sob_pressao],
                ["Ao dar feedback", a.manual.ao_dar_feedback],
                ["Para motivar", a.manual.para_motivar],
              ].map(([label, text]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent)", marginBottom: 4 }}>{label}</div>
                  <p style={{ fontSize: 12.5, color: "var(--txt)", lineHeight: 1.55, margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid color-mix(in srgb,var(--accent) 20%,transparent)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--red)", marginBottom: 4 }}>Evite com esta pessoa</div>
              <p style={{ fontSize: 12.5, color: "var(--txt)", lineHeight: 1.55, margin: 0 }}>{a.manual.evite}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Manual card reutilizável ──────────────────────────────────────────────────

function ManualCard({ manual }: { manual: { para_obter_melhor: string; ao_cobrar: string; ao_dar_feedback: string; para_motivar: string } }) {
  return (
    <div style={{ padding: "18px 20px", borderRadius: 14, background: "color-mix(in srgb,var(--accent) 7%,transparent)", border: "1px solid color-mix(in srgb,var(--accent) 22%,transparent)", marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--accent)", marginBottom: 12 }}>
        Como trabalhar com ela
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          ["Para obter o melhor", manual.para_obter_melhor],
          ["Ao cobrar resultados", manual.ao_cobrar],
          ["Ao dar feedback", manual.ao_dar_feedback],
          ["Para motivar", manual.para_motivar],
        ].map(([label, text]) => (
          <div key={label}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", marginBottom: 4 }}>{label}</div>
            <p style={{ fontSize: 12.5, color: "var(--txt)", lineHeight: 1.55, margin: 0 }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

const TABS = [
  { id: "disc", label: "DISC", cor: "#4F6BED" },
  { id: "temperamento", label: "Temperamentos", cor: "#E0BC85" },
  { id: "arquetipo", label: "Arquétipos", cor: "#A07644" },
  { id: "visao_integrada", label: "Visão Integrada", cor: "var(--accent)" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function DiagPerfil360({ data }: { data: DiagData }) {
  const [tab, setTab] = useState<TabId>("disc");
  const router = useRouter();

  function onAnaliseGerada() { router.refresh(); }

  const tabCor = TABS.find(t => t.id === tab)?.cor ?? "var(--accent)";

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--line-2)", paddingBottom: 0, flexWrap: "wrap" }}>
        {TABS.map(t => {
          const ativo = tab === t.id;
          const temDados = t.id === "disc" ? !!data.perfil.disc
            : t.id === "temperamento" ? !!data.perfil.temperamento
            : t.id === "arquetipo" ? !!data.perfil.arquetipo
            : !!(data.perfil.disc && data.perfil.temperamento_dominante && data.perfil.arquetipo_dominante);
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "9px 16px", fontSize: 12.5, fontWeight: ativo ? 800 : 600,
                background: "none", border: "none", cursor: "pointer",
                color: ativo ? t.cor : "var(--mut)",
                borderBottom: ativo ? `2px solid ${t.cor}` : "2px solid transparent",
                marginBottom: -1, fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {t.label}
              {!temDados && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "color-mix(in srgb,var(--dim) 15%,transparent)", color: "var(--dim)" }}>pend.</span>}
              {temDados && !!data.analises[t.id === "visao_integrada" ? "visao_integrada" : t.id as keyof typeof data.analises] && (
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "color-mix(in srgb,var(--green) 15%,transparent)", color: "var(--green)" }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === "disc" && <TabDISC data={data} onAnaliseGerada={onAnaliseGerada} />}
        {tab === "temperamento" && <TabTemperamento data={data} onAnaliseGerada={onAnaliseGerada} />}
        {tab === "arquetipo" && <TabArquetipo data={data} onAnaliseGerada={onAnaliseGerada} />}
        {tab === "visao_integrada" && <TabVisaoIntegrada data={data} onAnaliseGerada={onAnaliseGerada} />}
      </div>
    </div>
  );
}
