"use client";

import { useRef, useState, useTransition } from "react";
import { TEMPERAMENTOS, ORDEM_TEMP, type TempKey } from "@/lib/expand-temperamento";
import { ARQUETIPOS, type ArqKey } from "@/lib/expand-arquetipo";

type Diag = {
  id: string;
  pessoa_nome: string;
  pessoa_papel: string | null;
  tipo: string;
  scores: Record<string, number>;
  dominante: string | null;
  apoio: string | null;
  rotulo: string | null;
  segundos: number | null;
  criado_em: string;
};

const Sec = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", fontWeight: 700, marginBottom: 5 }}>{t}</div>
    <div style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.6 }}>{children}</div>
  </div>
);

const tempo = (s: number | null) => {
  if (s == null) return "";
  return s < 90 ? `${s}s` : `${Math.round(s / 60)} min`;
};

function CardTemperamento({ d }: { d: Diag }) {
  const dom = TEMPERAMENTOS[(d.dominante ?? "sanguineo") as TempKey];
  const apo = d.apoio ? TEMPERAMENTOS[d.apoio as TempKey] : null;
  const rapido = (d.segundos ?? 999) < 60;
  return (
    <div className="hx-glass" style={{ borderRadius: 16, padding: "20px 22px", marginBottom: 16, borderLeft: `4px solid ${dom.cor}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${dom.cor} 18%, transparent)`, color: dom.cor, fontSize: 24, flexShrink: 0 }}>◈</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{d.rotulo} <span style={{ fontSize: 13, fontWeight: 600, color: dom.cor }}>· {dom.arquetipo}</span></div>
          <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{d.pessoa_nome}{d.pessoa_papel ? ` · ${d.pessoa_papel}` : ""} · {new Date(d.criado_em).toLocaleDateString("pt-BR")}{d.segundos ? ` · respondeu em ${tempo(d.segundos)}` : ""}</div>
        </div>
        {rapido ? <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--warn) 16%, transparent)", color: "var(--warn)" }}>respondido muito rápido</span> : null}
      </div>

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
}

