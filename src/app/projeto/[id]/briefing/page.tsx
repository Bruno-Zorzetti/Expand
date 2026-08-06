import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import ChatForm from "@/components/ChatForm";

type Campo = { id: string; tipo: string; label: string; obrigatorio?: boolean; ajuda?: string; opcoes?: string[] };
const PAGOS = ["confirmado", "pago", "producao", "entregue"];

export default async function BriefingProjetoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projeto/${id}/briefing`);

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, product_slug, user_id")
    .eq("id", id)
    .single();
  if (!order) notFound();

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isStaff = !!me && ["admin", "equipe"].includes(me.role);
  const meu = order.user_id === user.id;
  if (!meu && !isStaff) redirect("/dashboard");

  const liberado = PAGOS.includes(order.status) || isStaff;

  const { data: def } = await supabase
    .from("form_defs")
    .select("titulo, campos")
    .eq("slug", order.product_slug)
    .maybeSingle();
  const { data: brief } = await supabase
    .from("briefings")
    .select("respostas, enviado_at")
    .eq("order_id", id)
    .maybeSingle();

  const campos = (def?.campos ?? []) as Campo[];
  const respostas = (brief?.respostas ?? {}) as Record<string, unknown>;

  async function enviar(resp: Record<string, unknown>) {
    "use server";
    const supabase = await createClient();
    const agora = new Date().toISOString();
    await supabase
      .from("briefings")
      .upsert({ order_id: id, respostas: resp, enviado_at: agora, updated_at: agora });

    // conclui a etapa de briefing e avança a próxima
    const { data: et } = await supabase
      .from("order_etapas")
      .select("id, ordem")
      .eq("order_id", id)
      .ilike("nome", "Briefing detalhado%")
      .maybeSingle();
    if (et) {
      await supabase.from("order_etapas").update({ status: "concluido", updated_at: agora }).eq("id", et.id);
      await supabase.from("etapa_logs").insert({
        etapa_id: et.id,
        order_id: id,
        autor: "Sistema",
        tipo: "sistema",
        texto: "Briefing detalhado enviado pelo cliente. Prazo de entrega iniciado.",
      });
      const { data: prox } = await supabase
        .from("order_etapas")
        .select("id, status")
        .eq("order_id", id)
        .gt("ordem", et.ordem)
        .order("ordem")
        .limit(1)
        .maybeSingle();
      if (prox && prox.status === "pendente") {
        await supabase.from("order_etapas").update({ status: "andamento" }).eq("id", prox.id);
      }
    }
    revalidatePath(`/projeto/${id}`);
    redirect(`/projeto/${id}`);
  }

  return (
    <main className="hx-ambient min-h-screen text-[var(--txt)]">
      <header className="border-b border-[var(--line)]">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-6">
          <span className="font-extrabold tracking-wide">HASHES</span>
          <Link href={`/projeto/${id}`} className="text-sm text-[var(--mut)] hover:text-[var(--txt)]">
            ← Acompanhamento
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="hx-eyebrow">Briefing detalhado</p>
        <h1 className="mt-1 text-2xl font-extrabold">{def?.titulo ?? "Briefing"}</h1>

        {!liberado ? (
          <div className="hx-glass mt-6 p-8 text-center text-[var(--mut)]">
            A ficha detalhada é liberada após a confirmação do pagamento. Assim que estiver tudo certo,
            você preenche aqui e o projeto começa.
          </div>
        ) : campos.length === 0 ? (
          <div className="hx-glass mt-6 p-8 text-center text-[var(--mut)]">
            O formulário deste produto ainda não foi configurado.
          </div>
        ) : (
          <>
            <p className="mt-2 mb-6 text-sm text-[var(--mut)]">
              É rapidinho e a gente vai conversando. Seus arquivos ficam salvos na sua pasta do projeto.
            </p>
            <ChatForm
              orderId={id}
              campos={campos}
              respostasIniciais={respostas}
              action={enviar}
              intro="Oi! Vou te fazer algumas perguntas rápidas pra montar a melhor estratégia do seu projeto. Bora?"
            />
          </>
        )}
      </div>
    </main>
  );
}
