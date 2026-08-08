// Teste de Arquétipo (metodologia Henrique Toledo) — 48 questões, nota 1–5, → 12 arquétipos.
// Gabarito FIXO (determinístico): cada questão pesa num arquétipo. Sem IA/tokens em runtime.

export type ArqKey =
  | "inocente" | "explorador" | "sabio" | "heroi" | "foradalei" | "mago"
  | "caracomum" | "amante" | "bobo" | "prestativo" | "criador" | "governante";

export const QUESTOES_ARQ: string[] = [
  "Cultiva a ideia de que o mundo é um lugar seguro e devemos acreditar nas coisas e nas pessoas.",
  "Incentiva as pessoas a sempre superar seus limites.",
  "Tem um propósito, uma causa, que vai além de números.",
  "Sente que é um símbolo da busca por uma vida mais realizada.",
  "Acredita e comunica o aperfeiçoamento como propósito de vida.",
  "Gosta e cultiva diariamente a sensualidade e o prazer.",
  "Comunica a simplicidade: preferimos ficar em casa com amigos do que ir a um evento.",
  "Mostra que às vezes é preciso correr riscos para defender as ideias em que acredita.",
  "Conversa de modo coloquial e não gosta de elitismo.",
  "Diz que é mais importante dar do que receber, doar-se aos outros e ajudá-los.",
  "É para quem sente certa inquietação com a situação que vive atualmente.",
  "Cultiva o sentimento de se apaixonar pela vida plenamente.",
  "Acredita que as pessoas não cometem erros por mal — podem ser boas.",
  "Concorda: melhor ter amado e perdido do que nunca ter amado.",
  "É apaixonado(a) por relacionamentos pessoais.",
  "Ama a liberdade.",
  "Quando não está de acordo, não entra em conformidade.",
  "Nunca está totalmente satisfeito(a) — cria novas situações e produtos que ajudam o mundo.",
  "Se esforça por ser objetivo(a).",
  "É otimista e puro(a).",
  "Acredita que manter a independência das pessoas é fundamental.",
  "Crê que a ajuda espiritual é responsável pela eficiência das pessoas.",
  "A modificação dos pensamentos altera a vida.",
  "Estimula o desejo de ser bem-sucedido e tornar-se líder.",
  "Orienta as pessoas com seu conhecimento.",
  "Sempre tem um ponto de vista nos assuntos modernos; pensa no futuro.",
  "É divertido(a).",
  "Gosta de fazer as pessoas rirem.",
  "Gosta de momentos simples e familiares.",
  "Ajuda as pessoas a serem menos egoístas e se preocuparem com o próximo.",
  "Gosta de pessoas criativas que buscam fazer algo significativo.",
  "Ajuda as pessoas a deixarem o medo de lado e fazerem o que precisa ser feito.",
  "Choca com suas atitudes.",
  "Se mostra sempre muito inspirado(a) e adora ter novas ideias.",
  "Acredita que a mesma coisa pode ser considerada a partir de diferentes ângulos.",
  "Não leva as regras muito a sério.",
  "Acredita que um pouco de bagunça é bom para a alma.",
  "Acredita na capacidade humana para aprender e crescer.",
  "Quer de volta os prazeres simples e os valores básicos das pessoas.",
  "Atua, muitas vezes, como catalisador para a realização de mudanças.",
  "Busca o status e estar no comando das situações.",
  "É grandioso(a) — imponente, nobre.",
  "Acredita que todas as pessoas e coisas do mundo estão interligadas.",
  "Acredita que a criatividade seja um de seus maiores dons.",
  "Segue suas próprias leis, não o que o sistema diz que precisa seguir.",
  "Ajuda as pessoas a terem prazer em cuidar das outras.",
  "Ajuda as pessoas a terem disciplina para alcançar as próprias metas.",
  "Tem a palavra 'verdadeira' como uma das que melhor a definem.",
];

// Gabarito: questão (índice 0–47) → arquétipo. Construído a partir das definições dos 12 arquétipos.
export const GABARITO: ArqKey[] = [
  "inocente", "heroi", "foradalei", "explorador", "sabio", "amante", "caracomum", "heroi",
  "caracomum", "prestativo", "explorador", "amante", "inocente", "amante", "amante", "explorador",
  "foradalei", "criador", "sabio", "inocente", "explorador", "mago", "mago", "governante",
  "sabio", "governante", "bobo", "bobo", "caracomum", "prestativo", "criador", "heroi",
  "foradalei", "criador", "sabio", "bobo", "bobo", "inocente", "caracomum", "mago",
  "governante", "governante", "mago", "criador", "foradalei", "prestativo", "heroi", "sabio",
];

