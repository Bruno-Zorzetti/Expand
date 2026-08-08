import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { criarApresentacao } from "./actions";
import type { Slide } from "@/lib/expand-slides";

export const dynamic = "force-dynamic";

type Row = { id: string; titulo: string; slides: Slide[]; publico: boolean; atualizado_em: string; criado_por: string | null };

export default async function Apresentacoes() {
  const supabase = await createClient();
  const { data } = await supabase.from("expand_apresentacoes").select("id, titulo, slides, publico, atualizado_em, criado_por").order("atualizado_em", { ascending: false });
  const decks = (data ?? []) as Row[];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <p className="hx-eyebrow">Ferramentas · apresentações</p>
          <h1 className="ex-h1" style={{ margin: 0 }}>Editor de <span className="hx-accent-text">apresentações</span></h1>
        </div>
        <form action={criarApresentacao}><button className="hx-btn hx-btn-primary" type="submit">＋ Nova apresentação</button></form>
      </div>
      <p className="ex-sub">Crie e edite decks no tema Expand Ouro — escolha modelos de slide, escreva os textos ao vivo e apresente em tela cheia. Marque como <b style={{ color: "var(--green)" }}>público</b> para o cliente também ver.</p>

      {decks.length === 0 ? (
        <div className="hx-glass" style={{ padding: 26, borderRadius: 12, textAlign: "center" }}>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>Nenhuma apresentação ainda.</p>
          <p style={{ color: "var(--mut)", fontSize: 13, marginBottom: 14 }}>Comece uma agora — os modelos já vêm prontos pra você só trocar o texto.</p>
          <form action={criarApresentacao}><button className="hx-btn hx-btn-primary" type="submit">＋ Criar a primeira</button></form>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14, marginTop: 8 }}>
          {decks.map((d) => (
            <div key={d.id} className="hx-glass" style={{ borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Link href={`/expand/apresentacoes/${d.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ aspectRatio: "16/9", background: "#08110E", position: "relative", overflow: "hidden", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ position: "absolute", inset: 0, padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 9, letterSpacing: ".2em", textTransform: "uppercase", color: "#C89B5E", marginBottom: 8 }}>{d.slides?.[0]?.eyebrow ?? "Grupo Expand"}</div>
                    <div style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 22, fontWeight: 700, color: "#F4E8D4", lineHeight: 1.15, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.slides?.[0]?.titulo ?? d.titulo}</div>
                  </div>
                </div>
              </Link>
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.titulo}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)" }}>{d.slides?.length ?? 0} slides · {new Date(d.atualizado_em).toLocaleDateString("pt-BR")}{d.publico ? " · público" : ""}</div>
                </div>
                <Link href={`/expand/apresentacoes/${d.id}/ver`} className="hx-btn hx-btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5 }}>▶</Link>
                <Link href={`/expand/apresentacoes/${d.id}`} className="hx-btn hx-btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5 }}>Editar</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
