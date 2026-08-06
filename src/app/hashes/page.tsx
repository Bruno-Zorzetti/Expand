import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Icon from "@/components/Icon";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  price: number | null;
  preco_setup: number | null;
  preco_mensal: number | null;
  recorrente: boolean;
  delivery: string | null;
  popular: boolean;
};

function precoLabel(p: Product): { rotulo: string; valor: string; sub: string | null } {
  const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;
  if (p.recorrente && p.preco_mensal) {
    return {
      rotulo: "Investimento",
      valor: `${brl(p.preco_mensal)}/mês`,
      sub: p.preco_setup ? `+ ${brl(p.preco_setup)} setup` : null,
    };
  }
  if (p.price) return { rotulo: "Investimento", valor: brl(Number(p.price)), sub: null };
  return { rotulo: "Entrega", valor: p.delivery ?? "", sub: null };
}

export default async function HashesHome() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  const products = (data ?? []) as Product[];

  return (
    <main className="hx-ambient flex min-h-screen flex-col text-[var(--txt)]">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
          Catálogo Premium · IA executando agora
        </p>
        <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-black leading-[1.03] tracking-tight sm:text-7xl">
          IA que entrega{" "}
          <span className="hx-accent-text">resultados</span>,<br className="hidden sm:block" /> não promessas.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[var(--mut)]">
          Serviços de IA prontos para uso: leads, thumbnails, inteligência de mercado,
          presença no Google e mais, entregues em horas, não semanas.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#catalogo" className="hx-btn hx-btn-primary px-7 py-3">Ver catálogo</a>
          <Link href="/contato" className="hx-btn hx-btn-ghost px-7 py-3">Falar com a gente</Link>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/art/hero-3d.png"
          alt="Arte 3D Hashes"
          className="mx-auto mt-14 w-full max-w-4xl rounded-3xl border border-[var(--line)]"
          style={{ boxShadow: "0 0 90px color-mix(in srgb, var(--accent) 20%, transparent)" }}
        />
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <h2 className="mb-6 text-center text-2xl font-bold">Como funciona</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "Você preenche o briefing", d: "Um formulário rápido e guiado conta o essencial do que você precisa." },
            { n: "2", t: "A IA produz, a equipe cuida", d: "Nossos agentes de IA geram a entrega e a equipe faz a curadoria e o QA." },
            { n: "3", t: "Você aprova e acompanha", d: "Aprova cada etapa e acompanha tudo em tempo real no seu painel." },
          ].map((s) => (
            <div key={s.n} className="hx-glass p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl hx-accent text-lg font-black text-white">{s.n}</span>
              <p className="mt-3 font-bold">{s.t}</p>
              <p className="mt-1 text-sm text-[var(--mut)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="catalogo" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-6 flex items-baseline gap-3">
          <h2 className="text-2xl font-bold">Escolha seu próximo resultado</h2>
          <span className="font-mono text-xs text-[var(--dim)]">
            {products.length} disponíveis
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <article key={p.id} className="hx-glass hx-glass-hover flex flex-col p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-md border border-[var(--line-2)] bg-[var(--panel-2)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--mut)]">
                  {p.category}
                </span>
                {p.popular && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] px-2 py-1 text-[10px] font-bold text-[var(--accent)]">
                    <Icon name="star" size={11} /> Popular
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="mt-1 flex-1 text-sm text-[var(--mut)]">{p.tagline}</p>
              <div className="mt-4 flex items-end justify-between">
                {(() => {
                  const pr = precoLabel(p);
                  return (
                    <div>
                      <p className="font-mono text-[10px] uppercase text-[var(--dim)]">{pr.rotulo}</p>
                      <p className="text-xl font-extrabold">{pr.valor}</p>
                      {pr.sub && <p className="text-[10px] text-[var(--dim)]">{pr.sub}</p>}
                    </div>
                  );
                })()}
                <a href={`/produtos/${p.slug}`} className="hx-btn hx-btn-primary text-sm">
                  Começar
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA contato */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="hx-glass flex flex-col items-center gap-3 p-12 text-center" style={{ boxShadow: "0 0 80px color-mix(in srgb, var(--accent) 26%, transparent)" }}>
          <p className="hx-eyebrow">Vamos cooperar</p>
          <h2 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Não sabe por onde <span className="hx-accent-text">começar?</span>
          </h2>
          <p className="max-w-md text-[var(--mut)]">Conta seu objetivo e a Hashes indica o melhor caminho.</p>
          <Link href="/contato" className="hx-btn hx-btn-primary mt-4 px-8 py-3.5 text-base">Falar com a Hashes</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
