// Motor do sistema comercial gamificado — portado do protótipo (funções puras, sem libs).

export type Plano = {
  metaACV: number; mensalAnual: number; mensalSem: number; mixAnual: number; carteiraMRR: number;
  fInbound: number; fIndic: number; fOutbound: number; fTrafego: number;
  cInbound: number; cIndic: number; cOutbound: number; cTrafego: number;
  vInbound: number; vIndic: number; vOutbound: number; vTrafego: number; noshow: number;
};
export const PADRAO: Plano = {
  metaACV: 700000, mensalAnual: 3500, mensalSem: 4000, mixAnual: 60, carteiraMRR: 52000,
  fInbound: 35, fIndic: 20, fOutbound: 30, fTrafego: 15,
  cInbound: 3, cIndic: 3, cOutbound: 5, cTrafego: 6,
  vInbound: 5, vIndic: 3, vOutbound: 10, vTrafego: 8, noshow: 20,
};

export const SEMANAS = 22, DU = 5, DIAS_TOT = SEMANAS * DU;
export const MESES = ["Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const CURVA = [0.16, 0.21, 0.23, 0.24, 0.16];
export const UTEIS = [1, 2, 3, 4, 5];
export const DIAABR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const iso = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const dtFromIso = (s: string) => { const p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); };
export const addDias = (s: string, n: number) => { const d = dtFromIso(s); d.setDate(d.getDate() + n); return iso(d); };
export const ehUtil = (s: string) => { const w = dtFromIso(s).getDay(); return w >= 1 && w <= 5; };
export const brl = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");
export const up = (n: number) => Math.ceil(n - 1e-9);

export type Funil = { k: string; cls: string; nome: string; un: string; obs: string; mix: number; conv: number; viz: number; vendas: number; reunR: number; reunA: number; convites: number; receita: number };
export type Calc = ReturnType<typeof calc>;

export function calc(s: Plano) {
  const mixA = s.mixAnual / 100, mixS = 1 - mixA;
  const cAnual = s.mensalAnual * 12, cSem = s.mensalSem * 6;
  const ticket = cAnual * mixA + cSem * mixS;
  const mensalMedio = s.mensalAnual * mixA + s.mensalSem * mixS;
  const vendas = ticket > 0 ? s.metaACV / ticket : 0;
  const soma = s.fInbound + s.fIndic + s.fOutbound + s.fTrafego;
  const norm = soma > 0 ? 100 / soma : 0;
  const ns = Math.min(Math.max(s.noshow, 0), 90) / 100;

  const defs: Funil[] = [
    { k: "in", cls: "a-in", nome: "Inbound · perfil e direct", un: "convites", obs: "Quem já te segue ou chegou pelo conteúdo.", mix: s.fInbound * norm, conv: s.cInbound, viz: s.vInbound, vendas: 0, reunR: 0, reunA: 0, convites: 0, receita: 0 },
    { k: "ind", cls: "a-ind", nome: "Indicação", un: "pedidos", obs: "A melhor conversão da casa — e a única que hoje chega por acaso.", mix: s.fIndic * norm, conv: s.cIndic, viz: s.vIndic, vendas: 0, reunR: 0, reunA: 0, convites: 0, receita: 0 },
    { k: "out", cls: "a-out", nome: "Outbound · prospecção fria", un: "convites", obs: "Não depende de audiência nem de verba. Liga e desliga sozinho.", mix: s.fOutbound * norm, conv: s.cOutbound, viz: s.vOutbound, vendas: 0, reunR: 0, reunA: 0, convites: 0, receita: 0 },
    { k: "tf", cls: "a-tf", nome: "Tráfego pago", un: "leads", obs: "Escala rápido e qualifica mal sem aquecimento por vídeo.", mix: s.fTrafego * norm, conv: s.cTrafego, viz: s.vTrafego, vendas: 0, reunR: 0, reunA: 0, convites: 0, receita: 0 },
  ];
  const tot = { vendas: 0, reunR: 0, reunA: 0, conv: 0 };
  defs.forEach((f) => {
    f.vendas = vendas * f.mix / 100;
    f.reunR = f.vendas * f.conv;
    f.reunA = ns < 1 ? f.reunR / (1 - ns) : 0;
    f.convites = f.reunA * f.viz;
    f.receita = f.vendas * ticket;
    tot.vendas += f.vendas; tot.reunR += f.reunR; tot.reunA += f.reunA; tot.conv += f.convites;
  });
  const mConv = tot.vendas > 0 ? tot.reunR / tot.vendas : 0;
  const meses = MESES.map((m, i) => { const v = vendas * CURVA[i], rest = 5 - i; return { nome: m, curva: CURVA[i], vendas: v, acv: v * ticket, restantes: rest, caixa: v * mensalMedio * rest }; });
  const caixaNovo = meses.reduce((a, b) => a + b.caixa, 0);

  return {
    ticket, mensalMedio, cAnual, cSem, vendas, defs, tot, meses, mConv, soma, ns,
    caixaNovo, caixaCarteira: s.carteiraMRR * 5,
    sem: { reunA: tot.reunA / SEMANAS, reunR: tot.reunR / SEMANAS, conv: tot.conv / SEMANAS, out: defs[2].convites / SEMANAS, inb: (defs[0].convites + defs[3].convites) / SEMANAS, ind: defs[1].convites / SEMANAS },
    dia: { conv: tot.conv / DIAS_TOT, out: defs[2].convites / DIAS_TOT, inb: (defs[0].convites + defs[3].convites) / DIAS_TOT, reunA: tot.reunA / DIAS_TOT },
  };
}

