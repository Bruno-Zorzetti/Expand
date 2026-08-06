import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Icon from "@/components/Icon";

const AGENTE: Record<string, { nome: string; papel: string; icon: string }> = {
  gmn: { nome: "Léo", papel: "Especialista em Google Meu Negócio e SEO local", icon: "pin" },
  leads: { nome: "Lara", papel: "Especialista em leads e inteligência de dados", icon: "target" },
  ebook: { nome: "Alan", papel: "Especialista em conteúdo e materiais de autoridade", icon: "chart" },
  thumbnail: { nome: "Nina", papel: "Especialista em thumbnails de alto CTR", icon: "play" },
};
const ENTREGA: Record<string, string[]> = {
  gmn: ["Perfil otimizado rumo ao TOP 3 do mapa", "Diagnóstico com Health Score e plano", "Posts e gestão de avaliações", "Acompanhamento e re-score mensal"],
  leads: ["Lista qualificada em planilha (CSV)", "Campos completos e sem duplicados", "Filtro pelo seu ICP", "Métricas de qualidade da base"],
  ebook: ["Ebook diagramado (PDF)", "Landing page + copy de captura", "Estrutura e redação por IA + revisão", "Pronto para lançar"],
  thumbnail: ["Arte de alta conversão por episódio", "Ganchos de título testados", "Variações para escolher", "Export pronto para publicar"],
};
const FAQ = [
  { q: "Quando o prazo começa a contar?", a: "A partir do envio do briefing detalhado — antes disso não há como iniciar a produção." },
  { q: "Eu aprovo antes de publicar?", a: "Sim. Você é o portão de qualidade: aprova cada etapa antes de seguir." },
  { q: "Como acompanho o andamento?", a: "Pelo seu painel, em tempo real, com quem está operando e o que já foi entregue." },
];

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!p) notFound();

  const cockpit = (p.cockpit as string) ?? "";
  const ag = AGENTE[cockpit];
  const entrega = ENTREGA[cockpit] ?? [];

  return (
    <main className="hx-ambient flex min-h-screen flex-col text-[var(--txt)]">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        <p className="hx-eyebrow">{p.category}</p>
        <h1 className="mt-3 text-5xl font-extrabold leading-[1.03] tracking-tight sm:text-6xl">
          {p.name}
        </h1>
        <p className="hx-accent-text mt-4 max-w-2xl text-xl font-extrabold sm:text-2xl">{p.tagline}</p>
        <p className="mt-5 max-w-2xl text-[var(--mut)]">{p.description}</p>

        <div className="hx-glass mt-8 flex flex-wrap items-center gap-6 p-6">
          {(() => {
            const brl = (n: number) => `R$ ${Number(n).toLocaleString("pt-BR")}`;
            const rec = p.recorrente && p.preco_mensal;
            const temPreco = rec || p.price;
            return (
              <>
                <div>
                  <p className="font-mono text-[10px] uppercase text-[var(--dim)]">
                    {temPreco ? "Investimento" : "Entrega"}
                  </p>
                  <p className="text-2xl font-extrabold">
                    {rec ? `${brl(p.preco_mensal)}/mês` : p.price ? brl(p.price) : p.delivery}
                  </p>
                  {rec && p.preco_setup ? (
                    <p className="text-xs text-[var(--dim)]">+ {brl(p.preco_setup)} de setup</p>
                  ) : null}
                </div>
                {temPreco && p.delivery && (
                  <div>
                    <p className="font-mono text-[10px] uppercase text-[var(--dim)]">Prazo</p>
                    <p className="text-lg font-semibold">{p.delivery}</p>
                  </div>
                )}
              </>
            );
          })()}
          <Link
            href={`/produtos/${p.slug}/briefing`}
            className="hx-btn hx-btn-primary ml-auto px-7 py-3"
          >
            Preencher briefing →
          </Link>
        </div>

        {/* O que você recebe */}
        {entrega.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold">O que você recebe</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {entrega.map((e) => (
                <div key={e} className="hx-glass flex items-center gap-3 p-4">
                  <Icon name="check" size={18} className="shrink-0 text-[var(--green)]" />
                  <span className="text-sm">{e}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Como funciona — 3 passos */}
        <section className="mt-16">
          <p className="hx-eyebrow">Como funciona</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Simples do começo ao fim</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { n: "01", t: "Você preenche o briefing", d: "Um formulário rápido e guiado conta o essencial." },
              { n: "02", t: "A IA produz, a equipe cuida", d: "O agente gera a entrega e a equipe faz a curadoria e o QA." },
              { n: "03", t: "Você aprova e recebe", d: "Aprova cada etapa e acompanha tudo no seu painel." },
            ].map((s) => (
              <div key={s.n} className="hx-glass hx-glass-hover p-6">
                <span className="hx-accent-text text-4xl font-black">{s.n}</span>
                <p className="mt-3 font-bold">{s.t}</p>
                <p className="mt-1 text-sm text-[var(--mut)]">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quem produz */}
        {ag && (
          <section className="mt-16">
            <p className="hx-eyebrow">Quem produz</p>
            <div className="hx-glass mt-3 flex items-center gap-4 p-6">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl hx-accent text-white">
                <Icon name={ag.icon} size={30} />
              </span>
              <div>
                <p className="text-xl font-extrabold">{ag.nome}</p>
                <p className="text-sm text-[var(--mut)]">{ag.papel}</p>
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-bold">Perguntas frequentes</h2>
          <div className="mt-4 space-y-2">
            {FAQ.map((f) => (
              <details key={f.q} className="hx-glass p-4">
                <summary className="cursor-pointer list-none font-semibold">{f.q}</summary>
                <p className="mt-2 text-sm text-[var(--mut)]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          className="mt-16 hx-glass overflow-hidden p-12 text-center"
          style={{ boxShadow: "0 0 80px color-mix(in srgb, var(--accent) 26%, transparent)" }}
        >
          <p className="hx-eyebrow">Bora começar</p>
          <h2 className="mt-2 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Seu próximo <span className="hx-accent-text">resultado</span><br />começa agora
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/produtos/${p.slug}/briefing`} className="hx-btn hx-btn-primary px-8 py-3.5 text-base">
              Preencher briefing
            </Link>
            <Link href="/contato" className="hx-btn hx-btn-ghost px-8 py-3.5 text-base">Tirar dúvidas</Link>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
