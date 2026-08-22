"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DiscKey } from "@/lib/expand-disc";
import { DISC_SEG } from "@/lib/expand-disc";
import type { TempKey } from "@/lib/expand-temperamento";
import type { ArqKey } from "@/lib/expand-arquetipo";
import type { DiscAnalise, TempAnalise, ArqAnalise, VisaoIntegrada } from "@/lib/expand-analise-prompt";
import { TEMPERAMENTOS } from "@/lib/expand-temperamento";
import { ARQUETIPOS } from "@/lib/expand-arquetipo";

// ── Tipos ─────────────────────────────────────────────────────────────────────
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

// ── Constantes ────────────────────────────────────────────────────────────────
const DISC_NOME: Record<DiscKey, string> = { D: "Dominância", I: "Influência", S: "Estabilidade", C: "Conformidade" };
const DISC_COR:  Record<DiscKey, string> = { D: "#CE6A5F", I: "#E0BC85", S: "#6FBF92", C: "#4F6BED" };
const DISC_DESC: Record<DiscKey, string> = {
  D: "Orientação a resultado, decisão rápida e assertividade. Enfrenta desafios de frente e não foge do conflito necessário.",
  I: "Comunicação, entusiasmo e persuasão. Energiza o ambiente, constrói relacionamentos com facilidade e inspira o time.",
  S: "Paciência, constância e suporte. Mantém o ritmo, cuida das pessoas e prefere ambientes previsíveis e colaborativos.",
  C: "Análise, rigor técnico e precisão. Segue processos com disciplina e garante qualidade antes de agir.",
};
const TEMP_NOME: Record<TempKey, string> = {
  sanguineo: "Sanguíneo", colerico: "Colérico", melancolico: "Melancólico", fleumatico: "Fleumático",
};
const ARQ_NOME: Record<ArqKey, string> = {
  inocente: "Inocente", explorador: "Explorador", sabio: "Sábio", heroi: "Herói",
  foradalei: "Fora-da-lei", mago: "Mago", caracomum: "Cara Comum", amante: "Amante",
  bobo: "Bobo da Corte", prestativo: "Prestativo", criador: "Criador", governante: "Governante",
};

