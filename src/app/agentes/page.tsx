import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Icon from "@/components/Icon";
import NeuralBg from "@/components/NeuralBg";
import { AGENTES } from "@/lib/agentes";

export default function AgentesPage() {
  return (
    <main className="hx-ambient flex min-h-screen flex-col text-[var(--txt)]">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <div className="text-center">
          <p className="hx-eyebrow">Nossa equipe de IA</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-5xl font-black leading-[1.03] tracking-tight sm:text-7xl">
            Especialistas com <span className="hx-accent-text">nome</span>, não IA genérica.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[var(--mut)]">
            Cada agente domina uma área, usa ferramentas de ponta e é avaliado pelos clientes.
            Você acompanha o trabalho e aprova cada etapa.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {AGENTES.map((a) => (
            <Link
              key={a.slug}
              href={`/agentes/${a.slug}`}
              className="hx-glass hx-glass-hover relative overflow-hidden p-6"
              style={{ boxShadow: `0 0 50px color-mix(in srgb, ${a.cor} 16%, transparent)` }}
            >
              <NeuralBg cor={a.cor} className="opacity-40" />
              <div className="relative flex items-start gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${a.cor}, ${a.cor2})`, boxShadow: `0 0 24px ${a.cor}` }}>
                  <Icon name={a.icon} size={30} className="hx-icon-glow" />
                </span>
                <div className="min-w-0">
                  <p className="text-2xl font-black">{a.nome}</p>
                  <p className="text-sm font-semibold" style={{ color: a.cor }}>{a.area}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--mut)]">{a.tagline}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-[var(--dim)]">
                    <span className="flex items-center gap-1"><Icon name="star" size={12} style={{ color: a.cor }} /> {a.nota.toFixed(1)}</span>
                    <span>{a.ranking}</span>
                  </div>
                </div>
                <Icon name="arrowRight" size={18} className="ml-auto shrink-0" style={{ color: a.cor }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
