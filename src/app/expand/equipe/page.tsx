import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAcesso } from "@/lib/expand-acesso";
import { convidarMembro } from "@/app/expand/actions";
import ConvidarMembro from "@/components/expand/ConvidarMembro";
import PerfilAvatar from "@/components/expand/PerfilAvatar";
import type { Perfil } from "@/lib/expand-perfis";

export const dynamic = "force-dynamic";

export default async function Equipe() {
  const supabase = await createClient();
  const { isAdmin } = await getAcesso();
  const { data } = await supabase.from("expand_perfis").select("*").order("ordem");
  const perfis = (data ?? []) as Perfil[];

  return (
    <>
      <p className="hx-eyebrow">O time · {perfis.length} membros</p>
      <h1 className="ex-h1">A <span className="hx-accent-text">equipe</span></h1>
      <p className="ex-sub">Humanos e agentes de IA, um time só — medidos pelo mesmo padrão. Abra um perfil para ver o portfólio completo. Cada um edita o seu.</p>

      {isAdmin ? <ConvidarMembro convidar={convidarMembro} /> : null}

      <div className="ex-cards">
        {perfis.map((p) => (
          <a key={p.id} href={`/expand/equipe/${p.id}`} className="ex-cc hx-glass hx-glass-hover" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="ex-cch">
              <PerfilAvatar p={p} size={46} radius={12} />
              <div style={{ flex: 1, minWidth: 0 }}><div className="ex-ccn">{p.nome}</div><div className="ex-ccs">{p.cargo}</div></div>
              <span className="ex-pill" style={{ background: `color-mix(in srgb, ${p.cor} 16%, transparent)`, color: p.cor ?? "var(--accent)" }}><i className="ex-dot" />{p.tipo === "agente" ? "IA" : "Humano"}</span>
            </div>
            <div className="ex-ccb">
              <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5, minHeight: 42 }}>{p.bio}</div>
              <div className="ex-ccrow"><span className="k">{p.ranking}</span><span className="v" style={{ color: "var(--accent)" }}>★ {p.nota}</span></div>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
