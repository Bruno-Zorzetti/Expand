// Geradores de prompt para análise comportamental via Claude.
import type { DiscKey } from "./expand-disc";
import type { TempKey } from "./expand-temperamento";
import type { ArqKey } from "./expand-arquetipo";

export type DiscAnalise = {
  perfil_geral: string;
  caracteristicas_naturais: string[];
  pontos_fortes: string[];
  pontos_atencao: string[];
  motivadores: string[];
  desmotivadores: string[];
  tomada_decisao: string;
  comunicacao: { como_fala: string; como_falar_com: string };
  feedback: string;
  sob_pressao: string;
  em_conflitos: string;
  lideranca: { como_lidera: string; como_ser_liderado: string };
  trabalho_equipe: string;
  manual: { para_obter_melhor: string; ao_cobrar: string; ao_dar_feedback: string; para_motivar: string };
};

export type TempAnalise = {
  resumo: string;
  pontos_fortes: string[];
  pontos_atencao: string[];
  motivadores: string[];
  necessidades: string;
  comunicacao: { como_fala: string; como_falar_com: string };
  sob_pressao: string;
  mudancas: string;
  cobranca: string;
  criticas: string;
  conflitos: string;
  como_conversar: { faca: string[]; evite: string[] };
  simulador: { cobranca: string; critica: string; ideia_rejeitada: string; meta_agressiva: string; mudanca_brusca: string };
  manual: { para_obter_melhor: string; ao_cobrar: string; ao_dar_feedback: string; para_motivar: string };
};

export type ArqAnalise = {
  essencia: string;
  motivacao: string;
  desejo: string;
  meta: string;
  medo: string;
  estrategia: string;
  dadiva: string;
  luz: string[];
  sombra: string[];
  profissional: { lideranca: string; vendas: string; criatividade: string; negociacao: string; equipe: string };
  marca_pessoal: {
    personalidade: string;
    tom_voz: string;
    palavras_combinam: string[];
    palavras_evitar: string[];
    estilo: string;
    paleta: { principal: string; secundaria: string; apoio: string; neutra: string; destaque: string };
  };
  manual: { para_obter_melhor: string; ao_cobrar: string; ao_dar_feedback: string; para_motivar: string };
};

export type VisaoIntegrada = {
  quem_e: string;
  como_pensa: string;
  como_age: string;
  como_decide: string;
  como_comunica: string;
  como_relaciona: string;
  como_pressao: string;
  como_lidera: string;
  motivadores: string[];
  resistencias: string[];
  forcas: string[];
  desenvolvimento: string[];
  manual: {
    para_obter_melhor: string;
    ao_falar: string;
    ao_cobrar: string;
    ao_discordar: string;
    ao_apresentar_ideia: string;
    sob_pressao: string;
    ao_dar_feedback: string;
    para_motivar: string;
    evite: string;
  };
  como_vender_para?: {
    iniciar_conversa: string;
    apresentar_solucao: string;
    apresentar_preco: string;
    objecoes_provaveis: string[];
    followup: string;
  };
};

// ── Prompts ───────────────────────────────────────────────────────────────────

const INSTRUCAO = `Você é especialista em psicologia organizacional e análise comportamental.
Responda APENAS com o JSON solicitado, sem markdown, sem explicações fora do JSON.
Use português do Brasil. Seja direto, prático e evite linguagem clínica ou depreciativa.`;

