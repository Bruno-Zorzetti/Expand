import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PerfilAvatar from "@/components/expand/PerfilAvatar";
import type { Perfil } from "@/lib/expand-perfis";

export const dynamic = "force-dynamic";

function No({ p, byPai }: { p: Perfil; byPai: Map<string, Perfil[]> }) {
  const kids = byPai.get(p.id) ?? [];
  return (
    <div>
      <Link href={`/expand/equipe/${p.id}`} className="ex-orgcard hx-glass hx-glass-hover" style={{ textDecoration: "none", color: "inherit", ["--oc" as string]: p.cor ?? "var(--accent)" }}>
        <PerfilAvatar p={p} size={38} radius={10} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {p.nome}
            <span className="ex-pill" style={{ background: `color-mix(in srgb, ${p.cor} 16%, transparent)`, color: p.cor ?? "var(--accent)" }}>{p.tipo === "agente" ? "IA" : "Humano"}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--dim)" }}>{p.cargo}</div>
          {p.chapeus?.length ? <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>{p.chapeus.map((c, i) => <span key={i} className="ex-chapeu">{c}</span>)}</div> : null}
        </div>
      </Link>
      {kids.length ? <div className="ex-orgkids">{kids.map((k) => <No key={k.id} p={k} byPai={byPai} />)}</div> : null}
    </div>
  );
}

export default async function Organograma() {
  const supabase = await createClient();
  const { data } = await supabase.from("expand_perfis").select("*").order("ordem");
  const perfis = (data ?? []) as Perfil[];

  const byPai = new Map<string, Perfil[]>();
  perfis.forEach((p) => { const s = p.superior ?? "__root__"; const arr = byPai.get(s) ?? []; arr.push(p); byPai.set(s, arr); });
  const roots = byPai.get("__root__") ?? [];

  return (
    <>
      <p className="hx-eyebrow">Estrutura do time</p>
      <h1 className="ex-h1"><span className="hx-accent-text">Organograma</span></h1>
      <p className="ex-sub">Quem responde a quem — humanos e agentes, um time só. Cada um pode vestir vários chapéus. Para reorganizar, edite o <b>superior</b> e os <b>chapéus</b> no perfil de cada membro; com o tempo dá pra testar arranjos e medir resultado.</p>
      <div>{roots.map((r) => <No key={r.id} p={r} byPai={byPai} />)}</div>
    </>
  );
}
