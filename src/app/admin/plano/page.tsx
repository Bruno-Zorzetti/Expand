import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { PIPELINES, RESP_ICON } from "@/lib/pipelines";
import Icon from "@/components/Icon";

type Agente = { nome: string; papel: string; icon: string; cor: string };

const ORQUESTRADOR: Agente = { nome: "Bruno", papel: "Orquestrador", icon: "compass", cor: "#5AA0FF" };

const AGENTES: Agente[] = [
  { nome: "Léo", papel: "Google Meu Negócio / SEO Local", icon: "pin", cor: "#2F80FF" },
  { nome: "Lara", papel: "Leads & Inteligência (Apify)", icon: "target", cor: "#31D0AA" },
  { nome: "Nina", papel: "Thumbnails YouTube", icon: "play", cor: "#FF7A59" },
  { nome: "Alan", papel: "Apresentações / Ebooks", icon: "chart", cor: "#7A5CFF" },
  { nome: "Sofia", papel: "Social Media", icon: "share", cor: "#FF5D8F" },
  { nome: "Daniel", papel: "Designer", icon: "pen", cor: "#FFB25A" },
  { nome: "Max", papel: "Mídia / IA", icon: "bolt", cor: "#5AA0FF" },
  { nome: "Pedro", papel: "Desenvolvedor", icon: "code", cor: "#10B981" },
];

// Produto (cockpit) -> agente de IA responsável + produtos cobertos
const FLUXOS: { cockpit: string; titulo: string; agente: string; produtos: string; cor: string }[] = [
  { cockpit: "gmn", titulo: "Google Meu Negócio", agente: "Léo", produtos: "Perfil local no TOP 3", cor: "#2F80FF" },
  { cockpit: "leads", titulo: "Leads & Inteligência", agente: "Lara", produtos: "Leads · Inteligência · Audiência · Produtos", cor: "#31D0AA" },
  { cockpit: "ebook", titulo: "Ebook de Autoridade", agente: "Alan", produtos: "Ebook + landing + captação", cor: "#7A5CFF" },
  { cockpit: "thumbnail", titulo: "Thumbnails", agente: "Nina", produtos: "Thumbnail Podcast · Setup", cor: "#FF7A59" },
];

const RESP_NOME: Record<string, string> = { cliente: "Você", equipe: "Equipe", ia: "IA" };

function AgenteCard({ a, destaque }: { a: Agente; destaque?: boolean }) {
  return (
    <div className="hx-glass hx-glass-hover flex items-center gap-3 p-4" style={destaque ? { borderColor: `color-mix(in srgb, ${a.cor} 50%, transparent)` } : undefined}>
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${a.cor} 18%, transparent)`, color: a.cor }}
      >
        <Icon name={a.icon} size={22} />
      </span>
      <div className="min-w-0">
        <p className="font-bold" style={{ color: a.cor }}>{a.nome}</p>
        <p className="truncate text-xs text-[var(--mut)]">{a.papel}</p>
      </div>
    </div>
  );
}

export default async function PlanoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role)) redirect("/dashboard");

  return (
    <main className="hx-ambient min-h-screen text-[var(--txt)]">
      <AdminNav />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="hx-eyebrow">Plano de execução</p>
        <h1 className="mt-1 text-3xl font-extrabold">
          Fluxo do projeto & <span className="hx-accent-text">organograma</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--mut)]">
          Como cada projeto flui — da entrada do cliente à entrega — e qual agente responde por cada
          atividade. É o mapa que garante que nada é feito de qualquer jeito.
        </p>

        {/* Organograma da equipe */}
        <h2 className="mt-10 text-lg font-bold">Equipe de agentes</h2>
        <div className="mt-4 flex flex-col items-center">
          <div className="w-full max-w-xs">
            <AgenteCard a={ORQUESTRADOR} destaque />
          </div>
          <div className="my-3 h-6 w-px bg-[var(--line-2)]" />
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTES.map((a) => (
              <AgenteCard key={a.nome} a={a} />
            ))}
          </div>
          <div className="mt-3 grid w-full gap-3 sm:grid-cols-2">
            <AgenteCard a={{ nome: "Equipe humana", papel: "Curadoria, QA, publicação, verificação", icon: "users", cor: "#8B96AC" }} />
            <AgenteCard a={{ nome: "Cliente", papel: "Briefing e aprovações (portão de qualidade)", icon: "briefcase", cor: "#FFC24B" }} />
          </div>
        </div>

        {/* Esqueleto comum */}
        <h2 className="mt-12 text-lg font-bold">Esqueleto de todo projeto</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {["Briefing", "Produção", "Aprovação", "Entrega", "Acompanhamento"].map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2">
              <span className="hx-glass px-4 py-2 text-sm font-semibold">{s}</span>
              {i < arr.length - 1 && <span className="text-[var(--dim)]">→</span>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--mut)]">
          <span className="flex items-center gap-1.5">
            <Icon name="briefcase" size={13} className="text-[var(--warn)]" /> Cliente — briefing e aprovação
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="cpu" size={13} className="text-[var(--accent)]" /> IA — dados, 1ª versão, volume
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="users" size={13} className="text-[var(--mut)]" /> Equipe — curadoria, QA, publicação
          </span>
        </div>

        {/* Fluxo por produto */}
        <h2 className="mt-12 text-lg font-bold">Fluxo por produto (atividade → agente)</h2>
        <div className="mt-4 space-y-4">
          {FLUXOS.map((f) => {
            const etapas = PIPELINES[f.cockpit] ?? [];
            return (
              <div key={f.cockpit} className="hx-glass p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.cor }} />
                  <h3 className="font-bold">{f.titulo}</h3>
                  <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: `color-mix(in srgb, ${f.cor} 16%, transparent)`, color: f.cor }}>
                    Agente {f.agente}
                  </span>
                  <span className="ml-auto text-xs text-[var(--mut)]">{f.produtos}</span>
                </div>

                <div className="mt-4 flex items-stretch gap-1 overflow-x-auto pb-1">
                  {etapas.map((e, i) => {
                    const nomeResp = e.responsavel === "ia" ? f.agente : RESP_NOME[e.responsavel];
                    return (
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-40 shrink-0 rounded-xl border border-[var(--line-2)] bg-[var(--panel-2)] p-3">
                          <p className="hx-eyebrow">Etapa {i + 1}</p>
                          <p className="mt-1 text-sm font-semibold leading-tight">{e.nome}</p>
                          <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: e.responsavel === "cliente" ? "#FFC24B" : e.responsavel === "equipe" ? "#8B96AC" : f.cor }}>
                            <Icon name={RESP_ICON[e.responsavel]} size={13} /> {nomeResp}
                          </p>
                        </div>
                        {i < etapas.length - 1 && <span className="text-[var(--dim)]">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-xs text-[var(--dim)]">
          Este fluxo alimenta o acompanhamento do cliente (as etapas em <span className="font-mono">/projeto/[id]</span>) e o
          cronograma em <Link href="/admin/roadmap" className="text-[var(--accent)] hover:underline">/admin/roadmap</Link>.
        </p>
      </div>
    </main>
  );
}
