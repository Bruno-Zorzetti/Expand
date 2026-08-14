// Personas dos agentes de IA da Expand — cada um com sua área, cor, skills, ferramentas,
// funções, avaliações e ranking. Nº de trabalhos é calculado do banco (real).
export type Review = { cliente: string; texto: string; nota: number };
export type Agente = {
  slug: string;
  nome: string;
  cockpit: string; // liga aos produtos
  area: string;
  cor: string; // cor da área
  cor2: string;
  icon: string;
  tagline: string;
  persona: string; // descrição da persona
  hard: string[];
  soft: string[];
  ferramentas: string[];
  funcoes: string[];
  ranking: string; // posição/selo
  nota: number; // média
  reviews: Review[];
  produtos: string[]; // slugs
};

export const AGENTES: Agente[] = [
  {
    slug: "leo",
    nome: "Léo",
    cockpit: "gmn",
    area: "Google Meu Negócio & SEO Local",
    cor: "#2F80FF",
    cor2: "#5AA0FF",
    icon: "pin",
    tagline: "Coloca o seu negócio no topo do mapa.",
    persona:
      "Metódico e orientado a dados, o Léo é o especialista que trata o seu perfil como um ativo. Ele lê o mercado local, entende o que o Google valoriza e transforma isso em passos claros até o TOP 3 do pacote de 3.",
    hard: ["SEO local", "Google Business Profile", "Ranqueamento no pacote de 3", "Análise de concorrentes", "NAP e citações", "Gestão de avaliações"],
    soft: ["Comunicação clara", "Foco em resultado", "Didática", "Consistência"],
    ferramentas: ["Google Business Profile API", "Apify (Google Maps)", "Health Score Expand", "Google Search"],
    funcoes: ["Diagnóstico gratuito", "Plano de otimização", "Posts e avaliações", "Monitoramento mensal"],
    ranking: "TOP 1 local",
    nota: 4.9,
    reviews: [
      { cliente: "Clínica OdontoVida", texto: "Em 60 dias saímos da 2ª página pro pacote de 3. As ligações dobraram.", nota: 5 },
      { cliente: "Auto Center Prime", texto: "Organizou tudo e ainda cuida das avaliações. Profissional.", nota: 5 },
    ],
    produtos: ["google-meu-negocio"],
  },
  {
    slug: "lara",
    nome: "Lara",
    cockpit: "leads",
    area: "Leads & Inteligência de Dados",
    cor: "#31D0AA",
    cor2: "#2FD3AE",
    icon: "target",
    tagline: "Traz os contatos e os dados que viram venda.",
    persona:
      "Curiosa e cirúrgica, a Lara caça dados onde eles estão. Ela define o cliente ideal, coleta em escala, limpa o que não presta e entrega uma base pronta pra ação — com contexto, não só linhas numa planilha.",
    hard: ["Scraping (Apify)", "Enriquecimento de dados", "Definição de ICP", "Dedup e higienização", "Inteligência de mercado", "Análise de tendências"],
    soft: ["Precisão", "Pensamento analítico", "Objetividade", "Curadoria"],
    ferramentas: ["Apify (Maps/LinkedIn)", "Google Trends", "Reddit & X", "Amazon/TikTok Shop"],
    funcoes: ["Prospecção de leads", "Inteligência de mercado", "Audiência de vídeo", "Análise de produtos"],
    ranking: "Base 98% válida",
    nota: 4.8,
    reviews: [
      { cliente: "Imob Horizonte", texto: "Lista limpa, com WhatsApp certo. Bati minha meta do mês.", nota: 5 },
      { cliente: "EduTech Cursos", texto: "O relatório de mercado nos poupou semanas de pesquisa.", nota: 5 },
    ],
    produtos: ["prospeccao-de-leads", "inteligencia-de-mercado", "audiencia-de-video", "analise-de-produtos"],
  },
  {
    slug: "nina",
    nome: "Nina",
    cockpit: "thumbnail",
    area: "Thumbnails & Capas de Alto CTR",
    cor: "#FF7A59",
    cor2: "#FFB25A",
    icon: "play",
    tagline: "Faz o clique acontecer.",
    persona:
      "Visual e provocadora, a Nina pensa como o público na hora de rolar o feed. Ela combina gancho de título, emoção e hierarquia visual pra transformar cada capa numa isca de clique — sem perder a identidade do canal.",
    hard: ["Design de thumbnail", "Otimização de CTR", "Ganchos de título", "Hierarquia visual", "Templates escaláveis"],
    soft: ["Sensibilidade estética", "Rapidez", "Leitura de tendências", "Colaboração"],
    ferramentas: ["Canva", "IA de imagem", "Frameworks MrBeast / Thomas Frank"],
    funcoes: ["Thumbnail por episódio", "Setup de template", "Variações A/B", "Export pronto"],
    ranking: "CTR acima da média",
    nota: 4.9,
    reviews: [
      { cliente: "Podcast Sem Filtro", texto: "As views por vídeo subiram bem depois das capas dela.", nota: 5 },
      { cliente: "Canal Investe Aí", texto: "Rápida e criativa. O template ficou a nossa cara.", nota: 5 },
    ],
    produtos: ["thumbnail-podcast", "setup-de-thumbnail"],
  },
  {
    slug: "alan",
    nome: "Alan",
    cockpit: "ebook",
    area: "Ebooks & Conteúdo de Autoridade",
    cor: "#7A5CFF",
    cor2: "#D946EF",
    icon: "chart",
    tagline: "Transforma o seu conhecimento em autoridade.",
    persona:
      "Estrategista e escritor, o Alan estrutura ideias em narrativa. Ele pega o que você sabe, organiza em capítulos que prendem e embala num material que gera leads e posiciona você como referência.",
    hard: ["Copywriting", "Estrutura de ebook", "Landing pages", "Storytelling", "Design editorial"],
    soft: ["Clareza", "Empatia com o leitor", "Organização", "Visão de oferta"],
    ferramentas: ["IA de texto", "IA de imagem", "Design editorial"],
    funcoes: ["Estrutura e outline", "Redação dos capítulos", "Capa e diagramação", "Landing + captura"],
    ranking: "Pronto pra lançar",
    nota: 4.8,
    reviews: [
      { cliente: "Consultoria Aurum", texto: "O ebook virou nossa principal isca de leads. Excelente.", nota: 5 },
      { cliente: "Dra. Marina Alves", texto: "Ficou profissional e do meu jeito. Recomendo.", nota: 5 },
    ],
    produtos: ["ebook-de-autoridade"],
  },
];

export function agentePorSlug(slug: string) {
  return AGENTES.find((a) => a.slug === slug);
}
