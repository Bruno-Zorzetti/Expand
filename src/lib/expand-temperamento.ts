// Diagnóstico de Temperamento com arquétipo pessoal — base da comunicação do Grupo Expand.
// Base teórica: tradição clássica (Hipócrates/Galeno) na leitura moderna de temperamentos,
// com a figura arquetípica como âncora visual. Estrutura de análise definida pelo Bruno:
// 6 áreas de comportamento + 4 áreas arquetípicas.

export type TempKey = "sanguineo" | "colerico" | "melancolico" | "fleumatico";

export type Temperamento = {
  nome: string;
  arquetipo: string;
  figuras: string;
  cor: string;
  resumo: string;
  // 6 áreas
  percepcao: { intensidade: string; duracao: string };
  reacao: { velocidade: string; direcao: string };
  energia: { ritmo: string; motivacao: string };
  expressao: { tom: string; abertura: string };
  relacoes: { foco: string; conflitos: string };
  luzSombra: { virtudes: string[]; sombras: string[] };
  // 4 áreas arquetípicas
  desejo: { busca: string; valor: string };
  medo: string;
  jornada: string;
  // prático
  comoLidar: string[];
  habilidades: string[];
};

export const TEMPERAMENTOS: Record<TempKey, Temperamento> = {
  sanguineo: {
    nome: "Sanguíneo", arquetipo: "O Artista", figuras: "Artista · Mensageiro · Anfitrião", cor: "#ffc24b",
    resumo: "Movimento, conexão e celebração. Acende o ambiente, cria vínculo rápido e transforma qualquer sala num lugar mais leve.",
    percepcao: { intensidade: "Reage forte e na hora ao que acontece por fora: o ambiente, o clima da conversa e a reação das pessoas mexem muito com ele.", duracao: "O impacto passa rápido. Chora e ri no mesmo dia; raramente carrega o assunto para a semana seguinte." },
    reacao: { velocidade: "Reage no mesmo segundo — entusiasmo imediato ou reclamação imediata, sem intervalo entre sentir e falar.", direcao: "Para fora: fala, gesticula, procura alguém para contar. Não guarda." },
    energia: { ritmo: "Velocidade e volume. Começa muitas frentes com energia alta e precisa de estímulo novo para manter o fôlego.", motivacao: "Aprovação social, novidade e o brilho de estar entre pessoas. Reconhecimento público vale mais que dinheiro." },
    expressao: { tom: "Teatral e expansivo: voz alta, história bem contada, humor. Comunica com o corpo inteiro.", abertura: "Abre fácil o mundo interno — às vezes cedo demais, para quem ainda não é íntimo." },
    relacoes: { foco: "Divertir e conectar o grupo. Faz amizade em minutos e é a cola social do time.", conflitos: "Resolve na conversa amigável e no bom humor; foge da tensão prolongada e busca reconciliação rápida." },
    luzSombra: { virtudes: ["Entusiasmo contagiante", "Cria vínculo em minutos", "Criatividade e improviso", "Perdoa rápido, não guarda mágoa"], sombras: ["Falta de constância — começa e não termina", "Desorganização e atrasos", "Vaidade e necessidade de aplauso", "Promete no impulso além do que entrega"] },
    desejo: { busca: "Liberdade e novidade — viver o que é vibrante e ser visto vivendo.", valor: "Alegria. Decide pelo que anima." },
    medo: "Ser rejeitado ou esquecido. O silêncio e a indiferença o desestabilizam mais que a crítica.",
    jornada: "Aprender a constância: terminar o que começou mesmo quando a novidade passou.",
    comoLidar: ["Elogie em público e com sinceridade — é combustível real.", "Dê prazos curtos e visíveis; prazo longo se dissolve.", "Traga o pedido com entusiasmo, não com planilha.", "Cobre por escrito, mas sempre depois de uma conversa boa."],
    habilidades: ["Apresentações e palco", "Relacionamento e networking", "Criação e ideação", "Vendas por conexão", "Ambiente e cultura de time"],
  },
  colerico: {
    nome: "Colérico", arquetipo: "O Guerreiro", figuras: "Guerreiro · Conquistador · Comandante", cor: "#ff6b6b",
    resumo: "Força, direção e combate. Vê o alvo, decide rápido e puxa o grupo para o resultado sem esperar consenso.",
    percepcao: { intensidade: "Filtra o mundo por objetivo: registra o que atrapalha ou acelera a meta e ignora o resto.", duracao: "Reage forte no momento e vira a página; o que fica não é a mágoa, é a lição prática." },
    reacao: { velocidade: "Imediata. Decide com pouca informação e corrige no caminho — esperar lhe custa mais que errar.", direcao: "Para fora, em confronto: enfrenta, questiona e assume o comando da situação." },
    energia: { ritmo: "Alta velocidade e alto volume, com foco em entrega. Aguenta jornada dura quando o alvo é claro.", motivacao: "Desafio grande, autonomia e vitória. Meta pequena o desmotiva mais que meta impossível." },
    expressao: { tom: "Direto e impositivo. Frases curtas, poucas voltas, foco no que fazer agora.", abertura: "Baixa. Fala de planos com facilidade e de vulnerabilidade com dificuldade." },
    relacoes: { foco: "Liderar pessoas rumo a um objetivo. Respeita quem entrega e se impacienta com quem enrola.", conflitos: "Enfrenta de frente e resolve na hora. Prefere a briga honesta ao silêncio educado." },
    luzSombra: { virtudes: ["Coragem para decidir", "Resiliência sob pressão", "Liderança natural", "Foco em resultado"], sombras: ["Impaciência e dureza no trato", "Orgulho — dificuldade em admitir erro", "Atropela pessoas para chegar antes", "Assume demais e delega de menos"] },
    desejo: { busca: "Impacto e vitória — deixar marca e provar que era possível.", valor: "Justiça. Decide pelo que é certo e eficaz." },
    medo: "Perder o controle ou parecer fraco. Depender de alguém o incomoda mais que o próprio esforço.",
    jornada: "Aprender a mansidão: ganhar sem atropelar, ouvir antes de decidir.",
    comoLidar: ["Vá direto ao ponto: contexto em 2 linhas, pedido claro.", "Traga o resultado esperado, não o passo a passo.", "Dê autonomia e cobre pelo fim, não pelo meio.", "Discorde com dados e firmeza — respeita quem se posiciona."],
    habilidades: ["Liderança e decisão", "Negociação e fechamento", "Execução sob pressão", "Reestruturação e virada de jogo", "Definição de meta e prioridade"],
  },
  melancolico: {
    nome: "Melancólico", arquetipo: "O Sábio", figuras: "Sábio · Guardião · Arquiteto", cor: "#7a5cff",
    resumo: "Profundidade, ordem e preservação. Enxerga o detalhe que ninguém viu e sustenta o padrão de qualidade do time.",
    percepcao: { intensidade: "Sensibilidade alta e fina: capta subtexto, tom de voz e incoerência que passam despercebidos aos outros.", duracao: "O impacto permanece. Uma frase dita sem pensar pode ecoar por semanas." },
    reacao: { velocidade: "Precisa de tempo. Silencia, processa por dentro e só depois responde — às vezes dias depois.", direcao: "Para dentro: análise, recolhimento e, quando ferido, mágoa guardada." },
    energia: { ritmo: "Precisão e profundidade acima de volume. Trabalha devagar e refaz até ficar certo.", motivacao: "Ordem interna, sentido e excelência. Fazer bem feito importa mais do que fazer rápido." },
    expressao: { tom: "Suave e contido, às vezes monótono. Escolhe as palavras com cuidado e escreve melhor do que fala.", abertura: "Restrita e seletiva: abre profundamente, mas só com quem provou ser seguro." },
    relacoes: { foco: "Acolher poucos indivíduos com profundidade. Prefere um vínculo verdadeiro a dez superficiais.", conflitos: "Recolhe-se. Evita o confronto direto e pode punir pelo silêncio; precisa ser convidado a falar." },
    luzSombra: { virtudes: ["Excelência e atenção ao detalhe", "Lealdade profunda", "Análise e pensamento estruturado", "Compromisso com o que promete"], sombras: ["Perfeccionismo que trava a entrega", "Pessimismo e ruminação", "Autocrítica excessiva", "Guarda mágoa e se isola"] },
    desejo: { busca: "Verdade e perfeição — que as coisas sejam íntegras e bem feitas.", valor: "Integridade. Decide pelo que é correto e coerente." },
    medo: "Ser incompreendido ou errar em público. A exposição do erro dói mais que o próprio erro.",
    jornada: "Aprender a esperança e a leveza: entregar o bom em vez de esperar o perfeito.",
    comoLidar: ["Dê contexto completo e prazo real — pressa sem explicação o trava.", "Avise mudanças com antecedência; surpresa custa caro.", "Critique o trabalho em particular e com critério, nunca em grupo.", "Peça a opinião dele explicitamente: ele tem, mas não oferece."],
    habilidades: ["Qualidade e revisão", "Planejamento e processo", "Análise de dados", "Escrita e documentação", "Pesquisa e diagnóstico"],
  },
  fleumatico: {
    nome: "Fleumático", arquetipo: "O Pacificador", figuras: "Pacificador · Diplomata · Âncora", cor: "#31d0aa",
    resumo: "Estabilidade, suporte e neutralidade. É o chão que não treme: mantém o time inteiro quando tudo está tenso.",
    percepcao: { intensidade: "Baixa reatividade. Absorve o estímulo sem se abalar; o ambiente raramente o desequilibra.", duracao: "Nem muito intenso nem muito duradouro — deixa passar sem alimentar." },
    reacao: { velocidade: "Lenta e ponderada. Espera a poeira baixar antes de se posicionar.", direcao: "Para dentro, sem mágoa: recua, acomoda e busca o caminho de menor atrito." },
    energia: { ritmo: "Constante e previsível. Não tem picos, mas entrega todo dia — a régua não oscila.", motivacao: "Paz, previsibilidade e ser útil a quem gosta. Ambiente tenso drena mais que carga de trabalho." },
    expressao: { tom: "Calmo e ameno, volume baixo, bom humor discreto e irônico.", abertura: "Ouve muito e fala pouco de si; costuma ser o confidente, raramente o confidente de alguém." },
    relacoes: { foco: "Manter a harmonia e apoiar sem protagonismo. É o mediador natural entre os extremos.", conflitos: "Foge pacificamente: cede, adia ou desvia — evitar o atrito vale mais que ganhar a discussão." },
    luzSombra: { virtudes: ["Equilíbrio emocional", "Paciência e escuta genuína", "Confiabilidade e constância", "Mediação natural de conflitos"], sombras: ["Procrastinação e falta de iniciativa", "Evita posicionar-se quando é preciso", "Acomodação — aceita o ruim para não brigar", "Teimosia passiva"] },
    desejo: { busca: "Segurança e paz — um mundo sem sobressaltos.", valor: "Harmonia. Decide pelo que preserva a relação." },
    medo: "Viver em conflito ou caos. Ser forçado a escolher um lado o paralisa.",
    jornada: "Aprender a ação e o posicionamento: dizer o que pensa e começar sem esperar o momento perfeito.",
    comoLidar: ["Peça a opinião diretamente — ele não disputa espaço para falar.", "Divida tarefas grandes em passos com data; ele executa bem o que é claro.", "Evite pressão e tom agressivo: fecha em vez de acelerar.", "Reconheça a constância dele, que costuma passar despercebida."],
    habilidades: ["Mediação e relacionamento", "Atendimento e suporte", "Rotinas e operação estável", "Escuta e leitura de clima", "Trabalho em equipe"],
  },
};

