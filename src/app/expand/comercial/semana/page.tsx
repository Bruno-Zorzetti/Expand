import { createClient } from "@/lib/supabase/server";
import {
  PADRAO, JOGADORES, BADGES, NIVEIS,
  calc, xpTotal, xpDia, totais, streak, maiorStreak, nivel, bateu, ehUtil,
  iso, dtFromIso,
  type Plano, type Reg,
} from "@/lib/expand-comercial-game";

export const dynamic = "force-dynamic";

function semanaAtual(): string[] {
  const hoje = new Date();
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(seg);
    d.setDate(seg.getDate() + i);
    return iso(d);
  });
}

export default async function ComercialSemana() {
  const supabase = await createClient();
  const { data: cfg } = await supabase.from("expand_com_config").select("plano").eq("id", "main").maybeSingle();
  const plano = { ...PADRAO, ...((cfg?.plano as Partial<Plano>) ?? {}) } as Plano;
  const C = calc(plano);
  const semDias = semanaAtual();
  const hoje = iso(new Date());
  const diasPassados = semDias.filter((d) => d <= hoje && ehUtil(d));

  const jogIds = Object.keys(JOGADORES);
  const regs: Record<string, Reg> = {};
  for (const jid of jogIds) {
    const { data } = await supabase.from("expand_com_registro").select("dia, missao, valor").eq("jogador", jid);
    const r: Reg = {};
    (data ?? []).forEach((x) => {
      const d = x.dia as string;
      (r[d] ??= {})[x.missao as string] = x.valor as number;
    });
    regs[jid] = r;
  }

  const stats = jogIds.map((jid) => {
    const j = JOGADORES[jid];
    const reg = regs[jid];
    const xpTot = xpTotal(jid, C, reg);
    const niv = nivel(xpTot);
    const str = streak(jid, C, reg);
    const mStr = maiorStreak(jid, C, reg);
    const tot = totais(reg);
    const diasBatidos = diasPassados.filter((d) => bateu(jid, d, C, reg)).length;
    const xpSem = diasPassados.reduce((a, d) => a + xpDia(jid, d, C, reg), 0);
    const badges = BADGES.filter((b) => b.f(tot, mStr));
    return { jid, j, xpTot, niv, str, mStr, tot, diasBatidos, xpSem, badges };
  });

  const lider = stats[0].xpSem >= stats[1].xpSem ? stats[0] : stats[1];

  return (
    <>
      <p className="hx-eyebrow">Comercial · A Semana</p>
      <h1 className="ex-h1">Placar da <span className="hx-accent-text">dupla</span></h1>
      <p className="ex-sub">Semana atual — XP de Luiz e Pedro, conquistas e tabela de níveis do ciclo.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {stats.map((s) => {
          const isLider = s.jid === lider.jid;
          return (
            <div key={s.jid} className="hx-glass" style={{ borderRadius: 16, padding: "20px 22px", borderTop: `3px solid ${s.j.c}`, position: "relative" }}>
              {isLider && (
                <div style={{ position: "absolute", top: -1, right: 14, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--accent)", background: "color-mix(in srgb,var(--accent) 14%,transparent)", padding: "3px 9px", borderRadius: "0 0 8px 8px" }}>Liderando</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, display: "grid", placeItems: "center", background: `color-mix(in srgb,${s.j.c} 18%,transparent)`, color: s.j.c, fontSize: 18, fontWeight: 800, flexShrink: 0 }}>{s.j.ini}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{s.j.n}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)" }}>{s.j.r}</div>
                </div>
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: s.j.c, lineHeight: 1, marginBottom: 2 }}>{s.xpSem} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--mut)" }}>XP esta semana</span></div>
              <div style={{ fontSize: 11.5, color: "var(--mut)", marginBottom: 16 }}>{s.diasBatidos}/{diasPassados.length} dias batidos</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { l: "Nível", v: `#${s.niv.i} ${s.niv.nome}` },
                  { l: "Sequência 🔥", v: `${s.str} dias` },
                  { l: "XP total", v: s.xpTot.toLocaleString("pt-BR") },
                  { l: "Maior sequência", v: `${s.mStr} dias` },
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

      <div className="ex-grph"><span className="gt">Totais do ciclo</span><span className="gl" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginBottom: 24 }}>
        {(["Convites enviados", "Reuniões feitas", "Indicações pedidas", "Follow-ups"] as const).map((label, i) => {
          const keys = ["conv", "reun", "ind", "fup"] as const;
          const k = keys[i];
          return (
            <div key={label} className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 8 }}>{label}</div>
              <div style={{ display: "flex", gap: 12 }}>
                {stats.map((s) => (
                  <div key={s.jid} style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: s.j.c, fontWeight: 700, marginBottom: 2 }}>{s.j.ini}</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{s.tot[k]}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ex-grph"><span className="gt">Conquistas</span><span className="gl" /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 22 }}>
        {BADGES.map((badge) => {
          const conquistou = stats.map((s) => ({ jid: s.jid, j: s.j, tem: badge.f(s.tot, s.mStr) }));
          const algum = conquistou.some((c) => c.tem);
          return (
            <div key={badge.n} className="hx-glass" style={{ borderRadius: 11, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12, opacity: algum ? 1 : 0.4 }}>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, color: algum ? "var(--accent)" : "var(--dim)" }}>{badge.i}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: algum ? "var(--txt)" : "var(--dim)" }}>{badge.n}</div>
                <div style={{ fontSize: 11, color: "var(--dim)" }}>{badge.c}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {conquistou.map((c) => (
                  <div key={c.jid} style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: c.tem ? `color-mix(in srgb,${c.j.c} 18%,transparent)` : "var(--panel-2)", fontSize: 11, fontWeight: 800, color: c.tem ? c.j.c : "var(--dim)" }}>
                    {c.j.ini}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ex-grph"><span className="gt">Tabela de níveis</span><span className="gl" /></div>
      <div className="hx-glass" style={{ borderRadius: 14, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["#", "Nível", "XP", "Luiz", "Pedro"].map((c) => (
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
                {["luiz", "pedro"].map((jid) => {
                  const s = stats.find((x) => x.jid === jid)!;
                  const atual = s.niv.i === idx + 1;
                  const passou = s.xpTot >= xp;
                  return (
                    <td key={jid} style={{ padding: "8px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: atual ? s.j.c : passou ? "var(--green)" : "var(--dim)" }}>
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
    </>
  );
}
