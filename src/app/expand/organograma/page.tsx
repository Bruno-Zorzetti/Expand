import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PerfilAvatar from "@/components/expand/PerfilAvatar";
import type { Perfil } from "@/lib/expand-perfis";

export const dynamic = "force-dynamic";

function No({ p, byPai, owner }: { p: Perfil; byPai: Map<string, Perfil[]>; owner?: boolean }) {
  const kids = byPai.get(p.id) ?? [];
  const cor = p.cor ?? "var(--accent)";
  return (
    <div className="ex-vnode">
      <Link href={`/expand/equipe/${p.id}`} className={`ex-vcard${owner ? " owner" : ""}`} style={{ ["--oc" as string]: cor }} title={`Ver ${p.nome} · editar superior e chapéus no perfil`}>
        <PerfilAvatar p={p} size={46} radius={13} />
        <div className="ex-vmid">
          <div className="ex-vnm">
            {p.nome}
            {owner ? <span className="ex-vbadge">Diretoria</span> : null}
            {p.tipo === "agente" ? <span className="ex-vbadge" style={{ background: "transparent", color: cor, border: `1px solid ${cor}` }}>IA</span> : null}
          </div>
          <div className="ex-vrl">{p.cargo}{p.area ? ` · ${p.area}` : ""}</div>
          {p.chapeus?.length ? <div className="ex-vch">{p.chapeus.slice(0, 4).map((c, i) => <span key={i} className="ex-chapeu">{c}</span>)}</div> : null}
        </div>
        <div className="ex-vright">
          <div className="ex-vnota"><b>{p.nota ?? "—"}</b><span>Nota</span></div>
          <div className="ex-vstat"><i />{p.tipo === "agente" ? "Agente IA" : "Ativo"}</div>
          <span className="ex-vdots">⋯</span>
        </div>
      </Link>
      {kids.length ? <div className="ex-vkids">{kids.map((k) => <No key={k.id} p={k} byPai={byPai} />)}</div> : null}
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
  const humanos = perfis.filter((p) => p.tipo !== "agente").length;
  const agentes = perfis.length - humanos;

  return (
    <>
      <p className="hx-eyebrow">Estrutura do time</p>
      <h1 className="ex-h1"><span className="hx-accent-text">Organograma</span></h1>
      <p className="ex-sub">Quem responde a quem — humanos e agentes, um time só. Cada um pode vestir vários chapéus. Para reorganizar, edite o <b>superior</b> e os <b>chapéus</b> no perfil de cada membro; com o tempo dá pra testar arranjos e medir resultado.</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div className="hx-glass" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)", fontSize: 16 }}>◈</div>
          <div><div style={{ fontSize: 13, fontWeight: 700 }}>Time único</div><div style={{ fontSize: 11.5, color: "var(--mut)" }}>{humanos} humanos · {agentes} agentes</div></div>
        </div>
        <Link href="/expand/squads" className="hx-glass hx-glass-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, textDecoration: "none", color: "inherit" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--accent-2) 18%, transparent)", color: "var(--accent-2)", fontSize: 16 }}>◇</div>
          <div><div style={{ fontSize: 13, fontWeight: 700 }}>Squads por projeto ↗</div><div style={{ fontSize: 11.5, color: "var(--mut)" }}>Arranjo diferente por conta</div></div>
        </Link>
      </div>

      <div className="ex-vtree">
        {roots.map((r) => <No key={r.id} p={r} byPai={byPai} owner={roots.length === 1} />)}
      </div>
    </>
  );
}
