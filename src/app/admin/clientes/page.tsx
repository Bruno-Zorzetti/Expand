import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import Icon from "@/components/Icon";
import { enviarWhatsapp } from "@/lib/whatsapp";
import { siteUrl } from "@/lib/site";

const SITE = siteUrl();

function foneDe(d: Record<string, unknown>): string {
  return String(d.whatsapp || d.telefone || d.telefone_fixo || d.contato || "");
}
function nomeDe(d: Record<string, unknown>): string {
  return String(d.nome || d.perfil_nome || d.negocio || d.nome_empresa || "Cliente");
}

export default async function ClientesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role)) redirect("/dashboard");

  const { data: produtos } = await supabase.from("products").select("slug, name").eq("active", true).order("name");
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, product_slug, dados, created_at, products(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  async function enviarBriefing(formData: FormData) {
    "use server";
    const nome = String(formData.get("nome") ?? "").trim();
    const whatsapp = String(formData.get("whatsapp") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    if (!whatsapp || !slug) redirect("/admin/clientes?erro=1");
    const supabase = await createClient();
    const { data: p } = await supabase.from("products").select("name").eq("slug", slug).maybeSingle();
    const link = `${SITE}/produtos/${slug}/briefing`;
    const texto =
      `Olá${nome ? ` ${nome}` : ""}! Aqui é a *Hashes*. ` +
      `Pra começarmos o seu *${p?.name ?? "projeto"}*, é só preencher este briefing rápido:\n${link}`;
    const r = await enviarWhatsapp(whatsapp, texto);
    redirect(r.ok ? "/admin/clientes?ok=1" : r.skipped ? "/admin/clientes?ok=skip" : "/admin/clientes?erro=1");
  }

  return (
    <main className="hx-ambient min-h-screen text-[var(--txt)]">
      <AdminNav />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="hx-eyebrow">CRM</p>
        <h1 className="mt-1 text-2xl font-extrabold">Clientes</h1>
        <p className="mt-1 mb-6 text-sm text-[var(--mut)]">Envie o link de briefing por WhatsApp e acompanhe quem já entrou.</p>

        {sp.ok === "1" && <div className="hx-glass mb-4 p-4 text-sm text-[var(--green)]">Mensagem enviada pelo WhatsApp.</div>}
        {sp.ok === "skip" && <div className="hx-glass mb-4 p-4 text-sm text-[var(--warn)]">WhatsApp não configurado/conectado — conecte em <Link href="/admin/whatsapp" className="underline">Admin · WhatsApp</Link>.</div>}
        {sp.erro && <div className="hx-glass mb-4 p-4 text-sm text-[var(--red)]">Não foi possível enviar. Verifique o número e a conexão do WhatsApp.</div>}

        {/* Enviar briefing */}
        <form action={enviarBriefing} className="hx-glass grid gap-3 p-5 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs text-[var(--mut)]">Nome (opcional)</label>
            <input name="nome" className="w-full rounded-lg border border-[var(--line-2)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--mut)]">WhatsApp</label>
            <input name="whatsapp" required placeholder="5565..." className="w-full rounded-lg border border-[var(--line-2)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--mut)]">Produto</label>
            <select name="slug" className="w-full rounded-lg border border-[var(--line-2)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]">
              {(produtos ?? []).map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="hx-btn hx-btn-primary w-full justify-center">
              <Icon name="share" size={15} /> Enviar
            </button>
          </div>
        </form>

        {/* Lista de clientes/pedidos */}
        <h2 className="mb-3 mt-8 text-lg font-bold">Quem já entrou <span className="text-sm font-normal text-[var(--mut)]">({(orders ?? []).length})</span></h2>
        <div className="space-y-2">
          {(orders ?? []).map((o) => {
            const d = (o.dados ?? {}) as Record<string, unknown>;
            const prod = Array.isArray(o.products) ? o.products[0] : o.products;
            const fone = foneDe(d);
            return (
              <div key={o.id} className="hx-glass flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-bold">{nomeDe(d)}</p>
                  <p className="text-xs text-[var(--mut)]">{prod?.name ?? o.product_slug} · {fone || "sem WhatsApp"} · {o.status}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {fone && (
                    <form action={enviarBriefing}>
                      <input type="hidden" name="nome" value={nomeDe(d)} />
                      <input type="hidden" name="whatsapp" value={fone} />
                      <input type="hidden" name="slug" value={o.product_slug} />
                      <button className="hx-btn hx-btn-ghost px-3 py-1.5 text-xs">Reenviar briefing</button>
                    </form>
                  )}
                  <Link href={`/admin/pedidos/${o.id}`} className="hx-btn hx-btn-ghost px-3 py-1.5 text-xs">Abrir</Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
