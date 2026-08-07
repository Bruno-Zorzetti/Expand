import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type P = {
  id: string; slug: string; name: string; tagline: string | null; category: string | null; description: string | null;
  price: number | null; preco_setup: number | null; preco_mensal: number | null;
  recorrente: boolean; delivery: string | null; popular: boolean; active: boolean; sort_order: number | null;
};

async function removerProduto(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/expand/produtos");
  revalidatePath("/produtos");
}

export default async function ProdutosCRUD() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").order("sort_order");
  const produtos = (data ?? []) as P[];

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <p className="hx-eyebrow">Gestão · Produtos</p>
          <h1 className="ex-h1">Produtos <span className="hx-accent-text">— equipe</span></h1>
          <p className="ex-sub">Criar, precificar, ativar e definir o processo dos produtos. O catálogo que o cliente vê fica em <Link href="/produtos" style={{ color: "var(--accent)" }}>/produtos</Link>.</p>
        </div>
        <Link href="/expand/produtos/novo" className="hx-btn hx-btn-primary" style={{ marginTop: 6 }}>+ Novo produto</Link>
      </div>

      <div className="ex-grph" style={{ marginTop: 6 }}><span className="gt">{produtos.length} produtos</span><span className="gl" /></div>
      {produtos.map((p) => (
        <div key={p.id} className="ex-arq hx-glass" style={{ marginBottom: 8, borderLeft: `3px solid ${p.active ? "var(--green)" : "var(--dim)"}` }}>
          <div className="an">
            {p.name} {p.popular ? <span className="ex-chip" style={{ marginLeft: 6, ["--ac" as string]: "var(--accent)" }}>Popular</span> : null}{!p.active ? <span className="ex-pill" style={{ marginLeft: 6, color: "var(--dim)" }}>rascunho</span> : null}
            <div className="am">{p.category ?? "—"} · {p.recorrente ? `R$ ${p.preco_mensal ?? "—"}/mês` : p.price ? `R$ ${p.price}` : (p.delivery ?? "—")} · /{p.slug}</div>
          </div>
          <Link href={`/expand/produtos/${p.slug}/processo`} className="ex-arqbtn" style={{ color: "var(--accent)" }}>Processo</Link>
          <Link href={`/expand/produtos/novo?edit=${p.slug}`} className="ex-arqbtn">Editar</Link>
          <form action={removerProduto}><input type="hidden" name="id" value={p.id} /><button className="ex-arqbtn no" type="submit">Excluir</button></form>
        </div>
      ))}
    </>
  );
}
