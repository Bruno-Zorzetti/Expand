import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import {
  PADRAO, calc, doDia, xpDia, metaDia, xpTotal, nivel, totais, streak, iso, BADGES, maiorStreak,
  type Plano, type Reg,
} from "@/lib/expand-comercial-game";
import { setMissao, trocarJogador } from "@/app/expand/comercial/actions";
import PlacarHoje from "@/components/expand/PlacarHoje";
import AgenteComercialChat from "@/components/expand/AgenteComercialChat";

export const dynamic = "force-dynamic";

type PerfilCom = { id: string; nome: string; cargo: string | null; cor: string | null; foto_url: string | null };

export default async function ComercialHoje() {
  const { pessoa } = await getPessoa();
  const supabase = await createClient();

  // Time comercial — dinâmico do banco
  const { data: timeData } = await supabase
    .from("expand_perfis")
    .select("id, nome, cargo, cor, foto_url")
    .eq("tipo", "humano")
    .eq("area", "Comercial")
    .order("nome");

  const time = (timeData ?? []) as PerfilCom[];

  // Fallback: se não há ninguém no comercial, mostra erro amigável
  if (time.length === 0) {
    return (
      <div className="hx-glass" style={{ padding: "32px 28px", borderRadius: 16, textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--mut)" }}>
          Nenhum membro com área &quot;Comercial&quot; cadastrado.{" "}
          <Link href="/expand/equipe" style={{ color: "var(--accent)" }}>Configurar equipe →</Link>
        </p>
      </div>
    );
  }

  // Jogador ativo via cookie — fallback para o primeiro do time
  const c = await cookies();
  const cookieJog = c.get("com_jogador")?.value;
  const jogador = time.find(t => t.id === cookieJog)?.id ?? time[0].id;
  const perfilAtivo = time.find(t => t.id === jogador) ?? time[0];

  // Plano e registros
  const { data: cfg } = await supabase.from("expand_com_config").select("plano").eq("id", "main").maybeSingle();
  const plano = { ...PADRAO, ...((cfg?.plano as Partial<Plano>) ?? {}) } as Plano;
  const C = calc(plano);

  const { data: regData } = await supabase
    .from("expand_com_registro")
    .select("dia, missao, valor")
    .eq("jogador", jogador);
  const reg: Reg = {};
  (regData ?? []).forEach((r) => {
    const d = r.dia as string;
    (reg[d] ??= {})[r.missao as string] = r.valor as number;
  });

  // Stats para o contexto do agente
  const hoje = iso(new Date());
  const wd   = new Date().getDay();
  const xpH  = xpDia(jogador, hoje, C, reg);
  const metaH = metaDia(wd, C);
  const xpAcc = xpTotal(jogador, C, reg);
  const lvl   = nivel(xpAcc);
  const seq   = streak(jogador, C, reg);
  const tots  = totais(reg);
  const ms    = doDia(wd, C);
  const msContext = ms.map(m => ({
    id: m.id, t: m.t, tipo: m.tipo,
    valor: reg[hoje]?.[m.id] ?? 0,
    alvo: m.alvo,
    done: m.tipo === "check" ? (reg[hoje]?.[m.id] ?? 0) >= 1 : (reg[hoje]?.[m.id] ?? 0) >= (m.alvo ?? 1),
  }));

  const agCtx = {
    nome: perfilAtivo.nome,
    cargo: perfilAtivo.cargo ?? "Comercial",
    xpHoje: xpH, metaHoje: metaH,
    xpTotal: xpAcc, nivel: lvl.nome,
    streak: seq, missoesDia: msContext,
    metaACV: plano.metaACV, ticketMedio: C.ticket,
  };

  // Badges conquistados
  const strMelhor = maiorStreak(jogador, C, reg);
  const badges = BADGES.filter(b => b.f(tots, strMelhor));

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p className="hx-eyebrow">Comercial · Missões do dia</p>
          <h1 className="ex-h1" style={{ margin: 0 }}>
            O <span className="hx-accent-text">placar</span> de hoje
          </h1>
        </div>

        {/* Seletor de membro */}
        <div style={{ display: "flex", gap: 6, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 4 }}>
          {time.map((t) => {
            const ativo = t.id === jogador;
            const cor = t.cor ?? "var(--accent)";
            return (
              <form key={t.id} action={trocarJogador}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  title={t.cargo ?? t.nome}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "6px 12px",
                    borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 12.5, fontWeight: 700,
                    background: ativo ? `color-mix(in srgb, ${cor} 20%, var(--panel))` : "none",
                    color: ativo ? cor : "var(--mut)",
                    outline: ativo ? `1px solid color-mix(in srgb, ${cor} 35%, transparent)` : "none",
                  }}
                >
                  {t.foto_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={t.foto_url} alt={t.nome} width={20} height={20} style={{ borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: cor, color: "#0A1512", fontSize: 9, fontWeight: 800, display: "grid", placeItems: "center" }}>
                      {t.nome[0]}
                    </span>
                  )}
                  {t.nome.split(" ")[0]}
                </button>
              </form>
            );
          })}
        </div>
      </div>

      <p className="ex-sub">
        Missões calibradas pela{" "}
        <Link href="/expand/comercial/meta" style={{ color: "var(--accent)" }}>calculadora de meta</Link>.
        Some XP, mantenha a sequência e sobe de nível — o objetivo é sustentar a rotina.
      </p>

      {/* Stats rápidos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 8, marginBottom: 20 }}>
        {[
          { l: "Convites", v: tots.conv },
          { l: "Reuniões", v: tots.reun },
          { l: "Indicações", v: tots.ind },
          { l: "Follow-ups", v: tots.fup },
        ].map(k => (
          <div key={k.l} className="ex-kpi hx-glass" style={{ textAlign: "center" }}>
            <div className="val" style={{ fontVariantNumeric: "tabular-nums" }}>{k.v}</div>
            <div className="foot">{k.l}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {badges.map(b => (
            <span key={b.n} title={b.c} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "color-mix(in srgb,var(--accent) 10%,transparent)", color: "var(--accent)", fontWeight: 700, border: "1px solid color-mix(in srgb,var(--accent) 20%,transparent)" }}>
              {b.i} {b.n}
            </span>
          ))}
        </div>
      )}

      {/* Placar do dia */}
      <PlacarHoje
        jogador={jogador}
        perfil={perfilAtivo}
        plano={plano}
        reg={reg}
        setMissao={setMissao}
      />

      {/* Agente Téo */}
      <AgenteComercialChat contexto={agCtx} />

      {/* Links rápidos */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 24 }}>
        <Link href="/expand/comercial/pipeline" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Pipeline →</Link>
        <Link href="/expand/comercial/placar" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Leaderboard →</Link>
        <Link href="/expand/comercial/meta" className="hx-btn" style={{ padding: "8px 14px", textDecoration: "none", fontSize: 12 }}>Calculadora →</Link>
      </div>
    </>
  );
}