// ── Primitivas de UI ──────────────────────────────────────────────────────────
function Barra({ label, value, max, cor, pct }: { label: string; value: number; max: number; cor: string; pct?: number }) {
  const p = pct ?? (max > 0 ? (value / max) * 100 : 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
      <span style={{ fontSize: 12, color: "var(--mut)", width: 116, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 10, borderRadius: 5, background: "var(--panel-2)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${p}%`, background: cor, borderRadius: 5, transition: "width .6s ease" }} />
      </div>
      <span style={{ fontSize: 12, color: "var(--dim)", width: 34, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {typeof pct === "number" ? `${Math.round(p)}%` : value}
      </span>
    </div>
  );
}

function Radar({ disc, cor }: { disc: Record<DiscKey, number>; cor: string }) {
  const keys: DiscKey[] = ["D", "I", "S", "C"];
  const total = Object.values(disc).reduce((a, b) => a + b, 0);
  const N = keys.length, cx = 100, cy = 96, R = 70;
  const pt = (i: number, r: number) => {
    const a = (-90 + (i * 360) / N) * (Math.PI / 180);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const vals = keys.map(k => total > 0 ? disc[k] / total : 0.25);
  const poly = vals.map((v, i) => pt(i, R * Math.max(0.08, Math.min(1, v * 4))).join(",")).join(" ");
  return (
    <svg viewBox="0 0 200 192" style={{ width: "100%", maxWidth: 200, display: "block", margin: "0 auto" }}>
      {[0.33, 0.66, 1].map((rr, k) => (
        <polygon key={k} points={keys.map((_, i) => pt(i, R * rr).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth={k === 2 ? 1.5 : 1} strokeOpacity={k === 2 ? 0.5 : 0.25} />
      ))}
      {keys.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} strokeOpacity={0.35} />; })}
      <polygon points={poly} fill={`color-mix(in srgb,${cor} 25%,transparent)`} stroke={cor} strokeWidth={2.5} />
      {keys.map((k, i) => {
        const [x, y] = pt(i, R + 16);
        const pct = total > 0 ? Math.round((disc[k] / total) * 100) : 0;
        return (
          <g key={k}>
            <text x={x} y={y - 4} fill={DISC_COR[k]} fontSize={10} textAnchor="middle" dominantBaseline="middle" fontWeight="800">{k}</text>
            <text x={x} y={y + 8} fill="var(--mut)" fontSize={9} textAnchor="middle" dominantBaseline="middle">{pct}%</text>
          </g>
        );
      })}
    </svg>
  );
}

function Lista({ items, cor }: { items: string[]; cor?: string }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 9, fontSize: 14, color: "var(--txt)", lineHeight: 1.55 }}>
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
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: cor ?? "var(--dim)", marginBottom: 9 }}>
        {titulo}
      </div>
      {children}
    </div>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      padding: "16px 18px", borderRadius: 12,
      background: accent ? `color-mix(in srgb,${accent} 7%,transparent)` : "var(--panel-2)",
      border: `1px solid ${accent ? `color-mix(in srgb,${accent} 22%,transparent)` : "var(--line-2)"}`,
      marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

// ── Botão gerar / regenerar ───────────────────────────────────────────────────
function GerarBtn({
  perfilId, tipo, label, onDone, variant = "primary",
}: {
  perfilId: string; tipo: string; label: string;
  onDone: (analise: unknown) => void;
  variant?: "primary" | "regenerar";
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [confirma, setConfirma] = useState(false);

  function gerar() {
    if (variant === "regenerar" && !confirma) { setConfirma(true); return; }
    setConfirma(false);
    start(async () => {
      setErr(null);
      const r = await fetch("/api/expand/diag/gerar-analise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ perfilId, tipo }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr((j as Record<string, string>).error ?? "Erro ao gerar análise");
        return;
      }
      const j = await r.json().catch(() => ({ analise: null })) as { analise: unknown };
      onDone(j.analise);
    });
  }

  if (variant === "regenerar") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {err && <span style={{ fontSize: 12, color: "var(--red)" }}>{err}</span>}
        {confirma ? (
          <>
            <span style={{ fontSize: 12, color: "var(--warn)" }}>Isso consome créditos. Confirmar?</span>
            <button onClick={gerar} disabled={pending} style={{ fontSize: 11.5, padding: "4px 12px", borderRadius: 7, border: "1px solid var(--red)", background: "none", color: "var(--red)", cursor: "pointer", fontFamily: "inherit" }}>
              {pending ? "Gerando…" : "Sim, regenerar"}
            </button>
            <button onClick={() => setConfirma(false)} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 7, border: "1px solid var(--line-2)", background: "none", color: "var(--dim)", cursor: "pointer", fontFamily: "inherit" }}>
              Cancelar
            </button>
          </>
        ) : (
          <button onClick={gerar} disabled={pending} style={{ fontSize: 11.5, padding: "4px 12px", borderRadius: 7, border: "1px solid var(--line-2)", background: "none", color: "var(--dim)", cursor: "pointer", fontFamily: "inherit" }}>
            {pending ? "Gerando…" : "⟳ Regenerar"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "28px 0" }}>
      {err && <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 12 }}>{err}</p>}
      <button onClick={gerar} disabled={pending} className="hx-btn hx-btn-primary" style={{ padding: "10px 26px", fontSize: 14 }}>
        {pending ? "Gerando análise…" : `✦ ${label}`}
      </button>
      <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 10 }}>Análise gerada por IA — consome créditos · leva ~30 s</p>
    </div>
  );
}

