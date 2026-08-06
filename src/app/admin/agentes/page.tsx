import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import AgenteEditor from "@/components/AgenteEditor";
import { AGENTES } from "@/lib/agentes";

type Review = { cliente: string; texto: string; nota: number };

export default async function AgentesAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role)) redirect("/dashboard");

  const { data: cfgs } = await supabase.from("agente_config").select("slug, ranking, nota, reviews");
  const byslug = new Map((cfgs ?? []).map((c) => [c.slug, c]));

  return (
    <main className="hx-ambient min-h-screen text-[var(--txt)]">
      <AdminNav />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="hx-eyebrow">Configurações · Agentes</p>
        <h1 className="mt-1 text-2xl font-extrabold">Avaliações e ranking dos agentes</h1>
        <p className="mt-1 mb-6 text-sm text-[var(--mut)]">
          Troque as avaliações ilustrativas pelas reais. Aparecem na página de cada agente.
          O nº de trabalhos é calculado automaticamente dos pedidos.
        </p>
        <div className="space-y-5">
          {AGENTES.map((a) => {
            const c = byslug.get(a.slug);
            const reviews = (Array.isArray(c?.reviews) && c!.reviews.length ? c!.reviews : a.reviews) as Review[];
            return (
              <AgenteEditor
                key={a.slug}
                slug={a.slug}
                nome={a.nome}
                cor={a.cor}
                rankingInicial={c?.ranking ?? a.ranking}
                notaInicial={c?.nota != null ? Number(c.nota) : a.nota}
                reviewsIniciais={reviews}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}
