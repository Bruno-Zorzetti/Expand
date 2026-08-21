import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  PADRAO, BADGES,
  calc, xpTotal, xpMax, xpDia, totais, streak, maiorStreak, nivel, bateu, ehUtil, iso, dtFromIso,
  type Plano, type Reg,
} from "@/lib/expand-comercial-game";

export const dynamic = "force-dynamic";

type PerfilCom = { id: string; nome: string; cargo: string | null; cor: string | null; foto_url: string | null };

function semanaAtual(): string[] {
  const hoje = new Date();
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(seg); d.setDate(seg.getDate() + i); return iso(d);
  });
}

function fmtXP(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n); }

export default async function Placar() {
  const supabase = await createClient();

  // Time comercial dinâmico
  const { data: timeData } = await supabase
    .from("expand_perfis")
    .select("id, nome, cargo, cor, foto_url")
    .eq("tipo", "humano")
    .eq("area", "Comercial")
    .order("nome");

  const time = (timeData ?? []) as PerfilCom[];

  if (time.length === 0) {
    return (
      <div>
        <p className="hx-eyebrow">Comercial · Placar</p>
        <h1 className="ex-h1">Leaderboard</h1>
        <div className="hx-glass" style={{ padding: "32px", textAlign: "center", borderRadius: 16 }}>
          <p style={{ color: "var(--mut)", fontSize: 14 }}>
            Nenhum membro com área &quot;Comercial&quot; cadastrado.{" "}
            <Link href="/expand/equipe" style={{ color: "var(--accent)" }}>Configurar equipe →</Link>
          </p>
        </div>
      </div>
    );
  }

  const { data: cfg } = await supabase.from("expand_com_config").select("plano").eq("id", "main").maybeSingle();
  const plano = { ...PADRAO, ...((cfg?.plano as Partial<Plano>) ?? {}) } as Plano;
  const C = calc(plano);
  const semDias = semanaAtual();
  const hojeISO = iso(new Date());

  // Carregar registros de cada membro
  const regs: Record<string, Reg> = {};
  await Promise.all(time.map(async (t) => {
    const { data } = await supabase.from("expand_com_registro").select("dia,missao,valor").eq("jogador", t.id);
    const r: Reg = {};
    (data ?? []).forEach((row) => { const d = row.dia as string; (r[d] ??= {})[row.missao as string] = row.valor as number; });
    regs[t.id] = r;
  }));

  const stats = time.map((t) => {
    const reg = regs[t.id];
    const xpAcc  = xpTotal(t.id, C, reg);
    const xpSem  = semDias.filter(ehUtil).reduce((a, d) => a + xpDia(t.id, d, C, reg), 0);
    const xpMaxSem = semDias.filter(d => ehUtil(d) && d <= hojeISO).reduce((a, d) => a + xpMax(dtFromIso(d).getDay(), C), 0);
    const strAtual  = streak(t.id, C, reg);
    const strMelhor = maiorStreak(t.id, C, reg);
    const nv = nivel(xpAcc);
    const tots = totais(reg);
    const diasBatidos = semDias.filter(d => ehUtil(d) && d <= hojeISO && bateu(t.id, d, C, reg)).length;
    const diasPassados = semDias.filter(d => ehUtil(d) && d <= hojeISO).length;
    const badges = BADGES.filter(b => b.f(tots, strMelhor));
    return { t, xpAcc, xpSem, xpMaxSem, strAtual, strMelhor, nv, tots, diasBatidos, diasPassados, badges };
  }).sort((a, b) => b.xpAcc - a.xpAcc);

  const leaderId = stats[0]?.t.id;

  return (
    <>
      <p className="hx-eyebrow">Comercial · Placar</p>
      <h1 className="ex-h1">O <span className="hx-accent-text">leaderboard</span></h1>
      <p className="ex-sub">
        XP acumulado desde o início do programa. Clique em cada jogador para abrir o placar do dia.
        Meta na <Link href="/expand/comercial/meta" style={{ color: "var(--accent)" }}>calculadora</Link>.
      </p>

      {/* Cards de jogadores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginBottom: 24 }}>
        {stats.map((s, rank) => {
          const cor = s.t.cor ?? "var(--accent)";
          const nv = s.nv;
          const xpNext = nv.prox != null ? nv.prox - nv.base : null;
          const xpIn   = nv.prox != null ? Math.max(0, Math.min(s.xpAcc - nv.base, nv.prox - nv.base)) : null;
          const pctLvl = xpIn != null && xpNext ? Math.round(xpIn / xpNext * 100) : 100;
          const isLeader = s.t.id === leaderId;

          return (
            <Link
              key={s.t.id}
              href={`/expand/comercial`}
              className="hx-glass hx-glass-hover"
              style={{ borderRadius: 16, padding: "20px 18px", textDecoration: "none", color: "inherit", display: "block", position: "relative", border: isLeader ? `1px solid color-mix(in srgb,${cor} 40%,transparent)` : "1px solid var(--line)" }}
            >
              {isLeader && (
                <span style={{ position: "absolute", top: 14, right: 14, fontSize: 10, fontWeight: 700, color: cor, background: `color-mix(in srgb,${cor} 12%,transparent)`, borderRadius: 20, padding: "2px 8px" }}>
                  ★ liderando
                </span>
              )}

              {/* Rank + avatar */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ position: "relative" }}>
                  {s.t.foto_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={s.t.foto_url} alt={s.t.nome} width={44} height={44} style={{ borderRadius: 12, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `color-mix(in srgb,${cor} 20%,transparent)`, color: cor, fontSize: 16, fontWeight: 800, display: "grid", placeItems: "center" }}>
                      {s.t.nome[0]}
                    </div>
                  )}
                  {rank < 3 && (
                    <span style={{ position: "absolute", top: -6, left: -6, fontSize: 14 }}>
                      {rank === 0 ? "🥇" : rank === 1 ? "🥈" : "🥉"}
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--txt)" }}>{s.t.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)" }}>{s.t.cargo ?? "Comercial"}</div>
                </div>
              </div>

              {/* XP total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)" }}>XP total</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: cor, fontVariantNumeric: "tabular-nums" }}>{fmtXP(s.xpAcc)}</span>
              </div>

              {/* Level bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--txt)" }}>Nv {nv.i} · {nv.nome}</span>
                  {nv.proxNome && <span style={{ fontSize: 10, color: "var(--dim)" }}>{nv.proxNome} → {nv.prox ? fmtXP(nv.prox) : "max"} XP</span>}
                </div>
                <div style={{ height: 5, borderRadius: 99, background: "var(--panel-2)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pctLvl}%`, background: cor, borderRadius: 99, transition: "width .3s" }} />
                </div>
              </div>

              {/* Semana */}
              <div className="hx-glass" style={{ borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 6 }}>Esta semana</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: cor, fontVariantNumeric: "tabular-nums" }}>{fmtXP(s.xpSem)}</div>
                    <div style={{ fontSize: 10, color: "var(--dim)" }}>XP{s.xpMaxSem > 0 ? ` / ${fmtXP(s.xpMaxSem)}` : ""}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.diasBatidos >= s.diasPassados && s.diasPassados > 0 ? "var(--green)" : "var(--txt)", fontVariantNumeric: "tabular-nums" }}>{s.diasBatidos}/{s.diasPassados}</div>
                    <div style={{ fontSize: 10, color: "var(--dim)" }}>dias batidos</div>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
                {[
                  { label: "Sequência", val: s.strAtual, icon: "🔥" },
                  { label: "Convites", val: s.tots.conv, icon: "✉" },
                  { label: "Reuniões", val: s.tots.reun, icon: "🤝" },
                  { label: "Indicações", val: s.tots.ind, icon: "💬" },
                ].map((kpi) => (
                  <div key={kpi.label} style={{ background: "var(--panel-2)", borderRadius: 8, padding: "7px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 10 }}>{kpi.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--txt)", fontVariantNumeric: "tabular-nums" }}>{kpi.val}</div>
                    <div style={{ fontSize: 9, color: "var(--dim)" }}>{kpi.label}</div>
                  </div>
                ))}
              </div>

              {/* Badges */}
              {s.badges.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 6 }}>Conquistas</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {s.badges.map((bg) => (
                      <span key={bg.n} title={`${bg.n} · ${bg.c}`} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "color-mix(in srgb,var(--accent) 10%,transparent)", color: "var(--accent)", fontWeight: 700 }}>
                        {bg.i} {bg.n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Tabela dia-a-dia desta semana */}
      <div className="ex-grph"><span className="gt">Dias desta semana</span><span className="gc">meta diária</span><span className="gl" /></div>
      <div className="hx-glass" style={{ borderRadius: 14, overflow: "hidden", marginBottom: 4, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700 }}>
              <td style={{ padding: "8px 16px" }}>Dia</td>
              {stats.map(s => (
                <td key={s.t.id} style={{ padding: "8px 12px", textAlign: "center" }}>{s.t.nome.split(" ")[0]}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {semDias.filter(ehUtil).map(d => {
              const label = new Date(d + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
              const isHoje = d === hojeISO;
              const isFut  = d > hojeISO;
              return (
                <tr key={d} style={{ borderBottom: "1px solid var(--line)", background: isHoje ? "color-mix(in srgb,var(--accent) 5%,transparent)" : "transparent", opacity: isFut ? 0.4 : 1 }}>
                  <td style={{ padding: "10px 16px", fontWeight: isHoje ? 700 : 400, color: isHoje ? "var(--accent)" : "var(--mut)" }}>
                    {label}{isHoje ? " ← hoje" : ""}
                  </td>
                  {stats.map(s => {
                    const xp = xpDia(s.t.id, d, C, regs[s.t.id]);
                    const ok  = bateu(s.t.id, d, C, regs[s.t.id]);
                    const cor = s.t.cor ?? "var(--accent)";
                    return (
                      <td key={s.t.id} style={{ padding: "10px 12px", textAlign: "center" }}>
                        {isFut ? <span style={{ color: "var(--dim)" }}>—</span> : (
                          <span style={{ fontSize: 13, fontWeight: 700, color: ok ? "var(--green)" : xp > 0 ? cor : "var(--dim)" }}>
                            {ok ? "✓ " : ""}{fmtXP(xp)} XP
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Links */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <Link href="/expand/comercial" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Placar do dia →</Link>
        <Link href="/expand/comercial/semana" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Semana completa →</Link>
        <Link href="/expand/comercial/pipeline" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Pipeline →</Link>
        <Link href="/expand/comercial/meta" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Calculadora de meta →</Link>
      </div>
    </>
  );
}
