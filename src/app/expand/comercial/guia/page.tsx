"use client";

import { useState } from "react";
import { NIVEIS, BADGES } from "@/lib/expand-comercial-game";

/* ───────────── Passo a passo de acesso ao cliente ───────────── */
type Passo = {
  num: string;
  titulo: string;
  onde: string;
  etapas: { label: string; detalhe: string }[];
  dica?: string;
};

const PASSOS: Passo[] = [
  {
    num: "01",
    titulo: "Criar o cliente no board",
    onde: "expand.hshs.com.br/expand/board",
    etapas: [
      { label: "Acessar o board", detalhe: 'Abrir /expand/board e clicar em "+ Novo cliente".' },
      { label: "Preencher dados básicos", detalhe: "Nome da empresa, segmento, produto (PIDE Anual ou Semestral) e maturidade." },
      { label: "Salvar e abrir o hub", detalhe: "O card aparece na coluna Onboarding. Clicar no card para abrir o hub completo do cliente." },
    ],
    dica: "O produto escolhido determina a esteira de tarefas criada automaticamente.",
  },
  {
    num: "02",
    titulo: "Configurar o Google Drive",
    onde: "Hub do cliente → aba Drive",
    etapas: [
      { label: "Criar estrutura de pastas", detalhe: 'Na aba Drive, clicar em "Criar estrutura Drive". O sistema cria automaticamente as pastas padrão e salva o link.' },
      { label: "Verificar o link", detalhe: "O link da pasta raiz do cliente aparece e pode ser aberto direto do hub." },
      { label: "Copiar modelos", detalhe: "Usar os botões de modelo (proposta, briefing) para copiar documentos padrão para a pasta do cliente." },
    ],
    dica: "A estrutura só é criada uma vez. Se já existir, o botão mostra 'Abrir Drive'.",
  },
  {
    num: "03",
    titulo: "Conectar o grupo de WhatsApp",
    onde: "Hub do cliente → aba Grupo",
    etapas: [
      { label: "Selecionar o grupo", detalhe: "Usar o campo de busca para localizar o grupo. Digitar o nome ou trecho do nome do cliente." },
      { label: "Confirmar o link de convite", detalhe: "Ao selecionar o grupo, o link de convite é preenchido automaticamente. Conferir e salvar." },
      { label: "Enviar boas-vindas", detalhe: 'Clicar no botão "Boas-vindas ao grupo". O sistema envia a mensagem de boas-vindas automática com o nome do cliente.' },
    ],
    dica: "Grupo não criado ainda? Criar no WhatsApp, adicionar o número da instância e depois repetir esta etapa.",
  },
  {
    num: "04",
    titulo: "Enviar acesso ao portal",
    onde: "Hub do cliente → aba Configurações",
    etapas: [
      { label: "Copiar o link do portal", detalhe: "No topo da aba Configurações, o link do portal do cliente já está disponível para copiar." },
      { label: "Enviar no grupo", detalhe: 'Voltar para a aba Grupo e clicar em "Enviar onboarding". A mensagem inclui o link do portal automaticamente.' },
      { label: "Orientar o cliente", detalhe: "O cliente acessa o portal com o e-mail cadastrado. Se tiver dúvida, o link de convite serve como entrada direta." },
    ],
    dica: "O portal mostra apenas o que é seguro para o cliente ver (sem valores internos ou dados de equipe).",
  },
  {
    num: "05",
    titulo: "Solicitar os diagnósticos",
    onde: "Hub do cliente → aba Diagnósticos",
    etapas: [
      { label: "Enviar link do Temperamento", detalhe: "Clicar no botão de link do diagnóstico de Temperamento e enviar para o responsável da empresa cliente." },
      { label: "Enviar link do Arquétipo de Marca", detalhe: "Repetir para o diagnóstico de Arquétipo. Idealmente o dono da empresa e pelo menos um sócio ou responsável de marketing preenchem." },
      { label: "Acompanhar os resultados", detalhe: "Quando preenchidos, os cards com os resultados aparecem na aba Diagnósticos. Consultar antes de cada reunião de estratégia." },
    ],
    dica: "Os resultados de Temperamento e Arquétipo revelam como o cliente toma decisão e como se comunica — use nas devolutivas e no tom de entrega.",
  },
  {
    num: "06",
    titulo: "Agendar a reunião de onboarding",
    onde: "Hub do cliente → aba Grupo → Reuniões",
    etapas: [
      { label: "Preencher título, data e hora", detalhe: 'Clicar em "Nova reunião", escolher "Reunião de onboarding" como título e definir a data.' },
      { label: "Gerar link do Meet", detalhe: "Clicar em Agendar. O sistema cria o evento no Google Calendar e gera o link do Google Meet automaticamente." },
      { label: "Enviar no grupo", detalhe: "Marcar a opção de envio no grupo — a mensagem com data, hora e link do Meet vai direto para o grupo do WhatsApp do cliente." },
    ],
    dica: "Para que o Meet funcione, Google Calendar precisa estar conectado em /expand/integracoes com permissão calendar.events.",
  },
  {
    num: "07",
    titulo: "Monitorar a esteira de tarefas",
    onde: "expand.hshs.com.br/expand/board e /expand/v2",
    etapas: [
      { label: "Verificar as etapas criadas", detalhe: "Abrir o card do cliente no board. As etapas do produto devem aparecer na lateral direita." },
      { label: "Atribuir responsáveis", detalhe: "Para cada etapa, definir o membro da equipe responsável e o prazo (SLA)." },
      { label: "Acompanhar o progresso", detalhe: "As etapas concluídas avançam o status do card. Etapas atrasadas ficam destacadas no board." },
    ],
    dica: "Reuniões com o cliente + registros de transcricao na aba Reuniões alimentam o histórico para análise futura.",
  },
];

