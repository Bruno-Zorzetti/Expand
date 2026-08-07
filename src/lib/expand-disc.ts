// Diagnóstico comportamental — DISC com sobreposição (perfil mesclado) + temperamentos + matriz de harmonia.

export type DiscKey = "D" | "I" | "S" | "C";
export type TempKey = "sanguineo" | "colerico" | "melancolico" | "fleumatico";

export const QUESTOES_DISC: { k: DiscKey; q: string }[] = [
  { k: "D", q: "Gosto de assumir o controle e decidir rápido, mesmo sob pressão." },
  { k: "D", q: "Encaro desafios de frente e não fujo de uma conversa difícil." },
  { k: "D", q: "Sou movido a resultado — foco no que faz a agulha andar." },
  { k: "I", q: "Me energizo interagindo, convencendo e engajando pessoas." },
  { k: "I", q: "Sou comunicativo e otimista, crio um clima bom no time." },
  { k: "I", q: "Prefiro apresentar uma ideia conversando do que por escrito." },
  { k: "S", q: "Prezo por harmonia e apoio quem está ao meu lado." },
  { k: "S", q: "Gosto de constância e um ritmo estável, evito mudanças bruscas." },
  { k: "S", q: "Sou paciente e ouço mais do que falo." },
  { k: "C", q: "Sou detalhista e sigo processos, padrões e qualidade." },
  { k: "C", q: "Analiso dados e riscos com calma antes de agir." },
  { k: "C", q: "Prefiro ter tudo certo e conferido a entregar no susto." },
];

export const QUESTOES_TEMP: { k: TempKey; q: string }[] = [
  { k: "sanguineo", q: "Sou extrovertido, animado e faço amizade com facilidade." },
  { k: "sanguineo", q: "Gosto de novidade e de estar no meio das pessoas." },
  { k: "colerico", q: "Assumo a liderança naturalmente e vou direto ao objetivo." },
  { k: "colerico", q: "Tenho muita energia e me incomoda ficar parado." },
  { k: "melancolico", q: "Sou reflexivo, perfeccionista e cuidadoso com detalhes." },
  { k: "melancolico", q: "Penso bastante antes de decidir e valorizo profundidade." },
  { k: "fleumatico", q: "Sou calmo, paciente e equilibrado sob pressão." },
  { k: "fleumatico", q: "Evito conflito e mantenho a estabilidade do grupo." },
];

export const DISC_NOME: Record<DiscKey, string> = { D: "Dominância", I: "Influência", S: "Estabilidade", C: "Conformidade" };
export const TEMP_NOME: Record<TempKey, string> = { sanguineo: "Sanguíneo", colerico: "Colérico", melancolico: "Melancólico", fleumatico: "Fleumático" };

// descrição de cada segmento DISC (puros + mesclas mais comuns)
export const DISC_SEG: Record<string, string> = {
  D: "Dominância pura — foco em resultado, decisão rápida e coragem para o difícil. Rende no comando e na pressão; cuide para não atropelar as pessoas.",
  DI: "Dominância com Influência — executor que também mobiliza. Puxa a frente e engaja o time; atenção ao excesso de otimismo nos prazos.",
  DC: "Dominância com Conformidade — resultado com rigor. Decide e cobra qualidade; pode ser exigente demais consigo e com os outros.",
  I: "Influência pura — comunicação, entusiasmo e relacionamento. Brilha em vendas e clima; precisa de apoio para fechar e detalhar.",
  ID: "Influência com Dominância — carisma que também comanda. Mobiliza gente e resultado; cuidado com a impaciência.",
  IS: "Influência com Estabilidade — pessoa de gente, acolhedora e constante. Ótima para relacionamento de longo prazo; pode evitar o conflito necessário.",
  S: "Estabilidade pura — constância, paciência e apoio. Sustenta o time e a rotina; resiste a mudanças bruscas.",
  SI: "Estabilidade com Influência — calma e simpática. Cola o time; precisa de empurrão para iniciativas e prazos apertados.",
  SC: "Estabilidade com Conformidade — confiável e caprichosa. Excelente em processo e consistência; lenta para mudar.",
  C: "Conformidade pura — precisão, análise e método. Forte em qualidade e dados; pode travar por perfeccionismo.",
  CD: "Conformidade com Dominância — técnico e decidido. Entrega com rigor e assume o comando do detalhe; pode ser crítico.",
  CS: "Conformidade com Estabilidade — meticuloso e paciente. Ótimo para precisão contínua; evita risco.",
};

