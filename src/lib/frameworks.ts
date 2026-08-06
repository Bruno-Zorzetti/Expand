// Configuração dos frameworks de página (UI + UX) — fonte de verdade do projeto.
// Toda página nova segue o framework do seu tipo. Baseado nas tendências 2026:
// páginas curtas, headline literal, 1 ação por seção, visual como prova.

export type BlocoTipo =
  | "hero" | "passos" | "grid" | "prova" | "cta" | "lista" | "agente" | "faq";
export type Visual = "video-ou-3d" | "hero-3d" | "thumbs" | "screenshot" | "glow-icon" | "nenhum";

export type Bloco = {
  id: string;
  tipo: BlocoTipo;
  titulo: string;
  ux: string; // objetivo do bloco
  ui: string; // como construir
  acao?: string; // 1 CTA (no máximo)
  visual: Visual;
};
export type Framework = {
  pagina: string;
  objetivo: string;
  regra2026: string[];
  blocos: Bloco[];
};

// Regras de UI globais — valem para todos os frameworks (não sobrecarregar)
export const REGRAS_UI = {
  fundo: "hx-ambient (efeito em gradiente na cor do cliente). Nunca imagem de fundo por seção.",
  visualPesado: "No máximo 1 por página — só no hero (vídeo curto em loop OU arte 3D).",
  imagensInternas: "Só como prova (screenshot de entrega real). Nunca decoração.",
  cards: "hx-glass + respiro. Ícones do set (linha) ou glow-tile em destaques.",
  tipografia: "Hero 5xl→7xl com palavra em gradiente (hx-accent-text); seção 3xl→4xl; eyebrow mono.",
  acao: "1 CTA por seção. Primário destacado; secundário fantasma.",
  acento: "Glow/acento na cor do cliente, com moderação.",
  acessibilidade: "Contraste AA, navegação por teclado, fonte ≥16px, sentence case.",
};

export const FRAMEWORKS: Record<"home" | "agente" | "produto", Framework> = {
  home: {
    pagina: "Home (institucional)",
    objetivo: "Dar contexto e confiança e empurrar para catálogo/contato. Não vende um produto específico.",
    regra2026: ["Página curta e estratégica", "Uma ação por tela", "Social proof específico"],
    blocos: [
      { id: "hero", tipo: "hero", titulo: "Hero", ux: "Promessa clara em 5s", ui: "Headline literal gigante + subhead + 1 CTA", acao: "Ver catálogo", visual: "video-ou-3d" },
      { id: "como", tipo: "passos", titulo: "Como funciona", ux: "Reduzir fricção/dúvida", ui: "3 passos numerados (01/02/03) em cards", visual: "glow-icon" },
      { id: "servicos", tipo: "grid", titulo: "Serviços", ux: "Escolher um caminho", ui: "Grid de cards de produto (1 CTA cada)", acao: "Começar", visual: "thumbs" },
      { id: "prova", tipo: "prova", titulo: "Prova", ux: "Gerar confiança", ui: "Número real + mini-case com contexto", visual: "screenshot" },
      { id: "fechar", tipo: "cta", titulo: "Fechamento", ux: "Converter indeciso", ui: "Banda grande com glow + headline gigante", acao: "Falar com a Hashes", visual: "nenhum" },
    ],
  },
  agente: {
    pagina: "Agente (especialista)",
    objetivo: "Transformar 'IA genérica' em especialista com nome e autoridade, que entrega produtos específicos.",
    regra2026: ["Headline literal", "Visual como prova", "Uma ação por tela"],
    blocos: [
      { id: "hero", tipo: "hero", titulo: "Hero do agente", ux: "Apresentar a autoridade", ui: "Nome + especialidade + avatar/arte 3D do agente + 1 CTA", acao: "Ver produtos", visual: "video-ou-3d" },
      { id: "faz", tipo: "lista", titulo: "O que ele faz", ux: "Explicar capacidades", ui: "Bullets curtos com ícones", visual: "glow-icon" },
      { id: "entregas", tipo: "grid", titulo: "Entregas", ux: "Levar ao produto", ui: "Cards dos produtos que o agente gera", acao: "Começar", visual: "thumbs" },
      { id: "prova", tipo: "prova", titulo: "Prova", ux: "Confiança", ui: "Um resultado real do agente", visual: "screenshot" },
      { id: "falar", tipo: "cta", titulo: "Falar", ux: "Converter", ui: "CTA único", acao: "Falar com a Hashes", visual: "nenhum" },
    ],
  },
  produto: {
    pagina: "Produto (oferta)",
    objetivo: "Converter: nome + preço + uma ação (briefing). Sustentar com prova e clareza.",
    regra2026: ["Uma ação principal", "Formulário conversacional", "Copy e design sincronizados"],
    blocos: [
      { id: "hero", tipo: "hero", titulo: "Hero", ux: "Oferta clara + ação", ui: "Nome + tagline em gradiente + preço + 1 CTA", acao: "Preencher briefing", visual: "video-ou-3d" },
      { id: "recebe", tipo: "lista", titulo: "O que você recebe", ux: "Mostrar valor concreto", ui: "Checklist curto (ícones de check)", visual: "nenhum" },
      { id: "como", tipo: "passos", titulo: "Como funciona", ux: "Reduzir dúvida", ui: "3 passos numerados", visual: "glow-icon" },
      { id: "quem", tipo: "agente", titulo: "Quem produz", ux: "Autoridade", ui: "O agente responsável (glow-tile)", visual: "glow-icon" },
      { id: "faq", tipo: "faq", titulo: "FAQ + fechamento", ux: "Tirar objeções e converter", ui: "Accordion enxuto + banda de CTA", acao: "Preencher briefing", visual: "nenhum" },
    ],
  },
};
