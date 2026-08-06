import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import GmnBriefing from "@/components/GmnBriefing";
import { pipelineDe } from "@/lib/pipelines";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChatForm from "@/components/ChatForm";

const GENERICO = [
  { id: "negocio", tipo: "texto", label: "Qual o nome do seu negócio?", obrigatorio: true },
  { id: "contato", tipo: "texto", label: "Seu WhatsApp ou e-mail?", obrigatorio: true, ajuda: "Pra gente te atualizar." },
  { id: "observacoes", tipo: "paragrafo", label: "O que você precisa?", ajuda: "Conte o essencial do que espera." },
];

export default async function BriefingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/produtos/${slug}/briefing`);

  const { data: p } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!p) notFound();

  const pid = p.id as string;
  const pslug = p.slug as string;
  const pcockpit = (p.cockpit as string) ?? "";

  async function criarPedido(dados: Record<string, unknown>) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: novo } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: pid,
        product_slug: pslug,
        dados,
      })
      .select("id")
      .single();

    // Toda ordem já nasce com a esteira do produto (acompanhamento imediato)
    if (novo?.id) {
      const base = pipelineDe(pcockpit);
      await supabase.from("order_etapas").insert(
        base.map((e, i) => ({
          order_id: novo.id,
          ordem: i + 1,
          nome: e.nome,
          responsavel: e.responsavel,
          status: i === 0 ? "concluido" : i === 1 ? "andamento" : "pendente",
        })),
      );
    }

    if (pslug === "google-meu-negocio" && novo?.id) {
      redirect(`/diagnostico/${novo.id}`);
    }
    if (novo?.id) redirect(`/projeto/${novo.id}`);
    redirect("/dashboard");
  }

  return (
    <main className="hx-ambient flex min-h-screen flex-col text-[var(--txt)]">
      <SiteHeader />
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
        <Link href={`/produtos/${slug}`} className="text-sm text-[var(--mut)] hover:text-[var(--txt)]">
          ← {p.name}
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold">Vamos começar seu {p.name}</h1>
        <p className="mt-2 text-[var(--mut)]">
          Responda no seu ritmo. A IA da Hashes começa a produzir a partir daqui.
        </p>

        <div className="mt-8">
          {p.cockpit === "gmn" ? (
            <GmnBriefing productId={pid} productSlug={pslug} action={criarPedido} />
          ) : (
            <ChatForm
              orderId="novo"
              campos={GENERICO}
              respostasIniciais={{}}
              action={criarPedido}
              intro="Bora começar! Três perguntas rápidas e seu projeto entra na esteira."
              labelEnvio="Começar meu projeto"
              fimTexto="Confira e envie — seu projeto começa agora."
            />
          )}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
