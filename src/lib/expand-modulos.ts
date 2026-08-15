// Catálogo canônico de módulos do sistema Expand.
// gate = chave usada no nav + no banco (profiles.expand_modulos).
// Admin ignora este sistema — sempre vê tudo.

export type Modulo = {
  gate: string;
  label: string;
  secao: string;
  descricao: string;
};

export const MODULOS: Modulo[] = [
  // ── Tarefas ──────────────────────────────────────────────
  { gate: "tarefas.meudia",    label: "Meu Dia",               secao: "Tarefas",    descricao: "Hub de tarefas do dia" },
  { gate: "tarefas.calendario", label: "Calendário",            secao: "Tarefas",    descricao: "Agenda pessoal" },
  { gate: "tarefas.plano",     label: "Plano de Ação",         secao: "Tarefas",    descricao: "Objetivos e ações estruturadas" },
  { gate: "tarefas.board",     label: "Board de Atividades",   secao: "Tarefas",    descricao: "Kanban das contas" },

  // ── Projetos ─────────────────────────────────────────────
  { gate: "projetos.produtos", label: "Produtos",              secao: "Projetos",   descricao: "Catálogo e processos" },
  { gate: "projetos.equipe",   label: "Equipe",                secao: "Projetos",   descricao: "Humanos e agentes IA" },
  { gate: "projetos.clientes", label: "Clientes",              secao: "Projetos",   descricao: "Carteira e dossiês" },

  // ── Ferramentas ──────────────────────────────────────────
  { gate: "ferramentas.grupos",        label: "Criador de Grupos",        secao: "Ferramentas", descricao: "Grupos de WhatsApp" },
  { gate: "ferramentas.apresentacoes", label: "Criador de Apresentações", secao: "Ferramentas", descricao: "Decks e slides" },
  { gate: "ferramentas.conhecimento",  label: "Biblioteca de Conhecimento", secao: "Ferramentas", descricao: "Playbook, funis, objeções" },

  // ── Comercial ────────────────────────────────────────────
  { gate: "comercial.dashboard", label: "Dashboard Comercial", secao: "Comercial",  descricao: "Visão geral de vendas" },
  { gate: "comercial.funil",     label: "Funil de Vendas",     secao: "Comercial",  descricao: "Pipeline CRM" },
  { gate: "comercial.placar",    label: "Placar",              secao: "Comercial",  descricao: "Gamificação diária" },
  { gate: "comercial.meta",      label: "Meta",                secao: "Comercial",  descricao: "Calculadora de vendas" },
  { gate: "comercial.guia",      label: "Guia",                secao: "Comercial",  descricao: "Guia de uso do sistema" },

  // ── Financeiro ───────────────────────────────────────────
  { gate: "financeiro.dashboard", label: "Dashboard Financeiro", secao: "Financeiro", descricao: "DRE e valuation" },
  { gate: "financeiro.dre",       label: "DRE",                  secao: "Financeiro", descricao: "Demonstrativo de resultados" },
  { gate: "financeiro.metas",     label: "Metas",                secao: "Financeiro", descricao: "Metas financeiras" },
  { gate: "financeiro.realizado", label: "Realizado",            secao: "Financeiro", descricao: "Resultados realizados" },
  { gate: "financeiro.pagar",     label: "A Pagar",              secao: "Financeiro", descricao: "Contas a pagar" },
  { gate: "financeiro.receber",   label: "A Receber",            secao: "Financeiro", descricao: "Contas a receber" },
];

export const MODULOS_BY_GATE = new Map(MODULOS.map((m) => [m.gate, m]));
export const ALL_GATES = MODULOS.map((m) => m.gate);

export const SECOES = [...new Set(MODULOS.map((m) => m.secao))];
