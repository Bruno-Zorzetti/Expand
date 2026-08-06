import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import DiagnosticoView from "@/components/DiagnosticoView";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default async function DiagnosticoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/diagnostico/${id}`);

  const { data: order } = await supabase
    .from("orders")
    .select("id, dados")
    .eq("id", id)
    .single();
  if (!order) notFound();

  const dados = (order.dados ?? {}) as Record<string, unknown>;
  const tipoServico = String(dados.tipo_servico ?? "otimizacao");

  const { data: diag } = await supabase
    .from("diagnosticos")
    .select("dados")
    .eq("order_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: prod } = await supabase
    .from("products")
    .select("preco_setup, preco_mensal")
    .eq("slug", "google-meu-negocio")
    .maybeSingle();
  const precos = {
    setup: Number(prod?.preco_setup ?? 1500),
    mensal: Number(prod?.preco_mensal ?? 500),
  };

  return (
    <main className="hx-ambient flex min-h-screen flex-col text-[var(--txt)]">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <DiagnosticoView
          orderId={id}
          inicial={diag ? (diag.dados as never) : null}
          tipoServico={tipoServico}
          precos={precos}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