export type Missao = { id: string; t: string; d: string; xp: number; tipo: "check" | "ctr"; alvo?: number; dias: number[]; c: string };
export function missoes(jog: string, C: Calc): Missao[] {
  if (jog === "luiz") return [
    { id: "lista", t: "Lista de amanhã pronta", d: "Montar a lista de empresas do ICP que o Luiz vai abordar amanhã. Sem ela, o bloco das 9h vira meia hora procurando perfil.", xp: 15, tipo: "check", dias: UTEIS, c: "var(--c-rit)" },
    { id: "out", t: "Convites outbound", d: "Direct ou WhatsApp para empresas do ICP que nunca ouviram falar da Expand. Elogio específico e verdadeiro em cada um.", xp: 6, tipo: "ctr", alvo: Math.max(5, up(C.dia.out)), dias: UTEIS, c: "var(--c-out)" },
    { id: "inb", t: "Convites inbound", d: "Novos seguidores, quem viu stories, quem comentou e leads de tráfego. Lead de formulário responde em até 10 minutos.", xp: 5, tipo: "ctr", alvo: Math.max(5, up(C.dia.inb)), dias: UTEIS, c: "var(--c-in)" },
    { id: "fup", t: "Follow-ups da régua", d: "Executar os toques do dia: D+1, D+3, D+7, D+14. Nenhum sai do bloco sem próximo passo com dia e hora.", xp: 10, tipo: "ctr", alvo: Math.max(3, up(C.tot.reunR * 4 / DIAS_TOT)), dias: UTEIS, c: "var(--ouro)" },
    { id: "reu", t: "Reuniões de diagnóstico", d: "Conduzidas pelo Método 3F, gravadas sempre. A gravação permite corrigir o script pelo que aconteceu.", xp: 45, tipo: "ctr", alvo: Math.max(1, Math.round(C.dia.reunA)), dias: UTEIS, c: "var(--dourado)" },
    { id: "ind", t: "Pedidos de indicação", d: "Aos clientes ativos com entrega em dia e ao menos um resultado apresentado.", xp: 20, tipo: "ctr", alvo: 2, dias: [3], c: "var(--c-ind)" },
    { id: "crm", t: "CRM atualizado", d: "Mover os estágios do pipeline e registrar o que aconteceu. Contato sem próximo passo é contato perdido que parece ativo.", xp: 10, tipo: "check", dias: UTEIS, c: "var(--c-rit)" },
  ];
  return [
    { id: "pipe", t: "Pipeline revisado com o Luiz", d: "Cada oportunidade em aberto: onde está, próximo passo, data. Oportunidade sem data ganha uma ou sai do funil.", xp: 20, tipo: "check", dias: [1], c: "var(--c-rit)" },
    { id: "cont", t: "Conteúdo de atração publicado", d: "Reel de topo de funil que nomeia o problema sem vender a solução. Alimenta o inbound do Luiz daqui a 45 dias.", xp: 30, tipo: "check", dias: [1, 3, 5], c: "var(--c-in)" },
    { id: "reug", t: "Reunião de diagnóstico", d: "Contas maiores ou indicações estratégicas, onde a presença do CEO muda a percepção de valor.", xp: 30, tipo: "ctr", alvo: 1, dias: [2, 4], c: "var(--dourado)" },
    { id: "rev", t: "Ouvir uma gravação do Luiz", d: "Trinta minutos de uma reunião real, com anotação de um ponto a corrigir.", xp: 20, tipo: "check", dias: [4], c: "var(--c-rit)" },
    { id: "fupg", t: "Follow-up de conta em negociação", d: "Oportunidades de ticket maior paradas. Um áudio do CEO destrava o que três mensagens do comercial não destravam.", xp: 12, tipo: "ctr", alvo: 3, dias: UTEIS, c: "var(--ouro)" },
    { id: "cart", t: "Contato com a carteira ativa", d: "Uma conversa com dono de cliente ativo, sem pauta de cobrança. Alimenta renovação, indicação e depoimento.", xp: 15, tipo: "ctr", alvo: 1, dias: UTEIS, c: "var(--c-ind)" },
    { id: "indp", t: "Indicação pedida a cliente ativo", d: "Pedido feito por você, ao dono da empresa cliente. Sai com apresentação em grupo, não com contato solto.", xp: 20, tipo: "ctr", alvo: 1, dias: [3], c: "var(--c-ind)" },
    { id: "destrava", t: "Pendência comercial destravada", d: "Proposta parada, condição fora da tabela, dúvida de escopo — o que só você decide e está segurando o Luiz.", xp: 15, tipo: "ctr", alvo: 1, dias: UTEIS, c: "var(--c-out)" },
  ];
}

