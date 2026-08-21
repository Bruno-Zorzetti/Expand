import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FASES } from "@/lib/expand-esteira";
import { faseDoCliente, type EtapaRow } from "@/lib/expand-tarefas";
import { TRACK } from "@/lib/expand-gov";

export const dynamic = "force-dynamic";

function Bar({ pct, color = "var(--accent)" }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 6, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, borderRadius: 99, background: color, transition: "width .4s" }} />
    </div>
  );
}

const SUGE = [
  "Qual é a próxima entrega prevista para mim?",
  "Em que fase estamos e quanto falta?",
  "Como posso acelerar o andamento do projeto?",
  "Quais aprovações estão aguardando minha resposta?",
];

export default async function EsteMes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cli }, { data: etData }, { data: perfisData }] = await Promise.all([
    supabase.from("expand_cliente_publico").select("nome, maturidade").eq("id", id).single(),
    supabase.from("expand_etapas").select("*").eq("cliente_id", id).order("ordem"),
    supabase.from("expand_perfis").select("id, nome, cargo, cor, foto_url").eq("tipo", "humano").eq("ativo", true).limit(8),
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

  const card: React.CSSProperties = {
    background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden",
  };

  const sec: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dim)", marginBottom: 10,
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--txt)", letterSpacing: "-.01em" }}>
          Olá, {nomeCliente} 👋
        </div>
        <div style={{ fontSize: 13.5, color: "var(--mut)", marginTop: 4 }}>
          Acompanhe abaixo o que está acontecendo no seu projeto hoje.
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ ...card, background: "linear-gradient(135deg, #0E1F18 0%, #142B20 60%, color-mix(in srgb, var(--accent) 14%, #0E1F18) 100%)", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        {/* decorative ring */}
        <div style={{ position: "absolute", right: -60, top: -60, width: 280, height: 280, borderRadius: "50%", border: "60px solid color-mix(in srgb, var(--accent) 8%, transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 40, bottom: -80, width: 200, height: 200, borderRadius: "50%", background: "color-mix(in srgb, var(--green) 7%, transparent)", pointerEvents: "none" }} />
        <div style={{ padding: "28px 30px", position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--accent)", padding: "4px 12px", borderRadius: 99, border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
                  Mês {mesAtual} de {mesTotalFases}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, background: "color-mix(in srgb, var(--green) 20%, transparent)", color: "var(--green)", padding: "4px 12px", borderRadius: 99, border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)" }}>
                  Fase {faseAtual} de 15
                </span>
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 8 }}>
                {faseNome}
              </div>
              {faseMeta?.obj && (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", marginBottom: 20, maxWidth: 440 }}>
                  {faseMeta.obj}
                </div>
              )}
              <div style={{ maxWidth: 320 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em" }}>Progresso geral</span>
                  <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{progresso}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progresso}%`, borderRadius: 99, background: "linear-gradient(90deg, var(--green), var(--accent))", transition: "width .4s" }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
              {pendentes.length > 0 && (
                <Link href={`/portal/${id}/aprovacoes`} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "var(--accent)", color: "#0E1F18", borderRadius: 10, fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  Aprovar {pendentes.length} {pendentes.length > 1 ? "itens" : "item"}
                </Link>
              )}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: "var(--green)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{totalDone}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", marginTop: 2 }}>entregas concluídas</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-col: Fase atual | Precisamos de você ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

        {/* Fase atual */}
        <div style={card}>
          <div style={{ padding: "18px 20px" }}>
            <div style={sec}>Fase atual</div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
              Fase {faseAtual} — {faseNome}
            </div>
            {faseMeta?.janela && (
              <div style={{ fontSize: 11.5, color: "var(--mut)", marginBottom: 14 }}>Janela: {faseMeta.janela}</div>
            )}
            {faseMeta?.obj && (
              <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--txt)", marginBottom: 14 }}>{faseMeta.obj}</div>
            )}
            {faseMeta?.tasks && faseMeta.tasks.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 8 }}>Tarefas desta fase</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {faseMeta.tasks.slice(0, 5).map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
                      <span style={{ color: "var(--mut)", lineHeight: 1.4 }}>{t.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Precisamos de você */}
        <div style={card}>
          <div style={{ padding: "18px 20px" }}>
            <div style={sec}>Precisamos de você</div>
            {pendentes.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pendentes.map(({ etapa, qtd }) => (
                  <Link key={etapa.id} href={`/portal/${id}/aprovacoes`} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
                    background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
                    textDecoration: "none", color: "inherit",
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: "color-mix(in srgb, var(--accent) 20%, transparent)", display: "grid", placeItems: "center", color: "var(--accent)", flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{etapa.titulo}</div>
                      <div style={{ fontSize: 11, color: "var(--mut)" }}>{qtd} {qtd > 1 ? "arquivos" : "arquivo"} aguardando aprovação</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" /></svg>
                  </Link>
                ))}
              </div>
            ) : producao.length > 0 ? (
              <div>
                <div style={{ fontSize: 13, color: "var(--mut)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0, display: "inline-block" }} />
                  Nada pendente com você — estamos produzindo
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {producao.slice(0, 3).map((e) => (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12.5, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.titulo}</div>
                      <div style={{ fontSize: 10.5, color: "var(--mut)", flexShrink: 0 }}>{e.responsavel_atual ?? e.responsavel}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--mut)", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                Tudo em dia por aqui!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Roadmap TRACK ── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ padding: "18px 20px" }}>
          <div style={sec}>Jornada do Projeto</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {TRACK.map((s, i) => {
              const de = i ? TRACK[i - 1].ate : 0;
              const done = faseAtual > s.ate;
              const now = !done && faseAtual > de;
              return (
                <Link key={s.l} href={`/portal/${id}/historico?e=${i + 1}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{
                    padding: "12px 10px", borderRadius: 10, textAlign: "center",
                    background: done ? "color-mix(in srgb, var(--green) 12%, transparent)" : now ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--panel-2)",
                    border: `1px solid ${done ? "color-mix(in srgb, var(--green) 25%, transparent)" : now ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--line)"}`,
                    transition: "all .15s",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", margin: "0 auto 6px",
                      background: done ? "var(--green)" : now ? "var(--accent)" : "var(--panel)",
                      display: "grid", placeItems: "center", fontSize: done ? 13 : 11,
                      color: done || now ? "#0E1F18" : "var(--mut)", fontWeight: 800, border: `2px solid ${done ? "var(--green)" : now ? "var(--accent)" : "var(--line)"}`,
                    }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: now ? 700 : 500, color: done ? "var(--green)" : now ? "var(--accent)" : "var(--mut)", lineHeight: 1.3 }}>
                      {s.l}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Status dos projetos (etapas em andamento) ── */}
      {producao.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ padding: "18px 20px" }}>
            <div style={sec}>Status dos Projetos</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {producao.slice(0, 6).map((e) => {
                const pct = e.status === "done" ? 100 : e.status === "run" ? 50 : 0;
                return (
                  <div key={e.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--txt)" }}>{e.titulo}</span>
                      <span style={{ fontSize: 11, color: "var(--mut)", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                    </div>
                    <Bar pct={pct} color={pct === 100 ? "var(--green)" : "var(--accent)"} />
                    <div style={{ fontSize: 10.5, color: "var(--mut)", marginTop: 3 }}>{e.responsavel_atual ?? e.responsavel ?? "Equipe Expand"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Equipe ── */}
      {equipe.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ padding: "18px 20px" }}>
            <div style={sec}>Sua Equipe</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {equipe.map((p) => {
                const cor = (p.cor as string | null) ?? "var(--accent)";
                const ini = String(p.nome ?? "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
                return (
                  <div key={p.id} style={{ padding: "14px 12px", borderRadius: 11, background: "var(--panel-2)", border: "1px solid var(--line)", textAlign: "center" }}>
                    {p.foto_url ? (
                      <img src={p.foto_url as string} alt={p.nome as string} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", margin: "0 auto 8px", display: "block", border: `2px solid ${cor}` }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: `color-mix(in srgb, ${cor} 20%, var(--panel))`, border: `2px solid ${cor}`, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800, color: cor, margin: "0 auto 8px" }}>
                        {ini}
                      </div>
                    )}
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--txt)", marginBottom: 2 }}>{p.nome}</div>
                    <div style={{ fontSize: 10.5, color: "var(--mut)" }}>{p.cargo}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── IA do Projeto ── */}
      <div style={card}>
        <div style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "color-mix(in srgb, var(--accent) 15%, var(--panel-2))", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0110 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2m0 4v8m4-4H8" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--txt)" }}>IA do Projeto</div>
              <div style={{ fontSize: 11, color: "var(--mut)" }}>Pergunte sobre o andamento do seu projeto</div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {SUGE.map((s) => (
              <Link key={s} href={`/portal/${id}/teo?q=${encodeURIComponent(s)}`} style={{
                fontSize: 12, padding: "7px 13px", borderRadius: 20,
                background: "var(--panel-2)", border: "1px solid var(--line)",
                color: "var(--mut)", textDecoration: "none", transition: "all .15s",
              }}>
                {s}
              </Link>
            ))}
          </div>
          <Link href={`/portal/${id}/teo`} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
            borderRadius: 10, background: "var(--panel-2)", border: "1px solid var(--line)",
            textDecoration: "none", color: "var(--mut)", fontSize: 13,
          }}>
            <span style={{ flex: 1 }}>Digite sua pergunta…</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