// ── PDF export ────────────────────────────────────────────────────────────────
function PdfBtn({ nome, tipo }: { nome: string; tipo: string }) {
  function imprimir() {
    const prev = document.title;
    document.title = `${nome} — ${tipo}`;
    window.print();
    document.title = prev;
  }
  return (
    <button
      onClick={imprimir}
      style={{
        fontSize: 12, padding: "5px 14px", borderRadius: 8,
        border: "1px solid var(--line-2)", background: "none",
        color: "var(--dim)", cursor: "pointer", fontFamily: "inherit",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      ⬇ Exportar PDF
    </button>
  );
}

// ── Aba DISC ──────────────────────────────────────────────────────────────────
function TabDISC({ data, isAdmin, onAnaliseGerada }: { data: DiagData; isAdmin: boolean; onAnaliseGerada: (tipo: string, analise: unknown) => void }) {
  const { perfil, analises } = data;
  if (!perfil.disc) return <p style={{ color: "var(--dim)", fontSize: 14 }}>Sem dados DISC. Complete o questionário primeiro.</p>;

  const total = Object.values(perfil.disc).reduce((a, b) => a + b, 0);
  const cor = perfil.cor ?? "var(--accent)";
  const ord = (Object.entries(perfil.disc) as [DiscKey, number][]).sort((a, b) => b[1] - a[1]);
  const pri = ord[0][0]; const sec = ord[1][1] >= ord[0][1] * 0.8 ? ord[1][0] : null;
  const segmento = sec ? `${pri}${sec}` : pri;
  const segNome = sec ? `${DISC_NOME[pri]} com ${DISC_NOME[sec]}` : `${DISC_NOME[pri]}`;
  const a = analises.disc;

  return (
    <div>
      {/* Header visual */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <Radar disc={perfil.disc} cor={cor} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: cor, letterSpacing: "-1px", marginBottom: 2 }}>{segmento}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--txt)", marginBottom: 14 }}>{segNome}</div>
          {(["D", "I", "S", "C"] as DiscKey[]).map(k => (
            <Barra key={k} label={DISC_NOME[k]} value={perfil.disc![k]} max={total} cor={DISC_COR[k]} pct={(perfil.disc![k] / total) * 100} />
          ))}
        </div>
      </div>

      {/* Descrição do segmento */}
      <Card>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: DISC_COR[pri], marginBottom: 7 }}>
          Perfil {segmento}
        </div>
        <p style={{ fontSize: 15, color: "var(--txt)", lineHeight: 1.75, margin: 0 }}>{DISC_SEG[segmento] ?? DISC_SEG[pri]}</p>
      </Card>

      {/* Cartões de dimensão */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 20 }}>
        {(["D", "I", "S", "C"] as DiscKey[]).map(k => {
          const pct = total > 0 ? Math.round((perfil.disc![k] / total) * 100) : 0;
          const nivel = pct >= 35 ? "Alta" : pct >= 22 ? "Média" : "Baixa";
          const nivelCor = pct >= 35 ? DISC_COR[k] : "var(--dim)";
          return (
            <div key={k} style={{ padding: "12px 15px", borderRadius: 10, background: "var(--panel-2)", border: `1px solid color-mix(in srgb,${DISC_COR[k]} 28%,var(--line-2))` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: DISC_COR[k], lineHeight: 1 }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", flex: 1 }}>{DISC_NOME[k]}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: nivelCor, padding: "2px 8px", borderRadius: 6, background: `color-mix(in srgb,${DISC_COR[k]} 12%,transparent)` }}>
                  {nivel} · {pct}%
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.55, margin: 0 }}>{DISC_DESC[k]}</p>
            </div>
          );
        })}
      </div>

      {!a ? (
        <GerarBtn perfilId={perfil.id} tipo="disc" label="Gerar análise DISC completa" onDone={analise => onAnaliseGerada("disc", analise)} />
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
            <PdfBtn nome={perfil.nome} tipo="DISC" />
            {isAdmin && <GerarBtn perfilId={perfil.id} tipo="disc" label="Regenerar" onDone={analise => onAnaliseGerada("disc", analise)} variant="regenerar" />}
          </div>

          <Card>
            <Secao titulo="Perfil geral">
              <p style={{ fontSize: 15, color: "var(--txt)", lineHeight: 1.8 }}>{a.perfil_geral}</p>
            </Secao>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
            <Card accent="#6FBF92"><Secao titulo="Pontos fortes" cor="#6FBF92"><Lista items={a.pontos_fortes} cor="#6FBF92" /></Secao></Card>
            <Card accent="var(--warn)"><Secao titulo="Pontos de atenção" cor="var(--warn)"><Lista items={a.pontos_atencao} cor="var(--warn)" /></Secao></Card>
            <Card accent="var(--accent)"><Secao titulo="Motivadores" cor="var(--accent)"><Lista items={a.motivadores} /></Secao></Card>
            <Card><Secao titulo="Desmotivadores" cor="var(--dim)"><Lista items={a.desmotivadores} cor="var(--dim)" /></Secao></Card>
          </div>

          <Card>
            <Secao titulo="Tomada de decisão">
              <p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.tomada_decisao}</p>
            </Secao>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Secao titulo="Como ela fala">
                <p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.comunicacao.como_fala}</p>
              </Secao>
              <Secao titulo="Como falar com ela">
                <p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.comunicacao.como_falar_com}</p>
              </Secao>
            </div>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
            <Card><Secao titulo="Sob pressão"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.sob_pressao}</p></Secao></Card>
            <Card><Secao titulo="Em conflitos"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.em_conflitos}</p></Secao></Card>
            <Card><Secao titulo="Como lidera"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.lideranca.como_lidera}</p></Secao></Card>
            <Card><Secao titulo="Como prefere ser liderada"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.lideranca.como_ser_liderado}</p></Secao></Card>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
            <Card><Secao titulo="Feedback"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.feedback}</p></Secao></Card>
            <Card><Secao titulo="Trabalho em equipe"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.trabalho_equipe}</p></Secao></Card>
          </div>

          <ManualCard manual={a.manual} />
        </div>
      )}
    </div>
  );
}

