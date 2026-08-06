import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

const COCKPIT_LABEL: Record<string, string> = {
  gmn: "Google Meu Negócio",
  ebook: "Ebook",
  leads: "Leads / Dados",
  thumbnail: "Thumbnail",
};

type Produto = {
  slug: string;
  name: string;
  category: string | null;
  cockpit: string | null;
  price: number | string | null;
  preco_setup: number | null;
  preco_mensal: number | null;
  recorrente: boolean;
  active: boolean;
};

function n(v: FormDataEntryValue | null): number | null {
  if (v === null || String(v).trim() === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export default async function ServicosAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role)) redirect("/dashboard");

  const { data: produtos } = await supabase
    .from("products")
    .select("slug, name, category, cockpit, price, preco_setup, preco_mensal, recorrente, active")
    .order("name");
  const lista = (produtos ?? []) as Produto[];

  async function salvar(formData: FormData) {
    "use server";
    const slug = String(formData.get("slug") ?? "");
    if (!slug) return;
    const recorrente = formData.get("recorrente") === "on";
    const active = formData.get("active") === "on";
    const patch = {
      active,
      recorrente,
      price: n(formData.get("price")),
      preco_setup: n(formData.get("preco_setup")),
      preco_mensal: n(formData.get("preco_mensal")),
    };
    const supabase = await createClient();
    await supabase.from("products").update(patch).eq("slug", slug);
    revalidatePath("/admin/servicos");
  }

  return (
    <main className="min-h-screen bg-[#070A12] text-[#EAF0FA]">
      <AdminNav />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-extrabold">Serviços & Preços</h1>
        <p className="mt-1 text-sm text-[#8B96AC]">
          Valores usados no catálogo, nas ofertas e nos PDFs comerciais. Produtos recorrentes usam
          setup + mensalidade (ex: Google Meu Negócio); os demais usam preço avulso.
        </p>

        <div className="mt-8 space-y-4">
          {lista.map((p) => (
            <form
              key={p.slug}
              action={salvar}
              className="rounded-2xl border border-[#1E2740] bg-[#0F1626] p-5"
            >
              <input type="hidden" name="slug" value={p.slug} />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold">{p.name}</p>
                  <p className="text-xs text-[#63708c]">
                    {p.cockpit ? COCKPIT_LABEL[p.cockpit] ?? p.cockpit : "—"} · {p.category ?? ""} ·{" "}
                    <span className="font-mono">/{p.slug}</span>
                  </p>
                  <Link href={`/admin/formularios/${p.slug}`} className="text-xs font-semibold text-[#5AA0FF] hover:underline">
                    Editar briefing →
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="recorrente" defaultChecked={p.recorrente} />
                    Recorrente
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="active" defaultChecked={p.active} />
                    Ativo
                  </label>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-[#8B96AC]">Preço avulso (R$)</label>
                  <input
                    name="price"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={p.price != null ? Number(p.price) : ""}
                    className="w-full rounded-lg border border-[#28324c] bg-[#070A12] px-3 py-2 text-sm font-bold outline-none focus:border-[#2F80FF]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8B96AC]">Setup (R$)</label>
                  <input
                    name="preco_setup"
                    type="number"
                    min={0}
                    step={50}
                    defaultValue={p.preco_setup ?? ""}
                    className="w-full rounded-lg border border-[#28324c] bg-[#070A12] px-3 py-2 text-sm font-bold outline-none focus:border-[#2F80FF]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8B96AC]">Mensalidade (R$/mês)</label>
                  <input
                    name="preco_mensal"
                    type="number"
                    min={0}
                    step={50}
                    defaultValue={p.preco_mensal ?? ""}
                    className="w-full rounded-lg border border-[#28324c] bg-[#070A12] px-3 py-2 text-sm font-bold outline-none focus:border-[#2F80FF]"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button className="rounded-lg bg-[#2F80FF] px-5 py-2 text-sm font-bold text-[#04102b] hover:bg-[#5AA0FF]">
                  Salvar
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
