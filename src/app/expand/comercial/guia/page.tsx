"use client";

import { useState } from "react";
import { JOGADORES, NIVEIS, BADGES } from "@/lib/expand-comercial-game";

type Sec = { id: string; titulo: string; sub: string; itens: { t: string; d: string; cor?: string }[] };

const SECS: Sec[] = [
  {
    id: "xp",
    titulo: "Como o XP funciona",
    sub: "Pontuação diária e meta",
    itens: [
      { t: "Meta diária (65% do máximo)", d: "Cada dia tem um teto de XP calculado pelas missões disponíveis naquele dia útil. A meta diária é 65% desse teto arredondado para múltiplo de 5. Você não precisa ser perfeito — precisa ser consistente.", cor: "var(--accent)" },
      { t: "Missão de check (checkbox)", d: "Vale XP × 1. Ou você fez ou não fez: montar a lista, atualizar o CRM, ouvir uma gravação. Registre no final do dia.", cor: "var(--c-rit)" },
      { t: "Missão de contador (ctr)", d: "Tem uma meta numérica (ex: 8 convites). Cada unidade vale o XP unitário. Você pode superar a meta — o ganho é limitado a 3× o alvo para evitar inflação.", cor: "var(--c-out)" },
      { t: "Sequência (streak)", d: "Dias úteis consecutivos em que você bateu a meta. A sequência quebra se você não bater em um dia útil. Feriado não conta nem quebra.", cor: "var(--dourado)" },
    ],
  },
  {
    id: "luiz",
    titulo: "Missões do Luiz · CSO",
    sub: "O que muda a cada dia da semana",
    itens: [
      { t: "Seg–Sex · Lista de amanhã pronta (15 XP)", d: "Ao final do dia, montar a lista de empresas do ICP que serão abordadas no dia seguinte. Sem ela o bloco das 9h vira meia hora procurando perfil.", cor: "var(--c-rit)" },
      { t: "Seg–Sex · Convites outbound (6 XP/un · meta varia)", d: "Direct ou WhatsApp para empresas que nunca ouviram falar da Expand. Elogio específico e verdadeiro em cada um. Meta calculada pelo volume semanal da calculadora.", cor: "var(--c-out)" },
      { t: "Seg–Sex · Convites inbound (5 XP/un · meta varia)", d: "Novos seguidores, quem viu stories, comentou ou chegou por lead de tráfego. Lead de formulário responde em até 10 min.", cor: "var(--c-in)" },
      { t: "Seg–Sex · Follow-ups da régua (10 XP/un)", d: "Toques do dia: D+1, D+3, D+7, D+14. Nenhum sai do bloco sem próximo passo com dia e hora marcados.", cor: "var(--ouro)" },
      { t: "Seg–Sex · Reuniões de diagnóstico (45 XP/un)", d: "Conduzidas pelo Método 3F, gravadas sempre. A gravação permite corrigir o script pelo que realmente aconteceu.", cor: "var(--dourado)" },
      { t: "Qua · Pedidos de indicação (20 XP/un · meta 2)", d: "Para clientes ativos com entrega em dia e ao menos um resultado apresentado. Feito pelo CS, não pelo comercial.", cor: "var(--c-ind)" },
      { t: "Seg–Sex · CRM atualizado (10 XP)", d: "Mover estágios do pipeline e registrar o que aconteceu. Contato sem próximo passo é contato perdido que parece ativo.", cor: "var(--c-rit)" },
    ],
  },
  {
    id: "pedro",
    titulo: "Missões do Pedro · CEO",
    sub: "Estratégia, conteúdo e carteira",
    itens: [
      { t: "Seg · Pipeline revisado com o Luiz (20 XP)", d: "Cada oportunidade em aberto: onde está, próximo passo, data. Oportunidade sem data ganha uma ou sai do funil.", cor: "var(--c-rit)" },
      { t: "Seg, Qua, Sex · Conteúdo publicado (30 XP)", d: "Reel de topo de funil que nomeia o problema sem vender a solução. Alimenta o inbound do Luiz daqui a 45 dias.", cor: "var(--c-in)" },
      { t: "Ter, Qui · Reunião de diagnóstico (30 XP/un · meta 1)", d: "Contas maiores ou indicações estratégicas onde a presença do CEO muda a percepção de valor.", cor: "var(--dourado)" },
      { t: "Qui · Ouvir gravação do Luiz (20 XP)", d: "30 min de reunião real com anotação de um ponto a corrigir. O feedback é para o próximo encontro de pipeline.", cor: "var(--c-rit)" },
      { t: "Seg–Sex · Follow-up de conta em negociação (12 XP/un · meta 3)", d: "Oportunidades de ticket maior paradas. Um áudio do CEO destrava o que três mensagens do comercial não destravam.", cor: "var(--ouro)" },
      { t: "Seg–Sex · Contato com carteira ativa (15 XP/un · meta 1)", d: "Uma conversa com dono de cliente ativo, sem pauta de cobrança. Alimenta renovação, indicação e depoimento.", cor: "var(--c-ind)" },
      { t: "Qua · Indicação pedida a cliente ativo (20 XP/un · meta 1)", d: "Pedido feito por você ao dono da empresa cliente. Sai com apresentação em grupo, não com contato solto.", cor: "var(--c-ind)" },
      { t: "Seg–Sex · Pendência comercial destravada (15 XP/un · meta 1)", d: "Proposta parada, condição fora da tabela, dúvida de escopo — o que só você decide e está segurando o Luiz.", cor: "var(--c-out)" },
    ],
  },
  {
    id: "niveis",
    titulo: "Níveis de evolução",
    sub: "XP acumulado no ciclo",
    itens: NIVEIS.map(([xp, nome]) => ({
      t: `${nome}`,
      d: xp === 0 ? "Ponto de partida — o primeiro dia já sai do zero." : `A partir de ${xp.toLocaleString("pt-BR")} XP acumulados no ciclo.`,
      cor: "var(--accent)",
    })),
  },
  {
    id: "badges",
    titulo: "Badges desbloqueáveis",
    sub: "Conquistas permanentes",
    itens: BADGES.map((b) => ({ t: `${b.i} ${b.n}`, d: b.c, cor: "var(--dourado)" })),
  },
  {
    id: "rotina",
    titulo: "Rotina do dia comercial",
    sub: "Blocos sugeridos",
    itens: [
      { t: "09:00 · Bloco de prospecção (60–90 min)", d: "Outbound e inbound em foco total. Sem e-mail, sem reunião interna. A lista já está pronta do dia anterior.", cor: "var(--c-out)" },
      { t: "11:00 · Reunião de diagnóstico (quando agendada)", d: "Método 3F do início ao fim. Gravação ligada antes de apertar videochamada.", cor: "var(--dourado)" },
      { t: "14:00 · Follow-ups da régua (20–30 min)", d: "Executar os toques do dia e marcar o próximo passo de cada oportunidade.", cor: "var(--ouro)" },
      { t: "17:30 · Fechamento do dia (10 min)", d: "Registrar missões no placar, montar a lista do dia seguinte, atualizar o CRM.", cor: "var(--c-rit)" },
    ],
  },
];