// ── Aba Temperamentos ─────────────────────────────────────────────────────────
function TabTemperamento({ data, isAdmin, onAnaliseGerada }: { data: DiagData; isAdmin: boolean; onAnaliseGerada: (tipo: string, analise: unknown) => void }) {
  const { perfil, analises } = data;
  if (!perfil.temperamento) return <p style={{ color: "var(--dim)", fontSize: 14 }}>Sem dados de Temperamento. Complete o questionário primeiro.</p>;

  const dom = perfil.temperamento_dominante;
  const apo = perfil.temperamento_apoio;
  const perfDesc = dom ? `${TEMP_NOME[dom]}${apo ? ` com traços de ${TEMP_NOME[apo]}` : ""}` : "";
  const T = dom ? TEMPERAMENTOS[dom] : null;
  const a = analises.temperamento;

  return (
    <div>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          {dom && T && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, background: `color-mix(in srgb,${T.cor} 18%,transparent)`, border: `2px solid ${T.cor}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 22 }}>{dom === "sanguineo" ? "😄" : dom === "colerico" ? "⚡" : dom === "melancolico" ? "🌙" : "🌊"}</span>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: T.cor }}>{perfDesc}</div>
                <div style={{ fontSize: 13, color: "var(--mut)" }}>{T.arquetipo}</div>
              </div>
            </div>
          )}
          {(["sanguineo", "colerico", "melancolico", "fleumatico"] as TempKey[]).map(k => (
            <Barra key={k} label={TEMP_NOME[k]} value={perfil.temperamento![k]} max={100} cor={TEMPERAMENTOS[k].cor} pct={perfil.temperamento![k]} />
          ))}
        </div>
        {T && (
          <div style={{ width: 230, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 10 }}>Características naturais</div>
            <Lista items={T.luzSombra.virtudes} cor={T.cor} />
          </div>
        )}
      </div>

      {!a ? (
        <GerarBtn perfilId={perfil.id} tipo="temperamento" label="Gerar análise de Temperamento" onDone={analise => onAnaliseGerada("temperamento", analise)} />
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
            <PdfBtn nome={perfil.nome} tipo="Temperamento" />
            {isAdmin && <GerarBtn perfilId={perfil.id} tipo="temperamento" label="Regenerar" onDone={analise => onAnaliseGerada("temperamento", analise)} variant="regenerar" />}
          </div>

          <Card>
            <Secao titulo="Resumo">
              <p style={{ fontSize: 15, color: "var(--txt)", lineHeight: 1.8 }}>{a.resumo}</p>
            </Secao>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
            <Card accent="#6FBF92"><Secao titulo="Pontos fortes" cor="#6FBF92"><Lista items={a.pontos_fortes} cor="#6FBF92" /></Secao></Card>
            <Card accent="var(--warn)"><Secao titulo="Pontos de atenção" cor="var(--warn)"><Lista items={a.pontos_atencao} cor="var(--warn)" /></Secao></Card>
            <Card accent="var(--accent)"><Secao titulo="Motivadores"><Lista items={a.motivadores} /></Secao></Card>
            <Card><Secao titulo="Necessidades no trabalho"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.necessidades}</p></Secao></Card>
          </div>

          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Secao titulo="Como fala"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.comunicacao.como_fala}</p></Secao>
              <Secao titulo="Como falar com ela"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.comunicacao.como_falar_com}</p></Secao>
              <Secao titulo="Faça" cor="#6FBF92"><Lista items={a.como_conversar.faca} cor="#6FBF92" /></Secao>
              <Secao titulo="Evite" cor="var(--red)"><Lista items={a.como_conversar.evite} cor="var(--red)" /></Secao>
            </div>
          </Card>

          <Card>
            <Secao titulo="Como tende a reagir">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([
                  ["Ao receber uma cobrança", a.simulador.cobranca],
                  ["Ao receber uma crítica", a.simulador.critica],
                  ["Quando uma ideia é rejeitada", a.simulador.ideia_rejeitada],
                  ["Diante de uma meta agressiva", a.simulador.meta_agressiva],
                  ["Com uma mudança brusca", a.simulador.mudanca_brusca],
                ] as [string, string][]).map(([label, text]) => (
                  <div key={label} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--panel)", border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", marginBottom: 7 }}>{label}</div>
                    <p style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.6, margin: 0 }}>{text}</p>
                  </div>
                ))}
              </div>
            </Secao>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
            <Card><Secao titulo="Sob pressão"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.sob_pressao}</p></Secao></Card>
            <Card><Secao titulo="Em conflitos"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.conflitos}</p></Secao></Card>
          </div>

          <ManualCard manual={a.manual} />
        </div>
      )}
    </div>
  );
}

// ── Aba Arquétipos ────────────────────────────────────────────────────────────
function TabArquetipo({ data, isAdmin, onAnaliseGerada }: { data: DiagData; isAdmin: boolean; onAnaliseGerada: (tipo: string, analise: unknown) => void }) {
  const { perfil, analises } = data;
  if (!perfil.arquetipo) return <p style={{ color: "var(--dim)", fontSize: 14 }}>Sem dados de Arquétipo. Complete o questionário primeiro.</p>;

  const ord = (Object.entries(perfil.arquetipo) as [ArqKey, number][]).sort((a, b) => b[1] - a[1]);
  const top3 = ord.slice(0, 3);
  const a = analises.arquetipo;

  return (
    <div>
      {/* Top 3 badges */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {top3.map(([k, v], i) => (
          <div key={k} style={{ padding: "12px 18px", borderRadius: 13, background: `color-mix(in srgb,${ARQUETIPOS[k].cor} 14%,transparent)`, border: `1px solid color-mix(in srgb,${ARQUETIPOS[k].cor} 35%,transparent)` }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 4 }}>
              {i === 0 ? "Dominante" : i === 1 ? "Secundário" : "Complementar"}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: ARQUETIPOS[k].cor }}>{ARQ_NOME[k]}</div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{Math.round((v / 5) * 100)}%</div>
          </div>
        ))}
      </div>

      {/* Barras */}
      <Card>
        <div style={{ marginBottom: 4 }}>
          {ord.map(([k, v]) => (
            <Barra key={k} label={ARQ_NOME[k]} value={v} max={5} cor={ARQUETIPOS[k].cor} pct={(v / 5) * 100} />
          ))}
        </div>
      </Card>

      {!a ? (
        <GerarBtn perfilId={perfil.id} tipo="arquetipo" label="Gerar análise de Arquétipo" onDone={analise => onAnaliseGerada("arquetipo", analise)} />
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
            <PdfBtn nome={perfil.nome} tipo="Arquétipo" />
            {isAdmin && <GerarBtn perfilId={perfil.id} tipo="arquetipo" label="Regenerar" onDone={analise => onAnaliseGerada("arquetipo", analise)} variant="regenerar" />}
          </div>

          <Card>
            <Secao titulo="Essência">
              <p style={{ fontSize: 15, color: "var(--txt)", lineHeight: 1.8 }}>{a.essencia}</p>
            </Secao>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, marginBottom: 4 }}>
            {([
              ["Motivação central", a.motivacao],
              ["Desejo", a.desejo],
              ["Meta", a.meta],
              ["Medo", a.medo],
              ["Estratégia", a.estrategia],
              ["Dádiva", a.dadiva],
            ] as [string, string][]).map(([label, text]) => (
              <Card key={label}><Secao titulo={label}><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{text}</p></Secao></Card>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
            <Card accent="#6FBF92"><Secao titulo="Lado luz" cor="#6FBF92"><Lista items={a.luz} cor="#6FBF92" /></Secao></Card>
            <Card><Secao titulo="Lado sombra" cor="var(--warn)"><Lista items={a.sombra} cor="var(--warn)" /></Secao></Card>
          </div>

          <Card>
            <Secao titulo="Perfil profissional">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([
                  ["Liderança", a.profissional.lideranca],
                  ["Vendas", a.profissional.vendas],
                  ["Criatividade", a.profissional.criatividade],
                  ["Negociação", a.profissional.negociacao],
                  ["Equipe", a.profissional.equipe],
                ] as [string, string][]).map(([label, text]) => (
                  <div key={label} style={{ padding: "11px 14px", borderRadius: 10, background: "var(--panel)", border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", marginBottom: 6 }}>{label}</div>
                    <p style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.6, margin: 0 }}>{text}</p>
                  </div>
                ))}
              </div>
            </Secao>
          </Card>

          <Card accent="var(--accent)">
            <Secao titulo="Marca pessoal" cor="var(--accent)">
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <Secao titulo="Personalidade"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.marca_pessoal.personalidade}</p></Secao>
                  <Secao titulo="Tom de voz"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.marca_pessoal.tom_voz}</p></Secao>
                  <Secao titulo="Direção criativa"><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{a.marca_pessoal.estilo}</p></Secao>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <Secao titulo="Palavras que combinam"><Lista items={a.marca_pessoal.palavras_combinam} /></Secao>
                  <Secao titulo="Palavras a evitar" cor="var(--dim)"><Lista items={a.marca_pessoal.palavras_evitar} cor="var(--dim)" /></Secao>
                </div>
              </div>
              <Secao titulo="Paleta sugerida">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {Object.entries(a.marca_pessoal.paleta).map(([key, hex]) => (
                    <div key={key} title={`${key}: ${hex}`} style={{ textAlign: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 11, background: hex, border: "2px solid color-mix(in srgb,#fff 20%,transparent)", marginBottom: 5 }} />
                      <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "capitalize" }}>{key}</div>
                    </div>
                  ))}
                </div>
              </Secao>
            </Secao>
          </Card>

          <ManualCard manual={a.manual} />
        </div>
      )}
    </div>
  );
}

// ── Aba Visão Integrada ───────────────────────────────────────────────────────
function TabVisaoIntegrada({ data, isAdmin, onAnaliseGerada }: { data: DiagData; isAdmin: boolean; onAnaliseGerada: (tipo: string, analise: unknown) => void }) {
  const { perfil, analises } = data;
  const temTudo = perfil.disc && perfil.arquetipo_dominante && perfil.temperamento_dominante;
  if (!temTudo) {
    return (
      <div style={{ textAlign: "center", padding: "36px 0" }}>
        <p style={{ fontSize: 15, color: "var(--dim)" }}>Complete os 3 diagnósticos para gerar a Visão Integrada 360°.</p>
      </div>
    );
  }

  const a = analises.visao_integrada;
  const dom = perfil.temperamento_dominante;
  const apo = perfil.temperamento_apoio;
  const arqDom = perfil.arquetipo_dominante;
  const ord = perfil.disc ? (Object.entries(perfil.disc) as [DiscKey, number][]).sort((a, b) => b[1] - a[1]) : [];
  const dpri = ord[0]?.[0]; const dsec = ord[1] && ord[1][1] >= ord[0]?.[1] * 0.8 ? ord[1][0] : null;
  const discLabel = dsec ? `${dpri}${dsec}` : dpri;

  return (
    <div>
      {/* Badges resumo */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        {[
          { label: "DISC", value: discLabel ?? "—", cor: "#4F6BED" },
          { label: "Temperamento", value: dom ? `${TEMP_NOME[dom]}${apo ? ` / ${TEMP_NOME[apo]}` : ""}` : "—", cor: dom ? TEMPERAMENTOS[dom].cor : "var(--dim)" },
          { label: "Arquétipo", value: arqDom ? ARQ_NOME[arqDom] : "—", cor: arqDom ? ARQUETIPOS[arqDom].cor : "var(--dim)" },
        ].map(b => (
          <div key={b.label} style={{ padding: "10px 16px", borderRadius: 11, background: `color-mix(in srgb,${b.cor} 10%,transparent)`, border: `1px solid color-mix(in srgb,${b.cor} 28%,transparent)` }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 3 }}>{b.label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: b.cor }}>{b.value}</div>
          </div>
        ))}
      </div>

      {!a ? (
        <GerarBtn perfilId={perfil.id} tipo="visao_integrada" label="Gerar Síntese 360°" onDone={analise => onAnaliseGerada("visao_integrada", analise)} />
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
            <PdfBtn nome={perfil.nome} tipo="Visão Integrada 360°" />
            {isAdmin && <GerarBtn perfilId={perfil.id} tipo="visao_integrada" label="Regenerar" onDone={analise => onAnaliseGerada("visao_integrada", analise)} variant="regenerar" />}
          </div>

          <Card accent="var(--accent)">
            <Secao titulo="Quem é esta pessoa" cor="var(--accent)">
              <p style={{ fontSize: 15, color: "var(--txt)", lineHeight: 1.85, whiteSpace: "pre-line" }}>{a.quem_e}</p>
            </Secao>
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4 }}>
            {([
              ["Como pensa", a.como_pensa],
              ["Como age", a.como_age],
              ["Como decide", a.como_decide],
              ["Como se comunica", a.como_comunica],
              ["Como se relaciona", a.como_relaciona],
              ["Sob pressão", a.como_pressao],
              ["Como lidera", a.como_lidera],
            ] as [string, string][]).map(([label, text]) => (
              <Card key={label}><Secao titulo={label}><p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.7 }}>{text}</p></Secao></Card>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, marginBottom: 4 }}>
            <Card accent="#6FBF92"><Secao titulo="Principais forças" cor="#6FBF92"><Lista items={a.forcas} cor="#6FBF92" /></Secao></Card>
            <Card accent="var(--accent)"><Secao titulo="Áreas de desenvolvimento"><Lista items={a.desenvolvimento} /></Secao></Card>
            <Card accent="var(--accent)"><Secao titulo="Motivadores"><Lista items={a.motivadores} /></Secao></Card>
            <Card accent="var(--warn)"><Secao titulo="Resistências" cor="var(--warn)"><Lista items={a.resistencias} cor="var(--warn)" /></Secao></Card>
          </div>

          <Card accent="var(--accent)">
            <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--accent)", marginBottom: 16 }}>
              Manual de instruções
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {([
                ["Para obter o melhor", a.manual.para_obter_melhor],
                ["Ao falar com ela", a.manual.ao_falar],
                ["Ao cobrar", a.manual.ao_cobrar],
                ["Ao discordar", a.manual.ao_discordar],
                ["Ao apresentar uma ideia", a.manual.ao_apresentar_ideia],
                ["Quando estiver sob pressão", a.manual.sob_pressao],
                ["Ao dar feedback", a.manual.ao_dar_feedback],
                ["Para motivar", a.manual.para_motivar],
              ] as [string, string][]).map(([label, text]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--accent)", marginBottom: 5 }}>{label}</div>
                  <p style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.6, margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid color-mix(in srgb,var(--accent) 20%,transparent)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--red)", marginBottom: 5 }}>Evite com esta pessoa</div>
              <p style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.6, margin: 0 }}>{a.manual.evite}</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Manual card ───────────────────────────────────────────────────────────────
function ManualCard({ manual }: { manual: { para_obter_melhor: string; ao_cobrar: string; ao_dar_feedback: string; para_motivar: string } }) {
  return (
    <Card accent="var(--accent)">
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--accent)", marginBottom: 14 }}>
        Como trabalhar com ela
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {([
          ["Para obter o melhor", manual.para_obter_melhor],
          ["Ao cobrar resultados", manual.ao_cobrar],
          ["Ao dar feedback", manual.ao_dar_feedback],
          ["Para motivar", manual.para_motivar],
        ] as [string, string][]).map(([label, text]) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", marginBottom: 5 }}>{label}</div>
            <p style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.6, margin: 0 }}>{text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
const TABS = [
  { id: "disc",           label: "DISC",           cor: "#4F6BED" },
  { id: "temperamento",   label: "Temperamentos",  cor: "#E0BC85" },
  { id: "arquetipo",      label: "Arquétipos",     cor: "#A07644" },
  { id: "visao_integrada",label: "Visão Integrada",cor: "var(--accent)" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function DiagPerfil360({ data, isAdmin = false }: { data: DiagData; isAdmin?: boolean }) {
  const [tab, setTab] = useState<TabId>("disc");
  const [localAnalises, setLocalAnalises] = useState(data.analises);
  const router = useRouter();

  function onAnaliseGerada(tipo: string, analise: unknown) {
    setLocalAnalises(prev => ({ ...prev, [tipo]: analise }));
    router.refresh();
  }

  const merged: DiagData = { perfil: data.perfil, analises: localAnalises };

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 22, borderBottom: "1px solid var(--line-2)", flexWrap: "wrap" }}>
        {TABS.map(t => {
          const ativo = tab === t.id;
          const temDados = t.id === "disc" ? !!data.perfil.disc
            : t.id === "temperamento" ? !!data.perfil.temperamento
            : t.id === "arquetipo" ? !!data.perfil.arquetipo
            : !!(data.perfil.disc && data.perfil.temperamento_dominante && data.perfil.arquetipo_dominante);
          const temAnalise = !!localAnalises[t.id === "visao_integrada" ? "visao_integrada" : t.id as keyof typeof localAnalises];
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 17px", fontSize: 13.5, fontWeight: ativo ? 800 : 600,
                background: "none", border: "none", cursor: "pointer",
                color: ativo ? t.cor : "var(--mut)",
                borderBottom: ativo ? `2px solid ${t.cor}` : "2px solid transparent",
                marginBottom: -1, fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 7,
              }}
            >
              {t.label}
              {!temDados && <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "color-mix(in srgb,var(--dim) 15%,transparent)", color: "var(--dim)" }}>pend.</span>}
              {temDados && temAnalise && (
                <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "color-mix(in srgb,var(--green) 15%,transparent)", color: "var(--green)" }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      <div>
        {tab === "disc"            && <TabDISC           data={merged} isAdmin={isAdmin} onAnaliseGerada={onAnaliseGerada} />}
        {tab === "temperamento"    && <TabTemperamento   data={merged} isAdmin={isAdmin} onAnaliseGerada={onAnaliseGerada} />}
        {tab === "arquetipo"       && <TabArquetipo      data={merged} isAdmin={isAdmin} onAnaliseGerada={onAnaliseGerada} />}
        {tab === "visao_integrada" && <TabVisaoIntegrada data={merged} isAdmin={isAdmin} onAnaliseGerada={onAnaliseGerada} />}
      </div>
    </div>
  );
}
