import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import FormBuilder from "@/components/FormBuilder";

type Campo = { id: string; tipo: string; label: string; obrigatorio?: boolean; ajuda?: string; opcoes?: string[] };

export default async function EditarFormulario({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role)) redirect("/dashboard");

  const { data: prod } = await supabase.from("products").select("name").eq("slug", slug).maybeSingle();
  const { data: def } = await supabase.from("form_defs").select("titulo, campos").eq("slug", slug).maybeSingle();

  const titulo = def?.titulo ?? `Briefing — ${prod?.name ?? slug}`;
  const campos = (def?.campos ?? []) as Campo[];

  return (
    <main className="hx-ambient min-h-screen text-[var(--txt)]">
      <AdminNav />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-1 flex items-center gap-2">
          <Link href="/admin/servicos" className="text-sm text-[var(--mut)] hover:text-[var(--txt)]">
            ← Serviços
          </Link>
        </div>
        <h1 className="text-2xl font-extrabold">Formulário · {prod?.name ?? slug}</h1>
        <p className="mt-1 mb-6 text-sm text-[var(--mut)]">
          Estas são as perguntas do briefing deste produto. Edite, reordene, adicione ou remova.
          Depois isso alimenta a ficha que o cliente preenche.
        </p>

        {def ? (
          <FormBuilder slug={slug} tituloInicial={titulo} camposIniciais={campos} />
        ) : (
          <div className="hx-glass p-8 text-center text-[var(--mut)]">
            Este produto ainda não tem um formulário definido.
          </div>
        )}
      </div>
    </main>
  );
}
