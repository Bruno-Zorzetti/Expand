import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import { PADRAO, JOGADORES, type Plano, type Reg } from "@/lib/expand-comercial-game";
import { setMissao, trocarJogador } from "@/app/expand/comercial/actions";
import PlacarHoje from "@/components/expand/PlacarHoje";

export const dynamic = "force-dynamic";

export default async function ComercialHoje() {
  const { pessoa } = await getPessoa();
  const c = await cookies();
  const cookieJog = c.get("com_jogador")?.value;
  const jogador = cookieJog && JOGADORES[cookieJog] ? cookieJog : JOGADORES[pessoa.id] ? pessoa.id : "luiz";

  const supabase = await createClient();
  const { data: cfg } = await supabase.from("expand_com_config").select("plano").eq("id", "main").maybeSingle();
  const plano = { ...PADRAO, ...((cfg?.plano as Partial<Plano>) ?? {}) } as Plano;

  const { data: regData } = await supabase.from("expand_com_registro").select("dia, missao, valor").eq("jogador", jogador);
  const reg: Reg = {};
  (regData ?? []).forEach((r) => { const d = r.dia as string; (reg[d] ??= {})[r.missao as string] = r.valor as number; });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p className="hx-eyebrow">Comercial · Hoje</p>
          <h1 className="ex-h1" style={{ margin: 0 }}>O <span className="hx-accent-text">placar</span> do dia</h1>
        </div>
        <div style={{ display: "flex", gap: 6, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10, padding: 3 }}>
          {Object.entries(JOGADORES).map(([id, j]) => (
            <form key={id} action={trocarJogador}>
              <input type="hidden" name="id" value={id} />
              <button type="submit" style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, background: id === jogador ? "linear-gradient(160deg,var(--accent),var(--dourado))" : "none", color: id === jogador ? "#0A1512" : "var(--mut)" }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: id === jogador ? "rgba(10,21,18,.25)" : j.c, color: "#0A1512", fontSize: 9, fontWeight: 800, display: "grid", placeItems: "center" }}>{j.ini}</span>{j.n}
              </button>
            </form>
          ))}
        </div>
      </div>
      <p className="ex-sub">Missões do dia com as metas puxadas da <Link href="/expand/comercial/meta" style={{ color: "var(--accent)" }}>calculadora</Link>. Some XP, mantenha a sequência e suba de nível — o objetivo é sustentar a rotina, não punir o dia difícil.</p>

      <PlacarHoje jogador={jogador} jogadorNome={JOGADORES[jogador].n} plano={plano} reg={reg} setMissao={setMissao} />
    </>
  );
}