export type Reg = Record<string, Record<string, number>>; // dia -> missao -> valor
export const doDia = (jog: string, wd: number, C: Calc) => missoes(jog, C).filter((m) => m.dias.includes(wd));
export const xpMax = (jog: string, wd: number, C: Calc) => doDia(jog, wd, C).reduce((a, m) => a + m.xp * (m.tipo === "check" ? 1 : (m.alvo ?? 1)), 0);
export const metaDia = (jog: string, wd: number, C: Calc) => Math.round(xpMax(jog, wd, C) * 0.65 / 5) * 5;
export function xpDia(jog: string, dia: string, C: Calc, reg: Reg) {
  const wd = dtFromIso(dia).getDay(), r = reg[dia] || {};
  return doDia(jog, wd, C).reduce((a, m) => a + m.xp * Math.min(r[m.id] || 0, m.tipo === "check" ? 1 : (m.alvo ?? 1) * 3), 0);
}
export const bateu = (jog: string, dia: string, C: Calc, reg: Reg) => ehUtil(dia) && xpDia(jog, dia, C, reg) >= metaDia(jog, dtFromIso(dia).getDay(), C);
export function streak(jog: string, C: Calc, reg: Reg) {
  let s = 0, d = iso(new Date());
  for (let k = 0; k < 420; k++) { if (ehUtil(d)) { if (bateu(jog, d, C, reg)) s++; else if (k > 0) break; } d = addDias(d, -1); }
  return s;
}
export function maiorStreak(jog: string, C: Calc, reg: Reg) {
  const dias = Object.keys(reg).sort(); if (!dias.length) return 0;
  let melhor = 0, at = 0, d = dias[0]; const fim = iso(new Date());
  for (let k = 0; k < 800 && d <= fim; k++) { if (ehUtil(d)) { if (bateu(jog, d, C, reg)) { at++; melhor = Math.max(melhor, at); } else at = 0; } d = addDias(d, 1); }
  return melhor;
}
export function totais(reg: Reg) {
  const t = { conv: 0, reun: 0, ind: 0, fup: 0 };
  Object.values(reg).forEach((v) => { t.conv += (v.out || 0) + (v.inb || 0); t.reun += (v.reu || 0) + (v.reug || 0); t.ind += (v.ind || 0) + (v.indp || 0); t.fup += (v.fup || 0) + (v.fupg || 0) + (v.cart || 0); });
  return t;
}
export const xpTotal = (jog: string, C: Calc, reg: Reg) => Object.keys(reg).reduce((a, d) => a + xpDia(jog, d, C, reg), 0);

