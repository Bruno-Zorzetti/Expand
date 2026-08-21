import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  PADRAO, BADGES, NIVEIS,
  calc, xpTotal, xpDia, totais, streak, maiorStreak, nivel, bateu, ehUtil,
  iso, dtFromIso,
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

export default async function ComercialSemana() {
  const supabase = await createClient();

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
        <p className="hx-eyebrow">Comercial · A Semana</p>
        <h1 className="ex-h1">Semana do time</h1>
        <div className="hx-glass" style={{ padding: 32, textAlign: "center", borderRadius: 16 }}>
          <p style={{ color: "var(--mut)" }}>
            Nenhum membro com área &quot;Comercial&quot; cadastrado.{" "}
            <Link href="/expand/equipe" style={{ color: "var(--accent)" }}>Configurar →</Link>
          </p>
        </div>
      </div>
    );
  }

  const { data: cfg } = await supabase.from("expand_com_config").select("plano").eq("id", "main").maybeSingle();
  const plano = { ...PADRAO, ...((cfg?.plano as Partial<Plano>) ?? {}) } as Plano;
  const C = calc(plano);
  const semDias = semanaAtual();
  const hoje = iso(new Date());
  const diasPassados = semDias.filter((d) => d <= hoje && ehUtil(d));

  const regs: Record<string, Reg> = {};
  for (const t of time) {
    const { data } = await supabase.from("expand_com_registro").select("dia, missao, valor").eq("jogador", t.id);
    const r: Reg = {};
    (data ?? []).forEach((x) => {
      const d = x.dia as string;
      (r[d] ??= {})[x.missao as string] = x.valor as number;
    });
    regs[t.id] = r;
  }

  const stats = time.map((t) => {
    const reg = regs[t.id];
    const xpTot = xpTotal(t.id, C, reg);
    const niv = nivel(xpTot);
    const str = streak(t.id, C, reg);
    const mStr = maiorStreak(t.id, C, reg);
    const tot = totais(reg);
    const diasBatidos = diasPassados.filter((d) => bateu(t.id, d, C, reg)).length;
    const xpSem = diasPassados.reduce((a, d) => a + xpDia(t.id, d, C, reg), 0);
    const badges = BADGES.filter((b) => b.f(tot, mStr));
    return { t, xpTot, niv, str, mStr, tot, diasBatidos, xpSem, badges };
  }).sort((a, b) => b.xpSem - a.xpSem);

  const liderId = stats[0]?.t.id;

  return (
    <>
      <p className="hx-eyebrow">Comercial · A Semana</p>
      <h1 className="ex-h1">Semana do <span className="hx-accent-text">time</span></h1>
      <p className="ex-sub">
        XP desta semana, conquistas e tabela de níveis do ciclo.
      </p>

      {/* Cards dos membros */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, marginBottom: 24 }}>
        {stats.map((s) => {
          const cor = s.t.cor ?? "var(--accent)";
          const isLider = s.t.id === liderId;
          return (
            <div key={s.t.id} className="hx-glass" style={{ borderRadius: 16, padding: "20px 22px", borderTop: `3px solid ${cor}`, position: "relative" }}>
              {isLider && (
                <div style={{ position: "absolute", top: -1, right: 14, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--accent)", background: "color-mix(in srgb,var(--accent) 14%,transparent)", padding: "3px 9px", borderRadius: "0 0 8px 8px" }}>Liderando</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                {s.t.foto_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={s.t.foto_url} alt={s.t.nome} width={44} height={44} style={{ borderRadius: 13, objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", background: `color-mix(in srgb,${cor} 18%,transparent)`, color: cor, fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
                    {s.t.nome[0]}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{s.t.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)" }}>{s.t.cargo ?? "Comercial"}</div>
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: cor, lineHeight: 1, marginBottom: 2 }}>
                {s.xpSem} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--mut)" }}>XP esta semana</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--mut)", marginBottom: 16 }}>
                {s.diasBatidos}/{diasPassados.length} dias batidos
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { l: "Nível", v: `#${s.niv.i} ${s.niv.nome}` },
                  { l: "Sequência 🔥", v: `${s.str} dias` },
                  { l: "XP total", v: s.xpTot.toLocaleString("pt-BR") },
                  { l: "Maior seq.", v: `${s.mStr} dias` },
                ].map(({ l, v }) => (
                  <div key={l} className="hx-glass" style={{ borderRadius: 9, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Totais do ciclo */}
      <div className="ex-grph"><span className="gt">Totais do ciclo</span><span className="gl" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginBottom: 24 }}>
        {(["Convites enviados", "Reuniões feitas", "Indicações pedidas", "Follow-ups"] as const).map((label, i) => {
          const keys = ["conv", "reun", "ind", "fup"] as const;
          const k = keys[i];
          return (
            <div key={label} className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 8 }}>{label}</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {stats.map((s) => {
                  const cor = s.t.cor ?? "var(--accent)";
                  return (
                    <div key={s.t.id} style={{ flex: 1, minWidth: 60 }}>
                      <div style={{ fontSize: 9, color: cor, fontWeight: 700, marginBottom: 2 }}>{s.t.nome.split(" ")[0]}</div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{s.tot[k]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Conquistas */}
      <div className="ex-grph"><span className="gt">Conquistas</span><span className="gl" /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 22 }}>
        {BADGES.map((badge) => {
          const conquistou = stats.map((s) => ({ id: s.t.id, nome: s.t.nome, cor: s.t.cor ?? "var(--accent)", tem: badge.f(s.tot, s.mStr) }));
          const algum = conquistou.some((c) => c.tem);
          return (
            <div key={badge.n} className="hx-glass" style={{ borderRadius: 11, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12, opacity: algum ? 1 : 0.4 }}>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, color: algum ? "var(--accent)" : "var(--dim)" }}>{badge.i}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: algum ? "var(--txt)" : "var(--dim)" }}>{badge.n}</div>
                <div style={{ fontSize: 11, color: "var(--dim)" }}>{badge.c}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {conquistou.map((c) => (
                  <div key={c.id} title={c.nome} style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: c.tem ? `color-mix(in srgb,${c.cor} 18%,transparent)` : "var(--panel-2)", fontSize: 11, fontWeight: 800, color: c.tem ? c.cor : "var(--dim)" }}>
                    {c.nome[0]}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela de níveis */}
      <div className="ex-grph"><span className="gt">Tabela de níveis</span><span className="gl" /></div>
      <div className="hx-glass" style={{ borderRadius: 14, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["#", "Nível", "XP mínimo", ...stats.map((s) => s.t.nome.split(" ")[0])].map((c) => (
                <th key={c} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", fontWeight: 700 }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NIVEIS.map(([xp, nome], idx) => (
              <tr key={nome} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "8px 14px", color: "var(--dim)", fontWeight: 700 }}>{idx + 1}</td>
                <td style={{ padding: "8px 14px", fontWeight: 600 }}>{nome}</td>
                <td style={{ padding: "8px 14px", color: "var(--mut)", fontFamily: "monospace" }}>{xp.toLocaleString("pt-BR")}</td>
                {stats.map((s) => {
                  const cor = s.t.cor ?? "var(--accent)";
                  const atual = s.niv.i === idx + 1;
                  const passou = s.xpTot >= xp;
                  return (
                    <td key={s.t.id} style={{ padding: "8px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: atual ? cor : passou ? "var(--green)" : "var(--dim)" }}>
                        {atual ? "← aqui" : passou ? "✓" : "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <Link href="/expand/comercial" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Placar do dia →</Link>
        <Link href="/expand/comercial/placar" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Leaderboard →</Link>
      </div>
    </>
  );
}
