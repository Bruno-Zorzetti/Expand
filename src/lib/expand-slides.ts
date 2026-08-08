// Modelo de slides do editor de apresentações (tema Expand Ouro).
export type SlideLayout = "capa" | "secao" | "texto" | "topicos" | "numero" | "citacao" | "encerramento";

export type Slide = {
  id: string;
  layout: SlideLayout;
  eyebrow?: string;
  titulo?: string;
  subtitulo?: string;
  corpo?: string;
  itens?: string[];
  numero?: string;
  autor?: string;
};

export type Deck = { id: string; titulo: string; slides: Slide[]; publico: boolean };

// Modelos disponíveis no "+ Adicionar slide".
export const LAYOUTS: { k: SlideLayout; l: string; d: string; icon: string }[] = [
  { k: "capa", l: "Capa", d: "Título grande + subtítulo", icon: "◆" },
  { k: "secao", l: "Seção", d: "Divisor de tema", icon: "▤" },
  { k: "texto", l: "Texto", d: "Título + parágrafo", icon: "¶" },
  { k: "topicos", l: "Tópicos", d: "Título + lista de pontos", icon: "≣" },
  { k: "numero", l: "Número / Prova", d: "Um número grande em destaque", icon: "＃" },
  { k: "citacao", l: "Citação", d: "Frase de impacto + autor", icon: "❝" },
  { k: "encerramento", l: "Encerramento", d: "Chamada final centralizada", icon: "★" },
];

const uid = () => "s" + Math.random().toString(36).slice(2, 9);

export function novoSlide(layout: SlideLayout): Slide {
  const base: Slide = { id: uid(), layout };
  switch (layout) {
    case "capa": return { ...base, eyebrow: "Grupo Expand", titulo: "Título da apresentação", subtitulo: "Um subtítulo curto que explica o tema." };
    case "secao": return { ...base, eyebrow: "Capítulo 01", titulo: "Nova seção" };
    case "texto": return { ...base, eyebrow: "Tópico", titulo: "Título do slide", corpo: "Escreva aqui o parágrafo principal deste slide." };
    case "topicos": return { ...base, eyebrow: "Tópico", titulo: "Título do slide", itens: ["Primeiro ponto", "Segundo ponto", "Terceiro ponto"] };
    case "numero": return { ...base, eyebrow: "Destaque", numero: "100%", titulo: "descrição do número", corpo: "Um contexto curto ao lado do número." };
    case "citacao": return { ...base, titulo: "Uma frase de impacto que resume a ideia.", autor: "Autor / fonte" };
    case "encerramento": return { ...base, titulo: "Obrigado!", subtitulo: "grupoexpand.co · contato@grupoexpand.co" };
    default: return base;
  }
}

// Paleta Expand Ouro (usada no render dos slides).
export const OURO = {
  bg: "#08110E", panel: "#0f1b16", txt: "#F4E8D4", ouro: "#C89B5E", ouroHi: "#E0BC85",
  green: "#6FBF92", mut: "#B5AC97", dim: "#7C8C7F", line: "#1d4034",
  serif: "var(--font-cinzel), Georgia, serif",
};
