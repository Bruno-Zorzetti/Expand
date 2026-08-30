import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FASES } from "@/lib/expand-esteira";
import { faseDoCliente, type EtapaRow } from "@/lib/expand-tarefas";
import { TRACK } from "@/lib/expand-gov";

export const dynamic = "force-dynamic";

const DEMANDAS = [
  { label: "Nova arte", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Revisão de copy", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { label: "Relatório", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Reunião", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
];

const SUGE = [
  "Qual é a próxima entrega prevista?",
  "Em que fase estamos e quanto falta?",
  "Quais aprovações aguardam minha resposta?",
];

export default async function EsteMes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cli }, { data: etData }, { data: perfisData }] = await Promise.all([
    supabase.from("expand_cliente_publico").select("nome, maturidade").eq("id", id).single(),
    supabase.from("expand_etapas").select("*").eq("cliente_id", id).order("ordem"),
    supabase.from("expand_perfis").select("id, nome, cargo, cor, foto_url").eq("tipo", "humano").eq("ativo", true).limit(6),
  ]);

  const etapas = (etData ?? []) as EtapaRow[];

  let faseAtual: number;
  if (etapas.length) {
    const run = etapas.filter((e) => e.status === "run").map((e) => e.fase);
    faseAtual = run.length ? Math.min(...run) : etapas.every((e) => e.status === "done") ? 15 : faseDoCliente(cli?.maturidade ?? null);
  } else {
    faseAtual = faseDoCliente(cli?.maturidade ?? null);
  }

  const faseMeta = FASES.find((f) => f.id === faseAtual);
  const faseNome = faseMeta?.nome ?? "";

  const ids = etapas.map((e) => e.id);
  let pendentes: { etapa: EtapaRow; qtd: number }[] = [];
  let producao: EtapaRow[] = [];
  const totalDone = etapas.filter((e) => e.visivel_cliente && e.status === "done").length;

  if (ids.length) {
    const { data: arqs } = await supabase.from("expand_arquivos").select("etapa_id,status").in("etapa_id", ids);
    const pend = new Map<string, number>();
    (arqs ?? []).forEach((a: { etapa_id: string; status: string }) => {
      if (a.status === "pendente") pend.set(a.etapa_id, (pend.get(a.etapa_id) ?? 0) + 1);
    });
    const vis = etapas.filter((e) => e.visivel_cliente);
    pendentes = vis.filter((e) => pend.get(e.id)).map((e) => ({ etapa: e, qtd: pend.get(e.id)! }));
    producao = vis.filter((e) => e.status === "run" && !pend.get(e.id));
  }

  const nomeCliente = String(cli?.nome ?? "").split(" ")[0];
  const equipe = perfisData ?? [];
  const mesTotalFases = 12;
  const mesAtual = Math.min(mesTotalFases, Math.ceil((faseAtual / 15) * mesTotalFases));
  const progresso = Math.round((faseAtual / 15) * 100);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          from { background-position: -200% 0; }
          to   { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
          0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb,var(--accent) 35%,transparent); }
          50%      { box-shadow: 0 0 0 6px color-mix(in srgb,var(--accent) 0%,transparent); }
        }
        @keyframes badge-pop {
          0%   { transform: scale(0.7); opacity: 0; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .portal-card {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
          animation: fadeUp .35s ease both;
          transition: border-color .2s, box-shadow .2s;
        }
        .portal-card:hover {
          border-color: color-mix(in srgb, var(--accent) 28%, var(--line));
          box-shadow: 0 4px 24px color-mix(in srgb, var(--accent) 7%, transparent);
        }
        .portal-pend-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 11px;
          background: color-mix(in srgb, var(--accent) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
          text-decoration: none;
          color: inherit;
          transition: background .15s, transform .15s;
        }
        .portal-pend-row:hover {
          background: color-mix(in srgb, var(--accent) 14%, transparent);
          transform: translateX(3px);
        }
        .portal-track-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 70px;
          cursor: pointer;
          transition: transform .15s;
        }
        .portal-track-node:hover { transform: translateY(-3px); }
        .portal-team-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 11px;
          border: 1px solid var(--line);
          background: var(--panel-2);
          transition: border-color .15s, transform .15s;
        }
        .portal-team-row:hover {
          border-color: color-mix(in srgb, var(--accent) 30%, var(--line));
          transform: translateX(3px);
        }
        .portal-conversar-btn {
          margin-left: auto;
          font-size: 11px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 20px;
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
          color: var(--accent);
          text-decoration: none;
          flex-shrink: 0;
          transition: background .15s;
        }
        .portal-conversar-btn:hover {
          background: color-mix(in srgb, var(--accent) 22%, transparent);
        }
        .portal-demanda-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          padding: 14px 10px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: var(--panel-2);
          flex: 1;
          cursor: default;
          opacity: .75;
          transition: background .15s, transform .15s, opacity .15s;
        }
        .portal-demanda-btn:hover {
          background: color-mix(in srgb, var(--accent) 8%, var(--panel-2));
          border-color: color-mix(in srgb, var(--accent) 25%, var(--line));
          transform: translateY(-3px);
          opacity: 1;
        }
        .portal-status-bar-inner {
          background: linear-gradient(90deg, var(--green), var(--accent), var(--green));
          background-size: 200% 100%;
          animation: shimmer 2.5s linear infinite;
        }
        .portal-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 900;
          background: var(--accent);
          color: #0E1F18;
          animation: badge-pop .3s ease both;
          flex-shrink: 0;
        }
        .hero-bar-inner {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, var(--green) 0%, var(--accent) 100%);
          transition: width .6s cubic-bezier(.22,1,.36,1);
        }
        .portal-suge-chip {
          font-size: 12px;
          padding: 7px 14px;
          border-radius: 20px;
          background: var(--panel-2);
          border: 1px solid var(--line);
          color: var(--mut);
          cursor: default;
          transition: border-color .15s, color .15s;
        }
        .portal-suge-chip:hover {
          border-color: var(--accent);
          color: var(--txt);
        }
      `}</style>

      <div style={{ padding: "28px 28px 56px", maxWidth: 1140, margin: "0 auto" }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: 24, animation: "fadeUp .3s ease both" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--txt)", letterSpacing: "-.02em", margin: 0 }}>
            Olá, {nomeCliente} 👋
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--mut)", margin: "4px 0 0" }}>
            Aqui está tudo sobre o seu projeto hoje.
          </p>
        </div>

        {/* ── Hero ── */}
        <div style={{
          background: "linear-gradient(135deg, #0A1A13 0%, #112219 55%, color-mix(in srgb, var(--accent) 16%, #0A1A13) 100%)",
          border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
          borderRadius: 20,
          marginBottom: 22,
          position: "relative",
          overflow: "hidden",
          animation: "fadeUp .3s ease both",
        }}>
          {/* decorative circles */}
          <div style={{ position: "absolute", right: -80, top: -80, width: 300, height: 300, borderRadius: "50%", border: "70px solid color-mix(in srgb, var(--accent) 7%, transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 60, bottom: -100, width: 220, height: 220, borderRadius: "50%", background: "color-mix(in srgb, var(--green) 6%, transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: -30, bottom: -40, width: 150, height: 150, borderRadius: "50%", border: "40px solid color-mix(in srgb, var(--green) 5%, transparent)", pointerEvents: "none" }} />

          <div style={{ padding: "32px 36px", position: "relative" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center" }}>

              {/* left: badges + title + bar */}
              <div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 12, fontWeight: 800,
                    background: "color-mix(in srgb, var(--accent) 18%, transparent)",
                    color: "var(--accent)", padding: "5px 14px", borderRadius: 99,
                    border: "1px solid color-mix(in srgb, var(--accent) 32%, transparent)",
                    animation: "pulse-ring 2.5s ease-in-out infinite",
                  }}>
                    Mês {mesAtual} de {mesTotalFases}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 800,
                    background: "color-mix(in srgb, var(--green) 18%, transparent)",
                    color: "var(--green)", padding: "5px 14px", borderRadius: 99,
                    border: "1px solid color-mix(in srgb, var(--green) 32%, transparent)",
                  }}>
                    Fase {faseAtual} de 15
                  </span>
                </div>

                <div style={{ fontFamily: "var(--font-cinzel, serif)", fontSize: 30, fontWeight: 700, color: "#fff", lineHeight: 1.15, marginBottom: 8 }}>
                  {faseNome}
                </div>
                {faseMeta?.obj && (
                  <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.5)", marginBottom: 22, maxWidth: 460, lineHeight: 1.6 }}>
                    {faseMeta.obj}
                  </p>
                )}

                {/* progress */}
                <div style={{ maxWidth: 380 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                    <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>Progresso geral</span>
                    <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{progresso}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                    <div className="hero-bar-inner" style={{ width: `${progresso}%` }} />
                  </div>
                </div>
              </div>

              {/* right: KPIs + action */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-end" }}>
                <div style={{
                  textAlign: "center",
                  padding: "18px 28px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.08)",
                  backdropFilter: "blur(8px)",
                }}>
                  <div style={{ fontSize: 44, fontWeight: 900, color: "var(--green)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{totalDone}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 4 }}>entregas<br />concluídas</div>
                </div>
                {pendentes.length > 0 && (
                  <Link href={`/portal/${id}/aprovacoes`} style={{
                    display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px",
                    background: "var(--accent)", color: "#0E1F18", borderRadius: 11,
                    fontSize: 12.5, fontWeight: 800, textDecoration: "none",
                    boxShadow: "0 4px 16px color-mix(in srgb, var(--accent) 40%, transparent)",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    Aprovar {pendentes.length} {pendentes.length > 1 ? "itens" : "item"}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main grid: 3fr 2fr ── */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 18, alignItems: "start" }}>

          {/* ══ LEFT column ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Jornada do projeto — track nodes */}
            <div className="portal-card" style={{ animationDelay: ".05s" }}>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)" }}>Jornada do Projeto</div>
                  <div style={{ fontSize: 11.5, color: "var(--mut)" }}>Fase {faseAtual} / 15</div>
                </div>
                {/* nodes + connector */}
                <div style={{ position: "relative" }}>
                  {/* connector line */}
                  <div style={{
                    position: "absolute", top: 18, left: "calc(10% + 14px)", right: "calc(10% + 14px)",
                    height: 3, background: "var(--line)", borderRadius: 99, zIndex: 0,
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      background: "linear-gradient(90deg, var(--green), var(--accent))",
                      width: `${Math.min(100, ((faseAtual - 1) / 14) * 100)}%`,
                      transition: "width .6s cubic-bezier(.22,1,.36,1)",
                    }} />
                  </div>

                  <div style={{ display: "flex", gap: 0, position: "relative", zIndex: 1 }}>
                    {TRACK.map((s, i) => {
                      const de = i ? TRACK[i - 1].ate : 0;
                      const done = faseAtual > s.ate;
                      const now = !done && faseAtual > de;
                      return (
                        <Link key={s.l} href={`/portal/${id}/historico?e=${i + 1}`} className="portal-track-node" style={{ textDecoration: "none" }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: done ? "var(--green)" : now ? "var(--accent)" : "var(--panel-2)",
                            border: `3px solid ${done ? "var(--green)" : now ? "var(--accent)" : "var(--line)"}`,
                            display: "grid", placeItems: "center",
                            fontSize: done ? 14 : 12,
                            color: done || now ? "#0E1F18" : "var(--dim)",
                            fontWeight: 900,
                            boxShadow: now ? "0 0 0 5px color-mix(in srgb, var(--accent) 20%, transparent)" : "none",
                            transition: "all .2s",
                          }}>
                            {done ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            ) : i + 1}
                          </div>
                          <div style={{
                            fontSize: 10, fontWeight: now ? 800 : 600, textAlign: "center",
                            color: done ? "var(--green)" : now ? "var(--accent)" : "var(--mut)",
                            lineHeight: 1.3, maxWidth: 72,
                          }}>
                            {s.l}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Status dos projetos */}
            {producao.length > 0 && (
              <div className="portal-card" style={{ animationDelay: ".10s" }}>
                <div style={{ padding: "20px 22px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 16 }}>Em Produção</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {producao.slice(0, 5).map((e) => {
                      const pct = e.status === "done" ? 100 : e.status === "run" ? 60 : 0;
                      return (
                        <div key={e.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--txt)" }}>{e.titulo}</span>
                            </div>
                            <span style={{ fontSize: 11, color: "var(--mut)", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
                            <div className="portal-status-bar-inner" style={{ height: "100%", width: `${pct}%`, borderRadius: 99 }} />
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 4 }}>
                            {e.responsavel_atual ?? e.responsavel ?? "Equipe Expand"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Fase atual */}
            <div className="portal-card" style={{ animationDelay: ".15s" }}>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 14 }}>Fase Atual</div>
                <div style={{ fontFamily: "var(--font-cinzel, serif)", fontWeight: 700, fontSize: 17, color: "var(--txt)", marginBottom: 6 }}>
                  Fase {faseAtual} — {faseNome}
                </div>
                {faseMeta?.janela && (
                  <div style={{ fontSize: 11.5, color: "var(--mut)", marginBottom: 10 }}>Janela: {faseMeta.janela}</div>
                )}
                {faseMeta?.obj && (
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--txt)", marginBottom: 14 }}>{faseMeta.obj}</p>
                )}
                {faseMeta?.tasks && faseMeta.tasks.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 10 }}>Entregas desta fase</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {faseMeta.tasks.slice(0, 6).map((t, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13 }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "color-mix(in srgb, var(--green) 15%, transparent)", border: "1.5px solid var(--green)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          </div>
                          <span style={{ color: "var(--mut)", lineHeight: 1.5 }}>{t.t}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Solicitar demanda */}
            <div className="portal-card" style={{ animationDelay: ".20s" }}>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)" }}>Solicitar Demanda</div>
                  <Link href={`/portal/${id}/solicitacoes`} style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>Ver todas</Link>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {DEMANDAS.map((d) => (
                    <Link key={d.label} href={`/portal/${id}/solicitacoes`} className="portal-demanda-btn" style={{ textDecoration: "none" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "color-mix(in srgb, var(--accent) 12%, transparent)", display: "grid", placeItems: "center" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d={d.icon} />
                        </svg>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mut)", textAlign: "center", lineHeight: 1.3 }}>{d.label}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ══ RIGHT column ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Precisamos de você */}
            <div className="portal-card" style={{ animationDelay: ".07s" }}>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", flex: 1 }}>Precisamos de Você</div>
                  {pendentes.length > 0 && (
                    <span className="portal-badge">{pendentes.length}</span>
                  )}
                </div>
                {pendentes.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {pendentes.map(({ etapa, qtd }) => (
                      <Link key={etapa.id} href={`/portal/${id}/aprovacoes`} className="portal-pend-row">
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: "color-mix(in srgb, var(--accent) 18%, transparent)", display: "grid", placeItems: "center", color: "var(--accent)", flexShrink: 0 }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{etapa.titulo}</div>
                          <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 1 }}>{qtd} {qtd > 1 ? "arquivos" : "arquivo"} aguardando</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" /></svg>
                      </Link>
                    ))}
                  </div>
                ) : producao.length > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 22%, transparent)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: "var(--green)", fontWeight: 600 }}>Tudo em ordem — estamos produzindo para você</span>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "18px 0", color: "var(--mut)", fontSize: 13 }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
                    Tudo em dia!
                  </div>
                )}
              </div>
            </div>

            {/* Sua equipe */}
            {equipe.length > 0 && (
              <div className="portal-card" style={{ animationDelay: ".12s" }}>
                <div style={{ padding: "20px 22px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 14 }}>Sua Equipe</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {equipe.map((p) => {
                      const cor = (p.cor as string | null) ?? "var(--accent)";
                      const ini = String(p.nome ?? "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
                      return (
                        <div key={p.id} className="portal-team-row">
                          {p.foto_url ? (
                            <img src={p.foto_url as string} alt={p.nome as string} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${cor}` }} />
                          ) : (
                            <div style={{ width: 38, height: 38, borderRadius: "50%", background: `color-mix(in srgb, ${cor} 18%, var(--panel))`, border: `2px solid ${cor}`, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, color: cor, flexShrink: 0 }}>
                              {ini}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</div>
                            <div style={{ fontSize: 10.5, color: "var(--mut)" }}>{p.cargo}</div>
                          </div>
                          <Link href={`/portal/${id}/solicitacoes`} className="portal-conversar-btn">
                            Conversar
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Última reunião */}
            <div className="portal-card" style={{ animationDelay: ".17s" }}>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 14 }}>Última Reunião</div>
                <div style={{
                  borderRadius: 11,
                  background: "var(--panel-2)",
                  border: "1px solid var(--line)",
                  overflow: "hidden",
                }}>
                  {/* placeholder - when real data is added, replace */}
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: "color-mix(in srgb, var(--accent) 12%, transparent)", display: "grid", placeItems: "center", color: "var(--accent)", flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--txt)" }}>Reunião de alinhamento</div>
                        <div style={{ fontSize: 10.5, color: "var(--mut)" }}>Aguardando registro da próxima sessão</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--dim)", fontStyle: "italic", lineHeight: 1.5 }}>
                      O resumo e o vídeo da reunião aparecerão aqui após o registro.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* IA do Projeto */}
            <div className="portal-card" style={{ animationDelay: ".22s" }}>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "color-mix(in srgb, var(--accent) 14%, var(--panel-2))", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--txt)" }}>IA do Projeto</div>
                    <div style={{ fontSize: 10.5, color: "var(--mut)" }}>Pergunte sobre seu projeto</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
                  {SUGE.map((s) => (
                    <button key={s} className="portal-suge-chip" style={{ textAlign: "left", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 9, padding: "9px 13px", width: "100%", cursor: "default" }}>
                      {s}
                    </button>
                  ))}
                </div>

                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 15px",
                  borderRadius: 10, background: "var(--panel-2)", border: "1px dashed var(--line)",
                  color: "var(--dim)", fontSize: 12,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                  <span>Assistente de IA chegando em breve.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