function CardArquetipo({ d }: { d: Diag }) {
  const dom = ARQUETIPOS[(d.dominante ?? "heroi") as ArqKey];
  const apo = d.apoio ? ARQUETIPOS[d.apoio as ArqKey] : null;
  const scores = d.scores as Record<ArqKey, number>;
  const ord = (Object.entries(scores) as [ArqKey, number][]).sort((a, b) => b[1] - a[1]);
  const top5 = ord.slice(0, 5);
  return (
    <div className="hx-glass" style={{ borderRadius: 16, padding: "20px 22px", marginBottom: 16, borderLeft: `4px solid ${dom.cor}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${dom.cor} 18%, transparent)`, color: dom.cor, fontSize: 22, flexShrink: 0 }}>◆</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{d.rotulo}</div>
          <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{d.pessoa_nome}{d.pessoa_papel ? ` · ${d.pessoa_papel}` : ""} · {new Date(d.criado_em).toLocaleDateString("pt-BR")}{d.segundos ? ` · respondeu em ${tempo(d.segundos)}` : ""}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
        {top5.map(([k, v]) => {
          const a = ARQUETIPOS[k];
          const pct = Math.round((v / 5) * 100);
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 110, fontSize: 12, color: k === d.dominante ? "var(--txt)" : "var(--mut)", fontWeight: k === d.dominante ? 700 : 400 }}>{a.nome}</span>
              <div style={{ flex: 1, height: 9, borderRadius: 5, background: "var(--panel-2)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: a.cor, opacity: k === d.dominante ? 1 : 0.55, borderRadius: 5 }} />
              </div>
              <span style={{ width: 34, textAlign: "right", fontSize: 12, color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>{v.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 14, color: "var(--txt)", lineHeight: 1.6, marginBottom: 18 }}>{dom.desc}{apo ? ` Com traços de ${apo.nome.toLowerCase()}: ${apo.desc.toLowerCase()}` : ""}</p>

      <div style={{ background: "var(--panel-2)", borderRadius: 10, padding: "13px 15px" }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", fontWeight: 700, marginBottom: 7 }}>Como trabalhar com esta marca</div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--mut)", lineHeight: 1.7 }}>{dom.comoLidar}{apo ? ` Puxa também o lado ${apo.nome}: ${apo.comoLidar.split(".")[0].toLowerCase()}.` : ""}</p>
      </div>
    </div>
  );
}

function TabPerfil({ temps, marcas, clienteId, solicitarHumberto }: { temps: Diag[]; marcas: Diag[]; clienteId: string; solicitarHumberto: (fd: FormData) => Promise<void> }) {
  const [enviado, setEnviado] = useState(false);
  const [pending, startTransition] = useTransition();
  const printRef = useRef<HTMLDivElement>(null);

  const allHabilidades = Array.from(new Set(
    temps.flatMap(d => {
      const dom = TEMPERAMENTOS[(d.dominante ?? "sanguineo") as TempKey];
      return dom.habilidades;
    })
  ));

  const allVirtudes = Array.from(new Set(
    temps.flatMap(d => {
      const dom = TEMPERAMENTOS[(d.dominante ?? "sanguineo") as TempKey];
      return dom.luzSombra.virtudes;
    })
  ));

  const allSombras = Array.from(new Set(
    temps.flatMap(d => {
      const dom = TEMPERAMENTOS[(d.dominante ?? "sanguineo") as TempKey];
      return dom.luzSombra.sombras;
    })
  ));

  const primeiraMarca = marcas[0];
  const marcaDom = primeiraMarca ? ARQUETIPOS[(primeiraMarca.dominante ?? "heroi") as ArqKey] : null;

  const allPessoas = [
    ...temps.map(d => ({
      nome: d.pessoa_nome, papel: d.pessoa_papel, tipo: "Temperamento",
      perfil: `${d.rotulo ?? ""}${d.dominante ? ` · ${TEMPERAMENTOS[d.dominante as TempKey]?.arquetipo ?? ""}` : ""}`,
      cor: TEMPERAMENTOS[(d.dominante ?? "sanguineo") as TempKey]?.cor ?? "#888",
    })),
    ...marcas.map(d => ({
      nome: d.pessoa_nome, papel: d.pessoa_papel, tipo: "Marca",
      perfil: d.rotulo ?? "",
      cor: ARQUETIPOS[(d.dominante ?? "heroi") as ArqKey]?.cor ?? "#888",
    })),
  ];

  const handlePrint = () => window.print();

  const handle1x1 = (fd: FormData) => {
    startTransition(async () => {
      await solicitarHumberto(fd);
      setEnviado(true);
    });
  };

  return (
    <div ref={printRef}>
      {/* Cabeçalho do perfil */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div className="eb" style={{ marginBottom: 8 }}>Perfil identificado</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>O que sabemos sobre quem toca este projeto</h2>
        <p style={{ fontSize: 14, color: "var(--mut)", maxWidth: 560, margin: "0 auto" }}>Síntese de todos os diagnósticos preenchidos. Quanto mais pessoas da empresa participam, mais precisa fica a leitura.</p>
      </div>

      {/* Cards de pessoas */}
      {allPessoas.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginBottom: 24 }}>
          {allPessoas.map((p, i) => (
            <div key={i} className="hx-glass" style={{ borderRadius: 14, padding: "16px 18px", borderTop: `3px solid ${p.cor}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{p.nome}</div>
                  {p.papel && <div style={{ fontSize: 12, color: "var(--mut)" }}>{p.papel}</div>}
                </div>
                <span className="ex-pill" style={{ background: "var(--panel-2)", color: "var(--dim)", fontSize: 10 }}>{p.tipo}</span>
              </div>
              <div style={{ fontSize: 13, color: p.cor, fontWeight: 600 }}>{p.perfil}</div>
            </div>
          ))}
        </div>
      )}

      {/* Habilidades naturais */}
      {allHabilidades.length > 0 && (
        <div className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", fontWeight: 700, marginBottom: 12 }}>Habilidades naturais identificadas</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {allHabilidades.map(h => (
              <span key={h} className="ex-pill" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", fontSize: 12, padding: "5px 12px" }}>{h}</span>
            ))}
          </div>
        </div>
      )}

      {/* Virtudes e pontos cegos */}
      {(allVirtudes.length > 0 || allSombras.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginBottom: 16 }}>
          {allVirtudes.length > 0 && (
            <div className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--green)", fontWeight: 700, marginBottom: 12 }}>Virtudes do time</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {allVirtudes.map(v => (
                  <span key={v} className="ex-pill" style={{ background: "color-mix(in srgb, var(--green) 10%, transparent)", color: "var(--green)", fontSize: 12, padding: "4px 10px" }}>{v}</span>
                ))}
              </div>
            </div>
          )}
          {allSombras.length > 0 && (
            <div className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--warn)", fontWeight: 700, marginBottom: 12 }}>Pontos de atenção</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {allSombras.map(s => (
                  <span key={s} className="ex-pill" style={{ background: "color-mix(in srgb, var(--warn) 10%, transparent)", color: "var(--warn)", fontSize: 12, padding: "4px 10px" }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Arquétipo de marca */}
      {marcaDom && primeiraMarca && (
        <div className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px", marginBottom: 16, borderLeft: `4px solid ${marcaDom.cor}` }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", fontWeight: 700, marginBottom: 8 }}>Arquétipo de Marca</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: marcaDom.cor, marginBottom: 6 }}>{primeiraMarca.rotulo}</div>
          <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.6, margin: 0 }}>{marcaDom.desc}</p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
        <button onClick={handlePrint} className="hx-btn" style={{ gap: 8 }}>
          ⬇ Baixar PDF
        </button>
        {!enviado ? (
          <form action={handle1x1}>
            <input type="hidden" name="clienteId" value={clienteId} />
            <input type="hidden" name="nome" value={allPessoas[0]?.nome ?? ""} />
            <button type="submit" disabled={pending} className="hx-btn hx-btn-primary" style={{ gap: 8 }}>
              {pending ? "Enviando..." : "Solicitar 1x1 com Humberto"}
            </button>
          </form>
        ) : (
          <span className="ex-pill" style={{ padding: "10px 16px", background: "color-mix(in srgb, var(--green) 14%, transparent)", color: "var(--green)", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
            Solicitação enviada! Entraremos em contato.
          </span>
        )}
      </div>
      <p className="no-print" style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 10 }}>O 1x1 é uma conversa de 30 minutos com Humberto, especialista em pessoas, para interpretar seu perfil e aplicar os insights no dia a dia.</p>
    </div>
  );
}

export default function DiagnosticosClient({
  diags, clienteId, solicitarHumberto,
}: {
  diags: Diag[];
  clienteId: string;
  solicitarHumberto: (fd: FormData) => Promise<void>;
}) {
  const temps = diags.filter(d => d.tipo === "temperamento");
  const marcas = diags.filter(d => d.tipo === "arquetipo_marca");

  const tabs: { id: string; label: string; count?: number }[] = [
    ...(temps.length > 0 ? [{ id: "temperamento", label: "Temperamento", count: temps.length }] : []),
    ...(marcas.length > 0 ? [{ id: "arquetipo_marca", label: "Arquétipo de Marca", count: marcas.length }] : []),
    { id: "perfil", label: "Perfil" },
  ];

  const [tab, setTab] = useState(tabs[0]?.id ?? "perfil");

  return (
    <>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 13, cursor: "pointer",
              fontFamily: "inherit", fontWeight: tab === t.id ? 700 : 500,
              border: "none",
              background: tab === t.id ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "var(--panel-2)",
              color: tab === t.id ? "#fff" : "var(--mut)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            {t.label}
            {t.count && t.count > 1 ? <span style={{ background: "rgba(255,255,255,.2)", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{t.count}</span> : null}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "temperamento" && (
        <div>
          {temps.length === 0 ? (
            <p style={{ color: "var(--mut)", fontSize: 14 }}>Nenhum diagnóstico de temperamento preenchido ainda.</p>
          ) : (
            temps.map(d => <CardTemperamento key={d.id} d={d} />)
          )}
        </div>
      )}

      {tab === "arquetipo_marca" && (
        <div>
          {marcas.length === 0 ? (
            <p style={{ color: "var(--mut)", fontSize: 14 }}>Diagnóstico de Arquétipo de Marca não preenchido ainda.</p>
          ) : (
            marcas.map(d => <CardArquetipo key={d.id} d={d} />)
          )}
        </div>
      )}

      {tab === "perfil" && (
        <TabPerfil temps={temps} marcas={marcas} clienteId={clienteId} solicitarHumberto={solicitarHumberto} />
      )}
    </>
  );
}