export function promptDisc(nome: string, cargo: string | null, disc: Record<DiscKey, number>, segmento: string, segmentoNome: string): { system: string; user: string } {
  const total = Object.values(disc).reduce((a, b) => a + b, 0);
  const pct = (k: DiscKey) => total > 0 ? Math.round((disc[k] / total) * 100) : 0;
  return {
    system: INSTRUCAO,
    user: `Análise DISC de ${nome}${cargo ? ` (${cargo})` : ''}.
Scores: D=${disc.D} (${pct("D")}%) I=${disc.I} (${pct("I")}%) S=${disc.S} (${pct("S")}%) C=${disc.C} (${pct("C")}%)
Perfil predominante: ${segmento} — ${segmentoNome}

Gere EXATAMENTE este JSON (sem campos extras):
{
  "perfil_geral": "2-3 frases sobre como esta pessoa naturalmente se comporta",
  "caracteristicas_naturais": ["5-6 comportamentos espontâneos"],
  "pontos_fortes": ["5-6 forças comportamentais profissionais"],
  "pontos_atencao": ["4-5 pontos que podem dificultar resultados (sem linguagem negativa)"],
  "motivadores": ["4-5 situações que geram energia e comprometimento"],
  "desmotivadores": ["3-4 situações que diminuem engajamento"],
  "tomada_decisao": "como esta pessoa decide — velocidade, base racional ou emocional",
  "comunicacao": {
    "como_fala": "estilo natural de comunicação desta pessoa",
    "como_falar_com": "como nos comunicar com ela para ser mais efetivo"
  },
  "feedback": "como dar feedback: objetividade, contexto, abordagem ideal",
  "sob_pressao": "comportamentos que se intensificam sob prazo, conflito e cobrança",
  "em_conflitos": "tendências de reação e como conduzir conversas difíceis com ela",
  "lideranca": {
    "como_lidera": "estilo natural de liderança",
    "como_ser_liderado": "como prefere ser liderado e grau de autonomia ideal"
  },
  "trabalho_equipe": "papel natural em grupo, contribuições, possíveis atritos com outros perfis",
  "manual": {
    "para_obter_melhor": "o que fazer para extrair o máximo desta pessoa",
    "ao_cobrar": "como cobrar resultados de forma efetiva",
    "ao_dar_feedback": "abordagem específica para esta pessoa",
    "para_motivar": "o que acende a chama desta pessoa"
  }
}`,
  };
}

export function promptTemperamento(nome: string, cargo: string | null, dominante: TempKey, apoio: TempKey | null, scores: Record<TempKey, number>): { system: string; user: string } {
  const NOMES: Record<TempKey, string> = { sanguineo: "Sanguíneo", colerico: "Colérico", melancolico: "Melancólico", fleumatico: "Fleumático" };
  const perfil = apoio ? `${NOMES[dominante]} com traços de ${NOMES[apoio]}` : `${NOMES[dominante]} predominante`;
  const scoreStr = (Object.entries(scores) as [TempKey, number][]).map(([k, v]) => `${NOMES[k]}=${v}%`).join(", ");
  return {
    system: INSTRUCAO,
    user: `Análise de Temperamento de ${nome}${cargo ? ` (${cargo})` : ''}.
Scores: ${scoreStr}
Perfil: ${perfil}

Gere EXATAMENTE este JSON:
{
  "resumo": "2-3 frases de síntese comportamental desta pessoa",
  "pontos_fortes": ["5-6 forças relacionadas ao temperamento"],
  "pontos_atencao": ["4-5 pontos de atenção sem linguagem negativa"],
  "motivadores": ["4-5 motivadores emocionais e profissionais"],
  "necessidades": "necessidades emocionais e sociais no ambiente profissional",
  "comunicacao": {
    "como_fala": "estilo natural de comunicação",
    "como_falar_com": "como conversar com esta pessoa de forma efetiva"
  },
  "sob_pressao": "como reage sob prazo curto, conflito e cobrança",
  "mudancas": "como reage a mudanças repentinas",
  "cobranca": "como reage à cobrança",
  "criticas": "como recebe críticas",
  "conflitos": "como tende a reagir em conflitos",
  "como_conversar": {
    "faca": ["4-5 coisas a fazer ao falar com esta pessoa"],
    "evite": ["3-4 coisas que geram resistência neste perfil"]
  },
  "simulador": {
    "cobranca": "como provavelmente reage ao receber uma cobrança",
    "critica": "como reage a uma crítica no trabalho",
    "ideia_rejeitada": "como reage quando uma ideia sua é rejeitada",
    "meta_agressiva": "como recebe uma meta muito agressiva",
    "mudanca_brusca": "como reage a uma mudança brusca de planos"
  },
  "manual": {
    "para_obter_melhor": "o que fazer para extrair o máximo desta pessoa",
    "ao_cobrar": "como cobrar resultados de forma efetiva",
    "ao_dar_feedback": "abordagem específica para este temperamento",
    "para_motivar": "o que motiva genuinamente esta pessoa"
  }
}`,
  };
}