export const ORDEM_TEMP: TempKey[] = ["sanguineo", "colerico", "melancolico", "fleumatico"];

// 32 afirmações (8 por temperamento), cobrindo as 6 áreas. Nota 1 a 5.
export const QUESTOES_TEMP: string[] = [
  "Quando algo me anima, todo mundo em volta percebe na hora",
  "Decido rápido, mesmo sem ter todas as informações",
  "Uma crítica mal colocada fica na minha cabeça por dias",
  "Prefiro ceder a entrar numa discussão",
  "Faço amizade com facilidade, em qualquer ambiente",
  "Quando alguém enrola, eu assumo e faço",
  "Reviso várias vezes antes de considerar algo pronto",
  "Dificilmente perco a paciência com alguém",
  "Falo o que sinto no momento em que sinto",
  "Gosto de estar no comando das decisões",
  "Percebo detalhes e incoerências que passam despercebidos",
  "Mantenho o mesmo ritmo todos os dias, sem grandes picos",
  "Começo muitos projetos e nem sempre termino",
  "Prefiro a briga honesta ao silêncio educado",
  "Preciso de tempo sozinho para processar o que aconteceu",
  "As pessoas me procuram quando precisam desabafar",
  "Reconhecimento em público me motiva de verdade",
  "Meta pequena me desmotiva mais do que meta difícil",
  "Trabalho melhor quando tenho processo e padrão definidos",
  "Evito assumir a frente, prefiro apoiar quem está liderando",
  "Conto histórias e uso humor para explicar as coisas",
  "Tenho pouca paciência com reuniões longas e sem decisão",
  "Guardo mágoa por mais tempo do que gostaria",
  "Consigo manter a calma quando todos estão nervosos",
  "Mudo de assunto e de interesse com facilidade",
  "Aceito mais responsabilidade do que caberia em mim",
  "Fico desconfortável quando algo é entregue abaixo do padrão",
  "Adio decisões difíceis esperando o momento certo",
  "Prefiro conversar a escrever",
  "Quando discordo, eu falo na hora, mesmo que gere atrito",
  "Prefiro escrever a falar — organizo melhor o pensamento",
  "Raramente sou eu quem começa uma mudança",
];