export const TEMP_DESC: Record<TempKey, string> = {
  sanguineo: "Extrovertido, otimista e sociável — traz energia e relacionamento ao time.",
  colerico: "Determinado, líder e movido a metas — traz direção e velocidade.",
  melancolico: "Reflexivo, perfeccionista e cuidadoso — traz qualidade e profundidade.",
  fleumatico: "Calmo, paciente e equilibrado — traz estabilidade e paz.",
};

// matriz de harmonia entre temperamentos (chave = pares ordenados alfabeticamente)
const MATRIZ_TEMP: Record<string, string> = {
  "sanguineo+sanguineo": "Energia e clima lá em cima, mas risco de dispersão e pouco fechamento. Funciona melhor com alguém que aterrisse as tarefas e cobre prazo.",
  "colerico+sanguineo": "Dupla movida à ação — o colérico traz meta, o sanguíneo traz gente. Combinam bem se o colérico não atropelar o ritmo social do sanguíneo.",
  "melancolico+sanguineo": "Complementares: entusiasmo do sanguíneo + rigor do melancólico. Alinhem expectativa de prazo, porque um quer velocidade e o outro quer perfeição.",
  "fleumatico+sanguineo": "Leve e harmônico — o sanguíneo puxa, o fleumático estabiliza. Falta cobrança: definam quem fecha e quando.",
  "colerico+colerico": "Muita potência e choque de comando. Dividam escopos bem claros para não brigar por controle.",
  "colerico+melancolico": "Execução + qualidade, ótimo para entregar. O colérico precisa respeitar o tempo de análise do melancólico.",
  "colerico+fleumatico": "O colérico acelera, o fleumático absorve a pressão — bom equilíbrio, desde que o colérico não passe por cima.",
  "melancolico+melancolico": "Qualidade altíssima e risco de travar por perfeccionismo. Definam o 'bom o suficiente' e um prazo firme.",
  "fleumatico+melancolico": "Dupla calma e cuidadosa, ótima para consistência e fraca para urgência. Coloquem uma meta e um prazo claros.",
  "fleumatico+fleumatico": "Paz e estabilidade, pouca iniciativa. Precisa de um gatilho externo (meta, ritual) para andar.",
};
export function harmonia(a: TempKey, b: TempKey): string {
  return MATRIZ_TEMP[[a, b].sort().join("+")] ?? "";
}

export type Result = {
  disc: Record<DiscKey, number>;
  temperamentos: Record<TempKey, number>;
  discSegmento: string;   // ex.: "DI"
  discNome: string;       // ex.: "Dominância com Influência"
  discDesc: string;
  tempSegmento: string;   // ex.: "colerico+sanguineo"
  tempNome: string;       // ex.: "Colérico com traços de Sanguíneo"
  tempDesc: string;
};

function segmento<K extends string>(scores: Record<K, number>): { pri: K; sec: K | null } {
  const ord = (Object.entries(scores) as [K, number][]).sort((a, b) => b[1] - a[1]);
  const pri = ord[0][0];
  const sec = ord[1] && ord[1][1] >= ord[0][1] * 0.8 ? ord[1][0] : null; // sobreposição: 2º dentro de 80% do 1º
  return { pri, sec };
}

export function montarResultado(disc: Record<DiscKey, number>, temp: Record<TempKey, number>): Result {
  const d = segmento(disc);
  const discSeg = d.sec ? `${d.pri}${d.sec}` : d.pri;
  const discNome = d.sec ? `${DISC_NOME[d.pri]} com ${DISC_NOME[d.sec]}` : `${DISC_NOME[d.pri]} (perfil marcante)`;
  const t = segmento(temp);
  const tempSeg = t.sec ? [t.pri, t.sec].sort().join("+") : t.pri;
  const tempNome = t.sec ? `${TEMP_NOME[t.pri]} com traços de ${TEMP_NOME[t.sec]}` : `${TEMP_NOME[t.pri]} predominante`;
  return {
    disc, temperamentos: temp,
    discSegmento: discSeg, discNome, discDesc: DISC_SEG[discSeg] ?? DISC_SEG[d.pri],
    tempSegmento: tempSeg, tempNome, tempDesc: TEMP_DESC[t.pri] + (t.sec ? ` Também mostra o lado ${TEMP_NOME[t.sec].toLowerCase()}: ${TEMP_DESC[t.sec].toLowerCase()}` : ""),
  };
}
