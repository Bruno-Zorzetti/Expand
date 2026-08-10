// DISC moderno por BLENDA (perfis compostos) — a leitura isolada de uma letra ficou
// ultrapassada. Estrutura de análise definida pelo Bruno: 5 áreas.
import type { DiscKey } from "./expand-disc";

export type Blenda = {
  cod: string;
  nome: string;          // o papel profissional nomeado
  cor: string;
  tipo: "reforco" | "tensao";
  dinamica: string;      // 1 · como as duas letras se casam
  decisao: string;       // 3 · o duplo filtro
  comunicacao: string;   // 4 · como conversa e lida com atrito
  comoFalar: string;     // 4b · guia prático para quem convive
  custo: string;         // 5 · custo energético / quando trava
};

export const LETRA: Record<DiscKey, { nome: string; ritmo: string; foco: string }> = {
  D: { nome: "Dominância", ritmo: "rápido", foco: "tarefa" },
  I: { nome: "Influência", ritmo: "rápido", foco: "pessoas" },
  S: { nome: "Estabilidade", ritmo: "ponderado", foco: "pessoas" },
  C: { nome: "Conformidade", ritmo: "ponderado", foco: "tarefa" },
};

export const BLENDAS: Record<string, Blenda> = {
  DI: { cod: "DI", nome: "O Empreendedor", cor: "#ff6b6b", tipo: "reforco",
    dinamica: "Reforço: as duas são rápidas. O D traz o alvo e a decisão; o I traz a lábia e o magnetismo. Resultado: alguém que abre portas e fecha no mesmo movimento.",
    decisao: "Decide rápido e no instinto, validando pela reação das pessoas. Erra por excesso de otimismo, raramente por lentidão.",
    comunicacao: "Alterna canais: começa entusiasmado e magnético (I) e vira direto e cortante (D) se for contrariado ou o prazo apertar.",
    comoFalar: "Traga a oportunidade grande e o resultado em números. Seja breve. Se discordar, discorde com dado e firmeza — ele respeita quem se posiciona.",
    custo: "Cansa em tarefa repetitiva e detalhe fino (C baixo). Sob estresse, atropela o processo e promete além do que a operação entrega." },
  ID: { cod: "ID", nome: "O Promotor", cor: "#ffc24b", tipo: "reforco",
    dinamica: "Reforço com o I na frente: primeiro encanta, depois cobra. Vende a visão antes de impor a direção.",
    decisao: "Decide pelo entusiasmo e pela leitura social da sala; a firmeza do D entra só quando a coisa trava.",
    comunicacao: "Muito expressivo e persuasivo; sob pressão endurece o tom, mas volta rápido ao bom humor.",
    comoFalar: "Comece pelo entusiasmo e pelo impacto nas pessoas, depois traga a meta. Reconhecimento público funciona melhor que cobrança.",
    custo: "Perde energia em rotina e controle. Sob estresse, dispersa e deixa pontas soltas." },
  DS: { cod: "DS", nome: "O Realizador", cor: "#e0704f", tipo: "tensao",
    dinamica: "Tensão interna positiva: a pressa do D convive com a paciência do S. Empurra forte, mas sustenta o time — executa sem quebrar a relação.",
    decisao: "Duplo filtro: precisa ser eficaz (D) e sustentável para as pessoas (S). Decide rápido no que é técnico e devagar no que mexe com gente.",
    comunicacao: "Direto, porém sem estardalhaço. Não faz drama e evita o confronto público, mas não recua do que decidiu.",
    comoFalar: "Traga metas ambiciosas, mas dê tempo para ele planejar a execução com segurança. Evite mudar a rota toda semana.",
    custo: "Trava quando é forçado a escolher entre velocidade e cuidado com a equipe. Sob estresse, absorve trabalho demais em silêncio." },
  SD: { cod: "SD", nome: "O Diretor Confiável", cor: "#31d0aa", tipo: "tensao",
    dinamica: "Base estável com força de execução por baixo: parece calmo, mas não cede no que é essencial.",
    decisao: "Pondera primeiro, decide firme depois. Prefere um passo certo a três incertos.",
    comunicacao: "Fala pouco e pesa muito quando fala. Evita atrito, mas quando se posiciona, mantém.",
    comoFalar: "Avise mudanças com antecedência e explique o porquê. Peça a opinião — ele tem, mas não disputa espaço para dar.",
    custo: "Sofre em ambiente caótico e de mudança constante. Sob estresse, fica teimoso de forma passiva." },
  DC: { cod: "DC", nome: "O Estrategista", cor: "#a05cff", tipo: "reforco",
    dinamica: "Reforço no foco em tarefa: o D quer o resultado, o C quer o resultado certo. Alta exigência consigo e com os outros.",
    decisao: "Duplo filtro: rápido, mas só depois de conferir os números. Se o dado não fecha, ele não anda.",
    comunicacao: "Objetivo e crítico. Argumenta com fatos e tem pouca paciência com achismo.",
    comoFalar: "Leve dados prontos e o raciocínio da decisão. Nada de 'eu acho'. Vá direto ao ponto.",
    custo: "Baixa tolerância a erro e a gente devagar. Sob estresse, vira controlador e ríspido." },
  CD: { cod: "CD", nome: "O Perfeccionista Executivo", cor: "#7a5cff", tipo: "reforco",
    dinamica: "O C na frente: primeiro a análise, depois a força. Só decide quando o cenário está claro — mas aí executa sem hesitar.",
    decisao: "Precisa de evidência antes de agir; o D entra para não deixar a análise virar paralisia.",
    comunicacao: "Preciso e formal, com senso crítico afiado. Pode soar frio sem intenção.",
    comoFalar: "Dê contexto completo e prazo real. Critique o trabalho com critério e em particular.",
    custo: "Trava com prazo curto e informação incompleta. Sob estresse, refaz o que já estava bom." },
  IS: { cod: "IS", nome: "O Conselheiro", cor: "#ffd27a", tipo: "reforco",
    dinamica: "Reforço no foco em pessoas: o calor do I com a constância do S. Cria clima bom e sustenta relação a longo prazo.",
    decisao: "Decide pelo impacto humano; adia o que gera conflito. Precisa de aval do grupo para se sentir seguro.",
    comunicacao: "Acolhedora e informal. Evita confronto e busca sempre o consenso.",
    comoFalar: "Comece pela pessoa e pelo time, depois pela tarefa. Peça compromisso explícito com data — senão escorrega.",
    custo: "Sofre com cobrança dura e com decisões impopulares. Sob estresse, promete para agradar." },
  SI: { cod: "SI", nome: "O Facilitador", cor: "#8fe3c4", tipo: "reforco",
    dinamica: "Estabilidade com simpatia: o time inteiro se apoia nele sem que ele peça holofote.",
    decisao: "Ponderada e coletiva; leva o tempo que precisar para não desagradar.",
    comunicacao: "Calma, amigável e paciente. Ouve mais do que fala.",
    comoFalar: "Convide a opinar diretamente e reconheça a constância dele, que costuma passar despercebida.",
    custo: "Procrastina decisão difícil. Sob estresse, some do radar em vez de confrontar." },
  IC: { cod: "IC", nome: "O Inspirador Pragmático", cor: "#c9a6ff", tipo: "tensao",
    dinamica: "Tensão interna: a informalidade do I com a rigidez do C. Encanta na frente das pessoas e cobra exatidão nos bastidores.",
    decisao: "Duplo filtro: precisa convencer (I) e estar tecnicamente correto (C). Sem um dos dois, ele não assina embaixo.",
    comunicacao: "Comunica com carisma, mas cobra dados e detalhes de quem apresenta. Pode confundir quem só viu o lado simpático.",
    comoFalar: "Traga a ideia com energia e a prova com número. Não improvise dado na frente dele.",
    custo: "Vive o atrito entre agradar e estar certo. Sob estresse, oscila entre o excesso de simpatia e a crítica dura." },
  CI: { cod: "CI", nome: "O Analista Comunicativo", cor: "#9b8cff", tipo: "tensao",
    dinamica: "O C na frente com o I de apoio: rigor técnico que sabe explicar. Traduz o complexo sem perder a precisão.",
    decisao: "Analítica primeiro, social depois. Só apresenta quando tem certeza.",
    comunicacao: "Didática e cuidadosa. Prefere preparar a improvisar.",
    comoFalar: "Dê tempo de preparo e valorize a explicação dele. Peça o raciocínio, não só a conclusão.",
    custo: "Desgasta ao ser exposto sem preparo. Sob estresse, some para revisar." },
  SC: { cod: "SC", nome: "O Especialista", cor: "#5fd6b8", tipo: "reforco",
    dinamica: "Reforço no ritmo ponderado: constância do S com precisão do C. É quem sustenta a qualidade e a rotina sem alarde.",
    decisao: "Duplo filtro: seguro para as pessoas (S) e correto nos dados (C). Se faltar um dos lados, ele trava.",
    comunicacao: "Reservada, educada e precisa. Não levanta a voz e não gosta de improviso.",
    comoFalar: "Traga processo, prazo e o porquê. Mudança de última hora precisa de explicação, senão ele resiste em silêncio.",
    custo: "Alto custo em ambiente de urgência e mudança constante. Sob estresse, paralisa esperando clareza." },
  CS: { cod: "CS", nome: "O Técnico", cor: "#4fbfe0", tipo: "reforco",
    dinamica: "O C na frente: exatidão acima de tudo, com a lealdade do S garantindo entrega consistente.",
    decisao: "Só decide com dado completo e impacto humano avaliado. É o freio de qualidade do time.",
    comunicacao: "Formal, detalhista e discreta. Documenta bem, fala pouco.",
    comoFalar: "Escreva o pedido (ele responde melhor por escrito), com critério de aceite claro.",
    custo: "Sofre com meta vaga e pressa. Sob estresse, refaz e adia a entrega." },
};

// Blenda a partir do placar DISC: as duas letras mais altas (ordem importa).
export function montarBlenda(disc: Record<DiscKey, number>) {
  const ord = (["D", "I", "S", "C"] as DiscKey[]).sort((a, b) => disc[b] - disc[a]);
  const [p, s] = ord;
  const total = disc.D + disc.I + disc.S + disc.C || 1;
  const pctPrim = Math.round((disc[p] / total) * 100);
  const puro = disc[s] < disc[p] * 0.6; // segunda letra fraca = perfil quase puro
  const cod = `${p}${s}`;
  const b = BLENDAS[cod] ?? null;
  return { primaria: p, secundaria: s, cod, blenda: b, puro, pctPrim, ordem: ord };
}