export const NIVEIS: [number, string][] = [[0, "Iniciante"], [600, "Prospector"], [1800, "Conector"], [4000, "Estrategista"], [8000, "Closer"], [14000, "Mestre do Funil"], [22000, "Fechador Expand"]];
export function nivel(xp: number) {
  let n = NIVEIS[0], i = 0; NIVEIS.forEach((v, k) => { if (xp >= v[0]) { n = v; i = k; } });
  const prox = NIVEIS[i + 1] || null;
  return { i: i + 1, nome: n[1], base: n[0], prox: prox ? prox[0] : null, proxNome: prox ? prox[1] : null };
}

export type Badge = { i: string; n: string; c: string; f: (t: { conv: number; reun: number; ind: number; fup: number }, m: number) => boolean };
export const BADGES: Badge[] = [
  { i: "✦", n: "Primeiro dia", c: "Bater a meta diária uma vez", f: (_t, m) => m >= 1 },
  { i: "▲", n: "Semana de fogo", c: "5 dias batidos seguidos", f: (_t, m) => m >= 5 },
  { i: "★", n: "Duas semanas", c: "10 dias seguidos", f: (_t, m) => m >= 10 },
  { i: "◈", n: "Mês inteiro", c: "20 dias seguidos", f: (_t, m) => m >= 20 },
  { i: "●", n: "100 convites", c: "Enviados no acumulado", f: (t) => t.conv >= 100 },
  { i: "◎", n: "500 convites", c: "Enviados no acumulado", f: (t) => t.conv >= 500 },
  { i: "⬢", n: "1.000 convites", c: "Enviados no acumulado", f: (t) => t.conv >= 1000 },
  { i: "◆", n: "10 reuniões", c: "Diagnósticos conduzidos", f: (t) => t.reun >= 10 },
  { i: "⬟", n: "50 reuniões", c: "Diagnósticos conduzidos", f: (t) => t.reun >= 50 },
  { i: "✧", n: "25 indicações", c: "Pedidos feitos à carteira", f: (t) => t.ind >= 25 },
  { i: "✚", n: "100 follow-ups", c: "Toques de régua executados", f: (t) => t.fup >= 100 },
  { i: "✺", n: "Semana perfeita", c: "5 de 5 dias batidos", f: (_t, m) => m >= 5 },
];

export const JOGADORES: Record<string, { n: string; r: string; ini: string; c: string }> = {
  luiz: { n: "Luiz", r: "CSO · prospecta e fecha", ini: "L", c: "var(--c-out)" },
  pedro: { n: "Pedro", r: "CEO · contas maiores e conteúdo", ini: "P", c: "var(--ouro)" },
};