/* ───────────── Guia do sistema de XP (seção secundária) ───────────── */
type Sec = { id: string; titulo: string; sub: string; itens: { t: string; d: string; cor?: string }[] };

const SECS_XP: Sec[] = [
  {
    id: "xp",
    titulo: "Como o XP funciona",
    sub: "Pontuação diária e meta",
    itens: [
      { t: "Meta diária (65% do máximo)", d: "Cada dia tem um teto de XP calculado pelas missões disponíveis naquele dia útil. A meta diária é 65% desse teto arredondado para múltiplo de 5.", cor: "var(--accent)" },
      { t: "Missão de check (checkbox)", d: "Vale XP × 1. Ou você fez ou não fez. Registre no final do dia.", cor: "var(--c-rit)" },
      { t: "Missão de contador (ctr)", d: "Tem uma meta numérica. Cada unidade vale o XP unitário. Limitado a 3× o alvo para evitar inflação.", cor: "var(--c-out)" },
      { t: "Sequência (streak)", d: "Dias úteis consecutivos em que você bateu a meta. Feriado não conta nem quebra.", cor: "var(--dourado)" },
    ],
  },
  {
    id: "luiz",
    titulo: "Missões do Luiz · CSO",
    sub: "O que muda a cada dia da semana",
    itens: [
      { t: "Seg–Sex · Lista de amanhã pronta (15 XP)", d: "Montar a lista de empresas do ICP que serão abordadas no dia seguinte.", cor: "var(--c-rit)" },
      { t: "Seg–Sex · Convites outbound (6 XP/un)", d: "Direct ou WhatsApp para empresas que nunca ouviram falar da Expand. Elogio específico e verdadeiro em cada um.", cor: "var(--c-out)" },
      { t: "Seg–Sex · Convites inbound (5 XP/un)", d: "Novos seguidores, quem viu stories, comentou ou chegou por lead de tráfego.", cor: "var(--c-in)" },
      { t: "Seg–Sex · Follow-ups da régua (10 XP/un)", d: "Toques do dia: D+1, D+3, D+7, D+14. Nenhum sai sem próximo passo.", cor: "var(--ouro)" },
      { t: "Seg–Sex · Reuniões de diagnóstico (45 XP/un)", d: "Conduzidas pelo Método 3F, gravadas sempre.", cor: "var(--dourado)" },
      { t: "Qua · Pedidos de indicação (20 XP/un · meta 2)", d: "Para clientes ativos com entrega em dia e resultado apresentado.", cor: "var(--c-ind)" },
      { t: "Seg–Sex · CRM atualizado (10 XP)", d: "Mover estágios do pipeline e registrar o que aconteceu.", cor: "var(--c-rit)" },
    ],
  },
  {
    id: "pedro",
    titulo: "Missões do Pedro · CEO",
    sub: "Estratégia, conteúdo e carteira",
    itens: [
      { t: "Seg · Pipeline revisado com o Luiz (20 XP)", d: "Cada oportunidade em aberto: onde está, próximo passo, data.", cor: "var(--c-rit)" },
      { t: "Seg, Qua, Sex · Conteúdo publicado (30 XP)", d: "Reel de topo de funil que nomeia o problema sem vender a solução.", cor: "var(--c-in)" },
      { t: "Ter, Qui · Reunião de diagnóstico (30 XP/un · meta 1)", d: "Contas maiores ou indicações estratégicas.", cor: "var(--dourado)" },
      { t: "Qui · Ouvir gravação do Luiz (20 XP)", d: "30 min de reunião real com anotação de um ponto a corrigir.", cor: "var(--c-rit)" },
      { t: "Seg–Sex · Follow-up de conta em negociação (12 XP/un · meta 3)", d: "Um áudio do CEO destrava o que três mensagens do comercial não destravam.", cor: "var(--ouro)" },
      { t: "Seg–Sex · Contato com carteira ativa (15 XP/un · meta 1)", d: "Uma conversa com dono de cliente ativo, sem pauta de cobrança.", cor: "var(--c-ind)" },
      { t: "Qua · Indicação pedida a cliente ativo (20 XP/un · meta 1)", d: "Pedido feito por você ao dono da empresa cliente.", cor: "var(--c-ind)" },
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
      { t: "09:00 · Bloco de prospecção (60–90 min)", d: "Outbound e inbound em foco total. Sem e-mail, sem reunião interna.", cor: "var(--c-out)" },
      { t: "11:00 · Reunião de diagnóstico (quando agendada)", d: "Método 3F do início ao fim. Gravação ligada antes de apertar videochamada.", cor: "var(--dourado)" },
      { t: "14:00 · Follow-ups da régua (20–30 min)", d: "Executar os toques do dia e marcar o próximo passo de cada oportunidade.", cor: "var(--ouro)" },
      { t: "17:30 · Fechamento do dia (10 min)", d: "Registrar missões no placar, montar a lista do dia seguinte, atualizar o CRM.", cor: "var(--c-rit)" },
    ],
  },
];

