type Status = "feito" | "andamento" | "afazer";
type Fase = { n: string; titulo: string; origem: string; status: Status; prog: number; entregas: string[]; prazo: string };

const COR: Record<Status, string> = { feito: "var(--green)", andamento: "var(--accent)", afazer: "var(--dim)" };
const ROTULO: Record<Status, string> = { feito: "Entregue", andamento: "Em andamento", afazer: "A fazer" };

const FASES: Fase[] = [
  {
    n: "0", titulo: "Fundação da plataforma", origem: "Hashes", status: "feito", prog: 100,
    entregas: ["Next.js + Supabase + design system (tokens, vidro, glow)", "Login, papéis e RLS", "Catálogo lendo do banco"],
    prazo: "Concluído",
  },
  {
    n: "1", titulo: "Produtos, agentes e integrações", origem: "Hashes", status: "feito", prog: 100,
    entregas: ["Catálogo + páginas de produto + briefing", "Agentes (Léo, Lara, Nina, Alan) com persona, skills e avaliações", "CRM de clientes, WhatsApp (uazapi), diagnóstico do Google Meu Negócio"],
    prazo: "Concluído",
  },
  {
    n: "2", titulo: "Motor operacional Expand — Entrega", origem: "Expand", status: "feito", prog: 100,
    entregas: ["Meu Dia, Carteira, Perfis, Board, Fluxograma (etapas + agentes ⚡), Contrato, Ritmo", "Login por pessoa (equipe) + 'ver como'", "Tarefa por-arquivo: upload no Storage + aprovação (cliente ou gestor)", "Portal do cliente (acompanhamento, aprovações)"],
    prazo: "Concluído",
  },
  {
    n: "3", titulo: "Comercial — Método 3F (Henrique Toledo)", origem: "Expand", status: "andamento", prog: 85,
    entregas: ["Cockpit, Playbook 3F, Funis, Objeções — a Lara na prospecção", "Skill + agente advisor do Henrique", "Falta: biblioteca completa do Henrique (aguardando o texto dos livros) e o chat de IA"],
    prazo: "~1 semana após o texto do Henrique",
  },
  {
    n: "4", titulo: "Unificação, acesso e time único", origem: "Expand", status: "feito", prog: 100,
    entregas: [
      "Expand como padrão · Home pública · /produtos (catálogo) · /cliente · CRUD de produtos · Hashes preservada em /hashes",
      "Equipe & Agentes num menu só: perfis-portfólio (foto, bio, hard/soft/ferramentas) com CRUD próprio; agentes com prompt real (.md) + memória + base de conhecimento/RAG",
      "Organograma em fluxo (chapéus editáveis) e Squads por projeto",
      "Estilo editável (verde/dourado) e Integrações dentro do Expand",
    ],
    prazo: "Concluído",
  },
  {
    n: "5", titulo: "Gestão e processo no banco", origem: "Expand", status: "feito", prog: 100,
    entregas: [
      "Painel Gestão estilo Monday: KPIs (execução, atraso por SLA, aprovações, concluídas), 3 vistas (por conta, kanban por status, por pessoa/agente) e filtros",
      "PIDE cadastrado como produto (modalidades Anual e Semestral, mesma esteira) com processo no banco — 15 fases / 68 etapas editáveis em /expand/produtos/pide/processo",
      "Todos os 8 produtos com processo próprio no banco (fases → tarefas), no mesmo padrão do PIDE",
      "A operação passa a instanciar a esteira de cada conta a partir do processo do produto",
    ],
    prazo: "Concluído",
  },
  {
    n: "6", titulo: "Painel do cliente unificado", origem: "Expand + Hashes", status: "feito", prog: 100,
    entregas: [
      "/cliente é o painel único no tema Expand: card do PIDE + serviços contratados (orders); painel azul antigo aposentado",
      "Acesso do cliente real ao portal do PIDE com privacidade — view segura (nome/fase/contrato) + RLS por conta; scores internos nunca expostos",
      "Gerente de Projetos (PMO) assumiu a governança do roadmap, medição de resultados e squads, em parceria com Pedro e Ana",
    ],
    prazo: "Concluído",
  },
  {
    n: "7", titulo: "SaaS, dados e publicação", origem: "Expand", status: "andamento", prog: 40,
    entregas: [
      "Build de produção validado + repositório e guia de deploy prontos (Vercel + GitHub) — falta só conectar a conta e subir",
      "Contas reais de cliente + níveis de acesso completos (RLS do portal já entregue)",
      "Falta: chat de IA do Henrique (RAG), Financeiro (/admin/financas) + agente financeiro, domínio próprio e billing/LGPD",
    ],
    prazo: "Deploy nesta semana · restante ~2 semanas",
  },
];