// Gabarito: cada questão pertence a um temperamento (mesma ordem acima).
export const GABARITO_TEMP: TempKey[] = [
  "sanguineo", "colerico", "melancolico", "fleumatico",
  "sanguineo", "colerico", "melancolico", "fleumatico",
  "sanguineo", "colerico", "melancolico", "fleumatico",
  "sanguineo", "colerico", "melancolico", "fleumatico",
  "sanguineo", "colerico", "melancolico", "fleumatico",
  "sanguineo", "colerico", "melancolico", "fleumatico",
  "sanguineo", "colerico", "melancolico", "fleumatico",
  "sanguineo", "colerico", "melancolico", "fleumatico",
];

export function calcularTemperamento(respostas: number[]): Record<TempKey, number> {
  const soma: Record<TempKey, number> = { sanguineo: 0, colerico: 0, melancolico: 0, fleumatico: 0 };
  const qtd: Record<TempKey, number> = { sanguineo: 0, colerico: 0, melancolico: 0, fleumatico: 0 };
  respostas.forEach((v, i) => {
    const k = GABARITO_TEMP[i];
    if (!k || !v) return;
    soma[k] += v; qtd[k] += 1;
  });
  const out = {} as Record<TempKey, number>;
  for (const k of ORDEM_TEMP) out[k] = qtd[k] ? Math.round((soma[k] / (qtd[k] * 5)) * 100) : 0;
  return out;
}

// Dominante + apoio (o segundo entra quando chega perto do primeiro — quase ninguém é puro).
export function montarTemperamento(scores: Record<TempKey, number>) {
  const ord = [...ORDEM_TEMP].sort((a, b) => scores[b] - scores[a]);
  const dominante = ord[0];
  const apoio = scores[ord[1]] >= scores[dominante] * 0.8 ? ord[1] : null;
  return { dominante, apoio, scores, rotulo: apoio ? `${TEMPERAMENTOS[dominante].nome}-${TEMPERAMENTOS[apoio].nome}` : TEMPERAMENTOS[dominante].nome };
}