export const ARQUETIPOS: Record<ArqKey, { nome: string; cor: string; desc: string; comoLidar: string }> = {
  inocente: { nome: "Inocente", cor: "#E0BC85", desc: "Otimismo, simplicidade, confiança e fé nas pessoas. Busca fazer o certo e ser feliz.", comoLidar: "Dê contexto positivo e segurança; explique o porquê. Evite cinismo e cobrança agressiva — reconheça o esforço." },
  explorador: { nome: "Explorador", cor: "#6FBF92", desc: "Liberdade, autenticidade e inquietação. Não gosta de amarras; busca o novo.", comoLidar: "Dê autonomia e espaço para propor caminhos. Não microgerencie; alinhe o destino e deixe escolher a rota." },
  sabio: { nome: "Sábio", cor: "#C89B5E", desc: "Conhecimento, verdade e análise. Quer entender antes de agir e orientar com clareza.", comoLidar: "Traga dados e o racional; deixe tempo para analisar. Peça a opinião técnica dele — valoriza ser consultado." },
  heroi: { nome: "Herói", cor: "#CE6A5F", desc: "Coragem, superação e disciplina. Movido a desafio e resultado.", comoLidar: "Dê metas claras e desafios; reconheça a conquista. Evite tarefas mornas — ele rende sob um bom alvo." },
  foradalei: { nome: "Fora-da-lei", cor: "#D9A94E", desc: "Ruptura e não-conformidade. Questiona regras e propõe o disruptivo.", comoLidar: "Explique o motivo das regras (não imponha). Dê espaço para desafiar o status quo — canalize a rebeldia em inovação." },
  mago: { nome: "Mago", cor: "#A07644", desc: "Transformação e visão. Acredita que mudar o pensamento muda a realidade.", comoLidar: "Conecte a tarefa a uma visão maior de transformação. Dê liberdade criativa; evite excesso de burocracia." },
  caracomum: { nome: "Cara comum", cor: "#B5AC97", desc: "Pertencimento e simplicidade. 'Sou como você'; valoriza o coletivo e o simples.", comoLidar: "Trate de igual para igual, sem formalidade. Reforce o pertencimento ao time; evite elitismo e exclusividade." },
  amante: { nome: "Amante", cor: "#CE6A5F", desc: "Paixão, prazer e relacionamento. Move-se pela conexão e pela beleza.", comoLidar: "Cuide da relação e do clima; reconheça pessoalmente. Ele entrega mais quando se sente valorizado e próximo." },
  bobo: { nome: "Bobo da corte", cor: "#E0BC85", desc: "Diversão, humor e leveza. Aprende brincando e alivia a tensão do time.", comoLidar: "Deixe leveza e humor; não sufoque com rigidez. Traga a seriedade pelo lado do prazer de fazer bem-feito." },
  prestativo: { nome: "Prestativo", cor: "#6FBF92", desc: "Cuidado e doação. Sente prazer em ajudar e proteger os outros.", comoLidar: "Mostre o impacto no outro (cliente/colega). Cuide para não sobrecarregá-lo — ele tende a assumir demais." },
  criador: { nome: "Criador", cor: "#C89B5E", desc: "Criatividade e originalidade. Precisa construir e expressar o novo.", comoLidar: "Dê problemas para resolver de forma original; espaço para criar. Evite tarefas 100% repetitivas sem margem autoral." },
  governante: { nome: "Governante", cor: "#A07644", desc: "Liderança, status e comando. Gosta de ordem, controle e responsabilidade.", comoLidar: "Dê responsabilidade e visão do todo; respeite a autoridade dele. Deixe liderar uma frente — evita ser 'só executor'." },
};

export type ArqResultado = {
  scores: Record<ArqKey, number>; // média 1–5 por arquétipo
  dominante: ArqKey;
  apoio: ArqKey | null;
  dominanteNome: string;
  segmento: string;   // ex.: "Herói com traços de Governante"
  desc: string;
  comoLidar: string;
  top: { k: ArqKey; nome: string; cor: string; v: number }[]; // ordenado desc
};

// Calcula a média (1–5) de cada arquétipo a partir das 48 respostas.
export function calcularArquetipo(respostas: number[]): Record<ArqKey, number> {
  const soma = {} as Record<ArqKey, number>, n = {} as Record<ArqKey, number>;
  (Object.keys(ARQUETIPOS) as ArqKey[]).forEach((k) => { soma[k] = 0; n[k] = 0; });
  GABARITO.forEach((k, i) => { const v = respostas[i]; if (typeof v === "number") { soma[k] += v; n[k]++; } });
  const out = {} as Record<ArqKey, number>;
  (Object.keys(ARQUETIPOS) as ArqKey[]).forEach((k) => { out[k] = n[k] ? Math.round((soma[k] / n[k]) * 100) / 100 : 0; });
  return out;
}

export function montarArquetipo(scores: Record<ArqKey, number>): ArqResultado {
  const ord = (Object.entries(scores) as [ArqKey, number][]).sort((a, b) => b[1] - a[1]);
  const dominante = ord[0][0];
  const apoio = ord[1] && ord[1][1] >= ord[0][1] * 0.85 && ord[1][1] > 0 ? ord[1][0] : null;
  const A = ARQUETIPOS;
  return {
    scores, dominante, apoio,
    dominanteNome: A[dominante].nome,
    segmento: apoio ? `${A[dominante].nome} com traços de ${A[apoio].nome}` : `${A[dominante].nome} predominante`,
    desc: A[dominante].desc,
    comoLidar: A[dominante].comoLidar + (apoio ? ` Puxa também o lado ${A[apoio].nome}: ${A[apoio].comoLidar.split(".")[0].toLowerCase()}.` : ""),
    top: ord.map(([k, v]) => ({ k, nome: A[k].nome, cor: A[k].cor, v })),
  };
}
