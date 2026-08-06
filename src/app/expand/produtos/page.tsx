import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type P = {
  id: string; slug: string; name: string; tagline: string | null; category: string | null; description: string | null;
  price: number | null; preco_setup: number | null; preco_mensal: number | null;
  recorrente: boolean; delivery: string | null; popular: boolean; active: boolean; sort_order: number | null;
};

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
}

async function removerProduto(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/expand/produtos");
  revalidatePath("/produtos");
}

function Campo({ n, l, v, req, tipo }: { n: string; l: string; v?: string | number | null; req?: boolean; tipo?: string }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", fontWeight: 700, marginBottom: 5 }}>{l}</span>
      <input name={n} type={tipo ?? "text"} defaultValue={v ?? undefined} required={req} step={tipo === "number" ? "any" : undefined}
        style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13, outline: "none" }} />
    </label>
  );
}
const chk: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--mut)" };

export default async function ProdutosCRUD({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").order("sort_order");
  const produtos = (data ?? []) as P[];
  const edit = produtos.find((p) => p.slug === sp.edit) ?? null;

  return (
    <>
      <p className="hx-eyebrow">Gestão · CRUD</p>
      <h1 className="ex-h1">Produtos <span className="hx-accent-text">— equipe</span></h1>
      <p className="ex-sub">Criar, editar, precificar e ativar os produtos. O catálogo que o cliente vê fica em <Link href="/produtos" style={{ color: "var(--accent)" }}>/produtos</Link>.</p>

      <div className="ex-panel hx-glass" style={{ marginBottom: 18 }}>
        <div className="ph"><span className="pt">{edit ? `Editar: ${edit.name}` : "Novo produto"}</span>{edit ? <Link href="/expand/produtos" style={{ marginLeft: "auto", fontSize: 12, color: "var(--accent)" }}>+ novo</Link> : null}</div>
        <form action={salvarProduto} className="pb" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
          <input type="hidden" name="id" defaultValue={edit?.id ?? ""} />
          <Campo n="name" l="Nome" v={edit?.name} req />
          <Campo n="slug" l="Slug" v={edit?.slug} req />
          <Campo n="category" l="Categoria" v={edit?.category} />
          <Campo n="tagline" l="Tagline" v={edit?.tagline} />
          <Campo n="delivery" l="Entrega (texto)" v={edit?.delivery} />
          <Campo n="price" l="Preço único (R$)" v={edit?.price} tipo="number" />
          <Campo n="preco_mensal" l="Preço mensal (R$)" v={edit?.preco_mensal} tipo="number" />
          <Campo n="preco_setup" l="Setup (R$)" v={edit?.preco_setup} tipo="number" />
          <Campo n="sort_order" l="Ordem" v={edit?.sort_order} tipo="number" />
          <label style={chk}><input type="checkbox" name="recorrente" defaultChecked={edit?.recorrente} /> Recorrente</label>
          <label style={chk}><input type="checkbox" name="popular" defaultChecked={edit?.popular} /> Popular</label>
          <label style={chk}><input type="checkbox" name="active" defaultChecked={edit ? edit.active : true} /> Ativo</label>
          <div style={{ gridColumn: "1 / -1" }}><button className="hx-btn hx-btn-primary" type="submit">Salvar produto</button></div>
        </form>
      </div>

      <div className="ex-grph"><span className="gt">{produtos.length} produtos</span><span className="gl" /></div>
      {produtos.map((p) => (
        <div key={p.id} className="ex-arq hx-glass" style={{ marginBottom: 8, borderLeft: `3px solid ${p.active ? "var(--green)" : "var(--dim)"}` }}>
          <div className="an">
            {p.name} {p.popular ? <span className="ex-chip" style={{ marginLeft: 6, ["--ac" as string]: "var(--accent)" }}>Popular</span> : null}
            <div className="am">{p.category ?? "—"} · {p.recorrente ? `R$ ${p.preco_mensal ?? "—"}/mês` : p.price ? `R$ ${p.price}` : (p.delivery ?? "—")} · {p.active ? "ativo" : "inativo"}</div>
          </div>
          <Link href={`/expand/produtos/${p.slug}/processo`} className="ex-arqbtn" style={{ color: "var(--accent)" }}>Processo</Link>
          <Link href={`/expand/produtos?edit=${p.slug}`} className="ex-arqbtn">Editar</Link>
          <form action={removerProduto}><input type="hidden" name="id" value={p.id} /><button className="ex-arqbtn no" type="submit">Excluir</button></form>
        </div>
      ))}
    </>
  );
}
