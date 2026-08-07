import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import ProdutoWizard from "@/components/expand/ProdutoWizard";

export const dynamic = "force-dynamic";

async function salvarProduto(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const num = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v ? Number(v) : null; };
  const id = String(formData.get("id") ?? "").trim();
  const row = {
    slug: String(formData.get("slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim() || null,
    tagline: String(formData.get("tagline") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    recorrente: formData.get("recorrente") === "on",
    price: num("price"), preco_mensal: num("preco_mensal"), preco_setup: num("preco_setup"),
    delivery: String(formData.get("delivery") ?? "").trim() || null,
    popular: formData.get("popular") === "on",
    active: formData.get("active") === "on",
    sort_order: num("sort_order"),
  };
  if (!row.slug || !row.name) return;
  if (id) await supabase.from("products").update(row).eq("id", id);
  else await supabase.from("products").insert(row);
  revalidatePath("/expand/produtos");
  revalidatePath("/produtos");
  redirect(formData.get("analisar") === "1" ? `/expand/produtos/${row.slug}/processo?analise=1` : "/expand/produtos");
}

type P = { id: string; slug: string; name: string; tagline: string | null; category: string | null; description: string | null; price: number | null; preco_setup: number | null; preco_mensal: number | null; recorrente: boolean; delivery: string | null; popular: boolean; active: boolean; sort_order: number | null };

export default async function NovoProduto({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const sp = await searchParams;
  let editId: string | undefined;
  let produto: Record<string, string | boolean> | undefined;
  if (sp.edit) {
    const supabase = await createClient();
    const { data } = await supabase.from("products").select("*").eq("slug", sp.edit).single();
    if (data) {
      const p = data as P;
      editId = p.id;
      const s = (n: number | null) => (n == null ? "" : String(n));
      produto = {
        name: p.name ?? "", slug: p.slug ?? "", category: p.category ?? "", tagline: p.tagline ?? "", description: p.description ?? "",
        delivery: p.delivery ?? "", recorrente: !!p.recorrente, price: s(p.price), preco_mensal: s(p.preco_mensal),
        preco_setup: s(p.preco_setup), sort_order: s(p.sort_order), popular: !!p.popular, active: !!p.active,
      };
    }
  }

  return (
    <>
      <Link href="/expand/produtos" className="ex-back">← Produtos</Link>
      <p className="hx-eyebrow">{editId ? "Editar produto" : "Novo produto"}</p>
      <h1 className="ex-h1">{editId ? "Editar" : "Criar"} <span className="hx-accent-text">produto</span></h1>
      <p className="ex-sub" style={{ maxWidth: 720, margin: "0 auto 20px", textAlign: "center" }}>Preencha por etapas — cada campo tem uma explicação do que faz. No fim você pode salvar direto ou pedir uma análise do Agente de Produtos antes de publicar.</p>
      <ProdutoWizard produto={produto} editId={editId} action={salvarProduto} />
    </>
  );
}