// Backlog enxuto — melhorias registradas para não perder, sem inflar o sistema agora.
const MELHORIAS: { t: string; d: string }[] = [
  { t: "Modalidade por conta (Anual / Semestral)", d: "Campo em expand_clientes para o painel de Gestão filtrar e contar por modalidade. Hoje o PIDE é um produto único e a distinção vive só na descrição." },
  { t: "Prazo/SLA real por etapa", d: "Um prazo numérico por etapa deixa o semáforo de atraso exato. Hoje o atraso é estimado do SLA em texto (best-effort: dias/horas)." },
  { t: "Upload de foto nos perfis", d: "Subir a foto da equipe direto pela plataforma (Storage). Hoje a foto entra por URL." },
  { t: "Processo próprio dos demais produtos", d: "Clonar a estrutura de fases/etapas do PIDE como ponto de partida editável para os outros produtos (leads, GBP, thumbnails). O motor já lê o processo do produto." },
  { t: "Notificações e automações", d: "Avisar o responsável quando a etapa vira dele ou quando o SLA está estourando; disparos no WhatsApp/e-mail." },
];

export default function Roadmap() {
  const geral = Math.round(FASES.reduce((s, f) => s + f.prog, 0) / FASES.length);
  const feitas = FASES.filter((f) => f.status === "feito").length;

  return (
    <>
      <p className="hx-eyebrow">Entregas & prazos</p>
      <h1 className="ex-h1">Roadmap do <span className="hx-accent-text">projeto</span></h1>
      <p className="ex-sub">O que já foi construído (na Hashes e na Expand) e o que vem pela frente, com prazo estimado. Reúne tudo que fizemos e as novas demandas da Expand num plano só.</p>

      <div className="hx-glass" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, borderLeft: "3px solid var(--accent)" }}>
        <span style={{ fontWeight: 700, color: "var(--txt)" }}>Governança</span>
        <span style={{ color: "var(--mut)" }}>Sob o <a href="/expand/equipe/gerente-projetos" style={{ color: "var(--accent)", textDecoration: "none" }}>Gerente de Projetos (PMO)</a> + Ana</span>
        <span style={{ color: "var(--dim)" }}>· última revisão <b style={{ color: "var(--mut)" }}>06/08/2026</b></span>
        <span style={{ color: "var(--dim)" }}>· revisado a cada entrega e no fechamento do ciclo</span>
      </div>

      <div className="ex-kpis">
        <div className="ex-kpi hx-glass"><div className="lab">Progresso geral</div><div className="val hx-accent-text">{geral}%</div><div className="foot">Média das fases</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Fases concluídas</div><div className="val">{feitas}/{FASES.length}</div><div className="foot">Base sólida entregue</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Foco atual</div><div className="val" style={{ fontSize: 16, color: "var(--accent)" }}>SaaS & deploy</div><div className="foot">Contas reais, billing, domínio</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Próximo grande passo</div><div className="val" style={{ fontSize: 15 }}>Publicação</div><div className="foot">Deploy Vercel/VPS + domínio</div></div>
      </div>

      <div style={{ marginTop: 8 }}>
        {FASES.map((f) => (
          <div key={f.n} className="ex-fase hx-glass" style={{ marginBottom: 12 }}>
            <div className="ex-faseh">
              <div className="ex-fasen" style={{ background: f.status === "afazer" ? "var(--panel-2)" : `color-mix(in srgb, ${COR[f.status]} 22%, transparent)`, color: COR[f.status] }}>{f.n}</div>
              <div className="ex-fasetit">
                <div className="nm">{f.titulo} <span className="ex-chip" style={{ marginLeft: 6, ["--ac" as string]: "var(--accent)" }}>{f.origem}</span></div>
                <div className="mt">{f.prazo}</div>
              </div>
              <span className="ex-stat" style={{ background: `color-mix(in srgb, ${COR[f.status]} 15%, transparent)`, color: COR[f.status] }}>{ROTULO[f.status]}</span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--dim)", marginLeft: 4 }}>{f.prog}%</span>
            </div>
            <div style={{ padding: "0 17px" }}>
              <div style={{ height: 6, borderRadius: 4, background: "var(--panel-2)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${f.prog}%`, background: COR[f.status], borderRadius: 4 }} />
              </div>
            </div>
            <div style={{ padding: "12px 17px 16px 17px", display: "flex", flexDirection: "column", gap: 6 }}>
              {f.entregas.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5 }}>
                  <span style={{ color: COR[f.status], flexShrink: 0 }}>•</span> {e}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="ex-grph" style={{ marginTop: 22 }}><span className="gt">Melhorias planejadas</span><span className="gc">{MELHORIAS.length}</span><span className="gl" /></div>
      <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 12, lineHeight: 1.55 }}>Anotações para não perder — decidimos manter o sistema <b>enxuto por hora</b> e trazer estas melhorias quando fizerem falta na operação.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10 }}>
        {MELHORIAS.map((m, i) => (
          <div key={i} className="hx-glass" style={{ padding: "13px 15px", borderRadius: 12, borderLeft: "3px solid var(--accent)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", marginBottom: 5 }}>{m.t}</div>
            <div style={{ fontSize: 11.8, color: "var(--mut)", lineHeight: 1.5 }}>{m.d}</div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 20, fontSize: 11.5, color: "var(--dim)" }}>Prazos são estimativas de execução (o desenvolvimento roda no plano do Claude Code). A complexidade atual já entrega um sistema operacional completo; o que falta é unificação de experiência e as camadas de SaaS.</p>
    </>
  );
}
