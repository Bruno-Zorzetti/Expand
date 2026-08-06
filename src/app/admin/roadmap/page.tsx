import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

type Status = "feito" | "andamento" | "afazer";
type Fase = {
  n: string;
  titulo: string;
  status: Status;
  progresso: number;
  entregaveis: string[];
  prazo: string;
  custo: string;
};

const COR: Record<Status, string> = {
  feito: "#31D0AA",
  andamento: "#5AA0FF",
  afazer: "#63708c",
};
const ROTULO: Record<Status, string> = {
  feito: "Entregue",
  andamento: "Em andamento",
  afazer: "A fazer",
};

const FASES: Fase[] = [
  {
    n: "0",
    titulo: "Fundação",
    status: "feito",
    progresso: 100,
    entregaveis: ["Next.js + Supabase + design system", "Catálogo lendo do banco"],
    prazo: "Concluído",
    custo: "Grátis (tier free Supabase + dev local)",
  },
  {
    n: "1",
    titulo: "Núcleo da plataforma",
    status: "feito",
    progresso: 100,
    entregaveis: ["Login/cadastro + RLS multi-cliente", "Briefing, painel do cliente, admin/kanban"],
    prazo: "Concluído",
    custo: "Incluído",
  },
  {
    n: "2",
    titulo: "Google Meu Negócio completo",
    status: "feito",
    progresso: 100,
    entregaveis: [
      "Localizador + diagnóstico (Health Score, concorrentes, mapa)",
      "Diagnóstico reworkado: 2 categorias, avaliações reais, tom consultivo",
      "PDF com captura de lead, CTAs de WhatsApp (reunião/plano)",
    ],
    prazo: "Concluído",
    custo: "Apify por uso: ~R$0,02/localização · ~R$0,10–0,20/diagnóstico",
  },
  {
    n: "3",
    titulo: "Marca, agentes e páginas premium",
    status: "andamento",
    progresso: 55,
    entregaveis: [
      "Design system + temas + frameworks de página (feito)",
      "Páginas dos agentes (persona, skills, avaliações) + serviço premium (feito)",
      "Cockpits de produção da equipe por produto (a fazer)",
    ],
    prazo: "~4–6 dias (cockpits)",
    custo: "Sem novo custo fixo",
  },
  {
    n: "4",
    titulo: "Integrações + CRM + Finanças",
    status: "andamento",
    progresso: 55,
    entregaveis: [
      "WhatsApp (uazapi) + conexão por QR + notificações (feito)",
      "CRM/Clientes + envio de briefing por WhatsApp (feito)",
      "GBP API (aguarda Google) · Canva · painel de Finanças (a fazer)",
    ],
    prazo: "~1–2 semanas (parte depende do Google)",
    custo: "uazapi mensal · GBP API grátis (cota) · Canva (seu plano)",
  },
  {
    n: "5",
    titulo: "Camadas SaaS + Deploy",
    status: "afazer",
    progresso: 15,
    entregaveis: [
      "Config/Frameworks + logo do cliente (feito)",
      "Billing/planos, LGPD, audit log (a fazer)",
      "Deploy no Vercel (no ar 24/7, domínio próprio)",
    ],
    prazo: "~1 semana + deploy",
    custo: "Vercel/Supabase Pro ao escalar (~US$25/mês cada, opcional)",
  },
];

export default async function RoadmapAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role)) redirect("/dashboard");

  const total = FASES.length;
  const feitos = FASES.filter((f) => f.status === "feito").length;
  const geral = Math.round(FASES.reduce((s, f) => s + f.progresso, 0) / total);

  return (
    <main className="hx-ambient min-h-screen text-[#EAF0FA]">
      <AdminNav />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="hx-eyebrow">Acompanhamento do projeto</p>
        <h1 className="mt-1 text-3xl font-extrabold">
          Roadmap <span className="hx-accent-text">da plataforma</span>
        </h1>
        <p className="mt-2 text-sm text-[#8B96AC]">
          Prazo e custo de cada fase, pra você acompanhar se estamos entregando na direção certa.
          Datas são estimativas de execução; o desenvolvimento roda no plano do Claude Code.
        </p>

        {/* Resumo */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="hx-glass p-4 text-center">
            <div className="text-2xl font-extrabold hx-accent-text">{geral}%</div>
            <div className="text-xs text-[#8B96AC]">Progresso geral</div>
          </div>
          <div className="hx-glass p-4 text-center">
            <div className="text-2xl font-extrabold">{feitos}/{total}</div>
            <div className="text-xs text-[#8B96AC]">Fases concluídas</div>
          </div>
          <div className="hx-glass p-4 text-center">
            <div className="text-2xl font-extrabold text-[#5AA0FF]">GMN</div>
            <div className="text-xs text-[#8B96AC]">Foco atual</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-8 space-y-4">
          {FASES.map((f) => (
            <div key={f.n} className="hx-glass hx-glass-hover p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                  style={{ background: `${COR[f.status]}22`, color: COR[f.status] }}
                >
                  {f.n}
                </span>
                <h2 className="text-lg font-bold">{f.titulo}</h2>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ background: `${COR[f.status]}1f`, color: COR[f.status] }}
                >
                  {ROTULO[f.status]}
                </span>
                <span className="ml-auto font-mono text-xs text-[#63708c]">{f.progresso}%</span>
              </div>

              {/* barra */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#1E2740]">
                <div className="h-full rounded-full" style={{ width: `${f.progresso}%`, background: COR[f.status] }} />
              </div>

              <ul className="mt-3 space-y-1 text-sm text-[#c3d0e6]">
                {f.entregaveis.map((e) => (
                  <li key={e} className="flex gap-2">
                    <span style={{ color: COR[f.status] }}>•</span> {e}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/5 pt-3 text-sm">
                <div>
                  <span className="hx-eyebrow">Prazo</span>
                  <p className="font-semibold">{f.prazo}</p>
                </div>
                <div>
                  <span className="hx-eyebrow">Custo</span>
                  <p className="text-[#c3d0e6]">{f.custo}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-[#63708c]">
          Custo = ferramentas e operação (Apify, WhatsApp, hospedagem). Preço/posicionamento e
          aprovações de peças externas são decisão sua. Ver folha de estilo em{" "}
          <Link href="/estilo" className="text-[#5AA0FF] hover:underline">/estilo</Link>.
        </p>
      </div>
    </main>
  );
}