export function promptArquetipo(nome: string, cargo: string | null, dominante: ArqKey, apoio: ArqKey | null, complementar: ArqKey | null, scores: Record<ArqKey, number>): { system: string; user: string } {
  const NOMES: Record<ArqKey, string> = {
    inocente: "Inocente", explorador: "Explorador", sabio: "Sábio", heroi: "Herói",
    foradalei: "Fora-da-lei", mago: "Mago", caracomum: "Cara Comum", amante: "Amante",
    bobo: "Bobo da Corte", prestativo: "Prestativo", criador: "Criador", governante: "Governante",
  };
  const top3 = [dominante, apoio, complementar].filter(Boolean).map(k => `${NOMES[k!]} (${scores[k!]?.toFixed(1)})`).join(", ");
  return {
    system: INSTRUCAO,
    user: `Análise de Arquétipos de ${nome}${cargo ? ` (${cargo})` : ''}.
Assinatura arquetípica: ${top3}
Arquétipo dominante: ${NOMES[dominante]}

Gere EXATAMENTE este JSON:
{
  "essencia": "quem é este arquétipo — sua identidade central em 1-2 frases",
  "motivacao": "o que move esta pessoa internamente",
  "desejo": "o que deseja conquistar ou experimentar",
  "meta": "sua busca principal",
  "medo": "o que procura evitar acima de tudo",
  "estrategia": "como normalmente tenta atingir seus objetivos",
  "dadiva": "o que este arquétipo entrega de melhor às outras pessoas",
  "luz": ["5-6 potenciais positivos quando está em equilíbrio"],
  "sombra": ["4-5 comportamentos que aparecem quando suas características são excessivas ou desequilibradas"],
  "profissional": {
    "lideranca": "como este arquétipo tende a liderar",
    "vendas": "como se sai em vendas e negociação",
    "criatividade": "como expressa criatividade",
    "negociacao": "como negocia",
    "equipe": "papel natural em times"
  },
  "marca_pessoal": {
    "personalidade": "personalidade da marca pessoal em 1 frase",
    "tom_voz": "tom de voz ideal: formal/informal, direto/narrativo, etc.",
    "palavras_combinam": ["6-8 palavras que combinam com este arquétipo"],
    "palavras_evitar": ["4-5 palavras ou tons que destoam"],
    "estilo": "direção criativa e visual em 1-2 frases",
    "paleta": {
      "principal": "cor hex que melhor representa este arquétipo",
      "secundaria": "cor hex complementar",
      "apoio": "cor hex de apoio",
      "neutra": "cor hex neutra que combina",
      "destaque": "cor hex de destaque/call to action"
    }
  },
  "manual": {
    "para_obter_melhor": "o que fazer para extrair o máximo desta pessoa",
    "ao_cobrar": "como cobrar de forma efetiva com este arquétipo",
    "ao_dar_feedback": "como dar feedback a este arquétipo",
    "para_motivar": "o que motiva genuinamente este arquétipo"
  }
}`,
  };
}

export function promptVisaoIntegrada(nome: string, cargo: string | null, discSeg: string, discNome: string, tempNome: string, arqNome: string, arqApoioNome?: string | null): { system: string; user: string } {
  return {
    system: INSTRUCAO,
    user: `Síntese 360° de ${nome}${cargo ? ` (${cargo})` : ''}.
Perfil DISC: ${discSeg} — ${discNome}
Temperamento: ${tempNome}
Arquétipo: ${arqNome}${arqApoioNome ? ` com traços de ${arqApoioNome}` : ''}

Com base nesses três diagnósticos, gere uma síntese integrada em JSON EXATO:
{
  "quem_e": "2-3 parágrafos revelando quem é esta pessoa de forma executiva e humana, cruzando DISC + Temperamento + Arquétipo",
  "como_pensa": "como processa informações e forma opiniões",
  "como_age": "como prefere agir e executar",
  "como_decide": "padrão de tomada de decisão integrado",
  "como_comunica": "estilo de comunicação dominante",
  "como_relaciona": "padrão de relacionamento interpessoal",
  "como_pressao": "resposta integrada à pressão e ao estresse",
  "como_lidera": "estilo de liderança e como prefere ser liderada",
  "motivadores": ["4-5 principais motivadores cruzando os três perfis"],
  "resistencias": ["3-4 principais gatilhos de resistência"],
  "forcas": ["5-6 forças naturais cruzadas dos três perfis"],
  "desenvolvimento": ["4-5 áreas de desenvolvimento que aparecem nos três perfis"],
  "manual": {
    "para_obter_melhor": "síntese de como extrair o máximo desta pessoa",
    "ao_falar": "como iniciar e conduzir conversas com ela",
    "ao_cobrar": "como cobrar de forma efetiva",
    "ao_discordar": "como discordar sem gerar resistência",
    "ao_apresentar_ideia": "como apresentar uma proposta para ela",
    "sob_pressao": "o que fazer quando ela estiver sob pressão",
    "ao_dar_feedback": "abordagem ideal de feedback para ela",
    "para_motivar": "como genuinamente motivá-la",
    "evite": "o que absolutamente evitar com esta pessoa"
  }
}`,
  };
}
