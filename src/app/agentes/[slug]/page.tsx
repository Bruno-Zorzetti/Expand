import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Icon from "@/components/Icon";
import NeuralBg from "@/components/NeuralBg";
import { agentePorSlug, AGENTES } from "@/lib/agentes";

export function generateStaticParams() {
  return AGENTES.map((a) => ({ slug: a.slug }));
}

function Estrelas({ n, cor }: { n: number; cor: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={13} style={{ color: i <= Math.round(n) ? cor : "var(--line-2)" }} />
      ))}
    </span>
  );
}

export default async function AgentePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ag = agentePorSlug(slug);
  if (!ag) notFound();

  const supabase = await createClient();
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .in("product_slug", ag.produtos);
  const trabalhos = count ?? 0;

  const { data: prods } = await supabase
    .from("products")
    .select("slug, name, tagline, price, preco_mensal, recorrente")
    .in("slug", ag.produtos);

  const { data: cfg } = await supabase
    .from("agente_config")
    .select("ranking, nota, reviews")
    .eq("slug", ag.slug)
    .maybeSingle();
  const ranking = cfg?.ranking ?? ag.ranking;
  const nota = cfg?.nota != null ? Number(cfg.nota) : ag.nota;
  const reviews = Array.isArray(cfg?.reviews) && cfg.reviews.length ? (cfg.reviews as typeof ag.reviews) : ag.reviews;

  return (
    <main className="hx-ambient flex min-h-screen flex-col text-[var(--txt)]">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
        {/* Hero persona */}
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="hx-eyebrow" style={{ color: ag.cor }}>Agente de IA · {ag.area}</p>
            <h1 className="mt-3 text-6xl font-black leading-[0.95] tracking-tight sm:text-7xl">{ag.nome}</h1>
            <p className="mt-3 text-xl font-extrabold" style={{ background: `linear-gradient(120deg, ${ag.cor}, ${ag.cor2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              {ag.tagline}
            </p>
            <p className="mt-5 max-w-xl text-[var(--mut)]">{ag.persona}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#produtos" className="hx-btn px-6 py-3 text-white" style={{ background: `linear-gradient(135deg, ${ag.cor}, ${ag.cor2})` }}>Ver o que entrega</Link>
              <Link href="/contato" className="hx-btn hx-btn-ghost px-6 py-3">Falar com a Hashes</Link>
            </div>
          </div>

          {/* Painel neural + stats */}
          <div className="hx-glass relative overflow-hidden p-6" style={{ boxShadow: `0 0 70px color-mix(in srgb, ${ag.cor} 22%, transparent)` }}>
            <NeuralBg cor={ag.cor} />
            <div className="relative flex flex-col items-center py-6">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl text-white" style={{ background: `linear-gradient(135deg, ${ag.cor}, ${ag.cor2})`, boxShadow: `0 0 30px ${ag.cor}` }}>
                <Icon name={ag.icon} size={38} className="hx-icon-glow" />
              </span>
              <div className="mt-6 grid w-full grid-cols-3 gap-2 text-center">
                {[
                  { v: trabalhos, l: "Trabalhos" },
                  { v: nota.toFixed(1), l: "Nota" },
                  { v: ranking, l: "Ranking" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-2">
                    <p className="text-lg font-extrabold leading-tight" style={{ color: ag.cor }}>{s.v}</p>
                    <p className="text-[10px] text-[var(--mut)]">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Funções */}
        <section className="mt-16">
          <p className="hx-eyebrow">O que ele faz</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ag.funcoes.map((f) => (
              <div key={f} className="hx-glass flex items-center gap-2 p-4 text-sm">
                <Icon name="check" size={16} style={{ color: ag.cor }} /> {f}
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="mt-16 grid gap-4 md:grid-cols-2">
          <div className="hx-glass p-6">
            <p className="hx-eyebrow mb-3">Hard skills</p>
            <div className="flex flex-wrap gap-2">
              {ag.hard.map((s) => (
                <span key={s} className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: `color-mix(in srgb, ${ag.cor} 14%, transparent)`, color: ag.cor }}>{s}</span>
              ))}
            </div>
          </div>
          <div className="hx-glass p-6">
            <p className="hx-eyebrow mb-3">Soft skills</p>
            <div className="flex flex-wrap gap-2">
              {ag.soft.map((s) => (
                <span key={s} className="rounded-full border border-[var(--line-2)] px-3 py-1 text-sm">{s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Ferramentas */}
        <section className="mt-16">
          <p className="hx-eyebrow">Ferramentas que usa</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ag.ferramentas.map((t) => (
              <span key={t} className="hx-glass flex items-center gap-2 px-3 py-2 text-sm">
                <Icon name="bolt" size={14} style={{ color: ag.cor }} /> {t}
              </span>
            ))}
          </div>
        </section>

        {/* Produtos */}
        <section id="produtos" className="mt-16">
          <p className="hx-eyebrow">O que ele entrega</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(prods ?? []).map((p) => (
              <Link key={p.slug} href={`/produtos/${p.slug}`} className="hx-glass hx-glass-hover flex items-center justify-between p-5">
                <div>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-sm text-[var(--mut)]">{p.tagline}</p>
                </div>
                <Icon name="arrowRight" size={18} style={{ color: ag.cor }} />
              </Link>
            ))}
          </div>
        </section>

        {/* Avaliações */}
        <section className="mt-16">
          <div className="flex items-center gap-3">
            <p className="hx-eyebrow">Avaliações de clientes</p>
            <span className="flex items-center gap-1 text-sm font-bold"><Estrelas n={nota} cor={ag.cor} /> {nota.toFixed(1)}</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {reviews.map((r, i) => (
              <div key={i} className="hx-glass p-5">
                <Estrelas n={r.nota} cor={ag.cor} />
                <p className="mt-2 text-[var(--txt)]">“{r.texto}”</p>
                <p className="mt-2 text-sm text-[var(--mut)]">— {r.cliente}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fechamento */}
        <section className="mt-16 hx-glass p-12 text-center" style={{ boxShadow: `0 0 80px color-mix(in srgb, ${ag.cor} 24%, transparent)` }}>
          <p className="hx-eyebrow" style={{ color: ag.cor }}>Bora começar</p>
          <h2 className="mt-2 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
            Deixa o {ag.nome} <span style={{ background: `linear-gradient(120deg, ${ag.cor}, ${ag.cor2})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>trabalhar por você</span>
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {(prods ?? [])[0] && (
              <Link href={`/produtos/${(prods ?? [])[0].slug}/briefing`} className="hx-btn px-8 py-3.5 text-base text-white" style={{ background: `linear-gradient(135deg, ${ag.cor}, ${ag.cor2})` }}>
                Começar agora
              </Link>
            )}
            <Link href="/agentes" className="hx-btn hx-btn-ghost px-8 py-3.5 text-base">Ver outros agentes</Link>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