/* ─────────────────────── Componentes ─────────────────────── */

function CardPasso({ p, aberto, toggle }: { p: Passo; aberto: boolean; toggle: () => void }) {
  return (
    <div className="ex-acc hx-glass" style={{ marginBottom: "12px" }}>
      <button className="ex-acch" onClick={toggle} style={{ gap: "16px" }}>
        <span style={{
          minWidth: "36px", height: "36px", borderRadius: "50%",
          background: "var(--accent)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "13px", flexShrink: 0,
        }}>
          {p.num}
        </span>
        <span className="ex-acct" style={{ flex: 1 }}>
          <span className="nm">{p.titulo}</span>
          <span className="mt2" style={{ color: "var(--accent)", fontSize: "11px" }}>{p.onde}</span>
        </span>
        <span className={`ex-chev${aberto ? " open" : ""}`}>▶</span>
      </button>

      {aberto && (
        <div style={{ padding: "0 16px 16px" }}>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {p.etapas.map((e, i) => (
              <li key={i} style={{
                display: "flex", gap: "12px", alignItems: "flex-start",
                padding: "10px 0", borderBottom: i < p.etapas.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <span style={{
                  minWidth: "22px", height: "22px", borderRadius: "50%",
                  border: "1.5px solid var(--accent)", color: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: 700, flexShrink: 0, marginTop: "1px",
                }}>
                  {i + 1}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "2px" }}>{e.label}</div>
                  <div style={{ fontSize: "12px", opacity: 0.75, lineHeight: 1.5 }}>{e.detalhe}</div>
                </div>
              </li>
            ))}
          </ol>
          {p.dica && (
            <div style={{
              marginTop: "12px", padding: "10px 14px", borderRadius: "8px",
              background: "color-mix(in srgb, var(--accent) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
              fontSize: "12px", color: "var(--accent)", lineHeight: 1.5,
            }}>
              Dica: {p.dica}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccXP({ s, aberto, toggle }: { s: Sec; aberto: boolean; toggle: () => void }) {
  return (
    <div className="ex-acc hx-glass">
      <button className="ex-acch" onClick={toggle}>
        <span className="ex-acct">
          <span className="nm">{s.titulo}</span>
          <span className="mt2">{s.sub}</span>
        </span>
        <span className={`ex-chev${aberto ? " open" : ""}`}>▶</span>
      </button>
      {aberto && (
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
}

/* ─────────────────────── Página ─────────────────────── */

export default function Guia() {
  const [passoAberto, setPassoAberto] = useState<string>("01");
  const [xpAberto, setXpAberto] = useState<Record<string, boolean>>({});
  const [mostraXP, setMostraXP] = useState(false);

  return (
    <>
      <p className="hx-eyebrow">Sistema Expand · Operação</p>
      <h1 className="ex-h1">Acesso ao <span className="hx-accent-text">cliente</span></h1>
      <p className="ex-sub">
        Passo a passo completo para configurar um novo cliente no sistema — do primeiro card no board até a esteira de tarefas em andamento.
      </p>

      {/* ── Barra de progresso visual ── */}
      <div style={{
        display: "flex", gap: "6px", marginBottom: "28px",
        overflowX: "auto", paddingBottom: "4px",
      }}>
        {PASSOS.map((p) => (
          <button
            key={p.num}
            onClick={() => setPassoAberto(p.num)}
            style={{
              flex: 1, minWidth: "80px", padding: "8px 6px",
              borderRadius: "8px", border: "none", cursor: "pointer",
              background: passoAberto === p.num ? "var(--accent)" : "var(--glass-bg)",
              color: passoAberto === p.num ? "#fff" : "var(--fg)",
              fontSize: "11px", fontWeight: 600, transition: "all 0.15s",
              outline: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: "16px", marginBottom: "2px" }}>{p.num}</div>
            <div style={{ lineHeight: 1.2, fontSize: "10px", opacity: 0.9 }}>
              {p.titulo.split(" ").slice(0, 3).join(" ")}
            </div>
          </button>
        ))}
      </div>

      {/* ── Passos ── */}
      {PASSOS.map((p) => (
        <CardPasso
          key={p.num}
          p={p}
          aberto={passoAberto === p.num}
          toggle={() => setPassoAberto((a) => (a === p.num ? "" : p.num))}
        />
      ))}

      {/* ── Seção XP (recolhida por padrão) ── */}
      <div style={{ marginTop: "36px" }}>
        <button
          onClick={() => setMostraXP((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            width: "100%", padding: "12px 16px", borderRadius: "10px",
            border: "1px solid var(--border)", background: "var(--glass-bg)",
            cursor: "pointer", marginBottom: "16px", color: "var(--fg)",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "14px", flex: 1, textAlign: "left" }}>
            Sistema de XP · Jogo Comercial
          </span>
          <span style={{ fontSize: "11px", opacity: 0.6 }}>Missões, níveis e badges do placar</span>
          <span style={{ fontSize: "12px", opacity: 0.5 }}>{mostraXP ? "▲" : "▼"}</span>
        </button>

        {mostraXP && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {SECS_XP.map((s) => (
              <AccXP
                key={s.id}
                s={s}
                aberto={!!xpAberto[s.id]}
                toggle={() => setXpAberto((o) => ({ ...o, [s.id]: !o[s.id] }))}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
