import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

const COLUNAS = [
  { key: "recebido", label: "Recebido" },
  { key: "confirmado", label: "Confirmado" },
  { key: "pago", label: "Pago" },
  { key: "producao", label: "Produção" },
  { key: "entregue", label: "Entregue" },
];

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!me || !["admin", "equipe"].includes(me.role)) redirect("/dashboard");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, product_slug, created_at, products(name)")
    .order("created_at", { ascending: false });

  const list = orders ?? [];

  return (
    <main className="min-h-screen bg-[#070A12] text-[#EAF0FA]">
      <AdminNav />

      <div className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-2xl font-extrabold">Pedidos da equipe</h1>
        <p className="mt-1 text-sm text-[#8B96AC]">{list.length} pedidos no total</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUNAS.map((col) => {
            const items = list.filter((o) => o.status === col.key);
            return (
              <div key={col.key} className="rounded-xl border border-[#1E2740] bg-[#0F1626] p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-sm font-bold">{col.label}</span>
                  <span className="font-mono text-xs text-[#63708c]">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((o) => {
                    const prod = Array.isArray(o.products) ? o.products[0] : o.products;
                    return (
                      <Link
                        key={o.id}
                        href={`/admin/pedidos/${o.id}`}
                        className="block rounded-lg border border-[#28324c] bg-[#070A12] p-3 hover:border-[#2F80FF]"
                      >
                        <p className="text-sm font-semibold">
                          {prod?.name ?? o.product_slug}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-[#63708c]">
                          #{o.id.slice(0, 8)} ·{" "}
                          {new Date(o.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </Link>
                    );
                  })}
                  {items.length === 0 && (
                    <p className="px-1 py-4 text-center text-xs text-[#63708c]">vazio</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