export default function Guia() {
  const [aberto, setAberto] = useState<Record<string, boolean>>({ xp: true });

  return (
    <>
      <p className="hx-eyebrow">Sistema Comercial · Referência</p>
      <h1 className="ex-h1">Guia do <span className="hx-accent-text">sistema</span></h1>
      <p className="ex-sub">Como funciona o XP, as missões de cada jogador, os níveis e os badges. Leia uma vez — depois o placar fala por si.</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {Object.entries(JOGADORES).map(([k, j]) => (
          <div key={k} className="hx-glass" style={{ padding: "10px 16px", borderLeft: `3px solid ${j.c}`, minWidth: 160 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{j.n}</div>
            <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{j.r}</div>
          </div>
        ))}
      </div>

      {SECS.map((s) => {
        const isOpen = !!aberto[s.id];
        return (
          <div key={s.id} className="ex-acc hx-glass">
            <button className="ex-acch" onClick={() => setAberto((o) => ({ ...o, [s.id]: !o[s.id] }))}>
              <span className="ex-acct">
                <span className="nm">{s.titulo}</span>
                <span className="mt2">{s.sub}</span>
              </span>
              <span className={`ex-chev${isOpen ? " open" : ""}`}>▶</span>
            </button>
            {isOpen && (
              <div>
                {s.itens.map((it, i) => (
                  <div key={i} className="ex-mv">
                    <div className="ex-mvl">
                      <div className="mn" style={{ color: it.cor }}><i>›</i>{it.t}</div>
                      <div className="md">{it.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
