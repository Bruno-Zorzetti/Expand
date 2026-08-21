/**
 * Sincroniza o plano de ação com os dados da reunião de líderes 17/08/2026.
 * - Atualiza status de tarefas da semana passada (REALIZADO → done, ATRASADO → atrasado)
 * - Insere novas tarefas desta semana (sem duplicar por título normalizado)
 *
 * Uso: node --env-file=.env.local scripts/sync-plano-acao.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// ─── Atualizações de status da semana passada ────────────────────────────────
// Match por título normalizado (lowercase, sem espaços duplos)
const statusUpdates = [
  // REALIZADO → done
  { titulo: "CT2s no Tráfego Pago", status: "done", concluida_em: "2026-08-17" },
  { titulo: "Reunião Paulo/Barrinha Feedback", status: "done", concluida_em: "2026-08-17" },
  { titulo: "Framework Conteúdos Orgânicos", status: "done", concluida_em: "2026-08-17" },
  { titulo: "Mapeamento PDF Apostila Henrique Toledo", status: "done", concluida_em: "2026-08-17" },
  { titulo: "Vídeo depoimentos único", status: "done", concluida_em: "2026-08-17" },
  // ATRASADO
  { titulo: "Editar Vídeos Comece Aqui e do Bruno", status: "atrasado" },
  { titulo: "Edição vídeos sábado", status: "atrasado" },
  { titulo: "Cases Sucesso", status: "atrasado" },
  { titulo: "Lapidação PIDEs", status: "atrasado" },
  { titulo: "Aprimorar plataforma vendas", status: "atrasado" },
  { titulo: "Teste temperamentos clientes", status: "atrasado" },
  { titulo: "Selecionar clientes audiovisual", status: "atrasado" },
  // EM ANDAMENTO
  { titulo: "Edição CT3", status: "em_andamento" },
];

// ─── Novas tarefas desta semana ───────────────────────────────────────────────
const novasTarefas = [
  // ── PEDRO (CEO / Gestão) ────────────────────────────────────────────────────
  {
    titulo: "Definir estrutura de comissões para Luiz",
    detalhe: "Estabelecer modelo de comissionamento do CSO, incluindo percentuais e gatilhos de pagamento.",
    responsaveis: ["Pedro"],
    data_limite: "2026-08-24",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "alta",
  },
  {
    titulo: "Criar fluxo de onboarding de novos clientes",
    detalhe: "Mapear e documentar o processo de onboarding desde a venda até a primeira entrega.",
    responsaveis: ["Pedro"],
    data_limite: "2026-08-24",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "alta",
  },
  {
    titulo: "Revisar e aprovar proposta comercial padrão",
    detalhe: "Atualizar o modelo de proposta comercial com as novas condições e posicionamento.",
    responsaveis: ["Pedro"],
    data_limite: "2026-08-22",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "urgente",
  },

  // ── LUIZ (Comercial / SDR+Closer) ──────────────────────────────────────────
  {
    titulo: "Prospectar 20 novos leads qualificados",
    detalhe: "Identificar e qualificar 20 prospects alinhados ao ICP da Expand esta semana.",
    responsaveis: ["Luiz"],
    data_limite: "2026-08-22",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "urgente",
  },
  {
    titulo: "Rodar cadência de follow-up nos leads quentes",
    detalhe: "Retomar contato com leads que estavam em negociação e mover para reunião de diagnóstico.",
    responsaveis: ["Luiz"],
    data_limite: "2026-08-21",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "urgente",
  },
  {
    titulo: "Registrar todas as interações no CRM",
    detalhe: "Atualizar o pipeline no CRM com todas as conversas e status de cada lead.",
    responsaveis: ["Luiz"],
    data_limite: "2026-08-24",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "alta",
  },

  // ── DANIEL (Design) ─────────────────────────────────────────────────────────
  {
    titulo: "Finalizar identidade visual de 2 clientes pendentes",
    detalhe: "Concluir os projetos de identidade visual em aberto e entregar para aprovação.",
    responsaveis: ["Daniel"],
    data_limite: "2026-08-22",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "alta",
  },
  {
    titulo: "Criar templates de stories para clientes recorrentes",
    detalhe: "Desenvolver biblioteca de templates reutilizáveis de stories para os clientes do plano recorrente.",
    responsaveis: ["Daniel"],
    data_limite: "2026-08-24",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "normal",
  },
  {
    titulo: "Revisar manual de marca da Expand",
    detalhe: "Atualizar o brandbook com as últimas definições de tom, tipografia e uso de cores.",
    responsaveis: ["Daniel"],
    data_limite: "2026-08-28",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "normal",
  },

  // ── PAULO (Conteúdo / Vídeo) ────────────────────────────────────────────────
  {
    titulo: "Editar vídeos Comece Aqui e do Bruno",
    detalhe: "Concluir a edição dos vídeos de boas-vindas da plataforma (atrasado da semana anterior).",
    responsaveis: ["Paulo"],
    data_limite: "2026-08-21",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "urgente",
  },
  {
    titulo: "Edição vídeos do sábado",
    detalhe: "Editar os vídeos gravados no sábado e preparar para publicação.",
    responsaveis: ["Paulo"],
    data_limite: "2026-08-22",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "urgente",
  },
  {
    titulo: "Gravar conteúdo orgânico seguindo framework aprovado",
    detalhe: "Produzir os primeiros conteúdos usando o Framework de Conteúdos Orgânicos aprovado.",
    responsaveis: ["Paulo"],
    data_limite: "2026-08-24",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "alta",
  },

  // ── LETÍCIA (CS / Retenção) ─────────────────────────────────────────────────
  {
    titulo: "Cases de sucesso — coletar depoimentos",
    detalhe: "Entrar em contato com clientes selecionados para coletar depoimentos e dados de resultado.",
    responsaveis: ["Letícia"],
    data_limite: "2026-08-22",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "urgente",
  },
  {
    titulo: "Lapidação PIDEs — revisão com clientes ativos",
    detalhe: "Realizar sessão de alinhamento com clientes PIDE para refinar entregas e coletar feedbacks.",
    responsaveis: ["Letícia"],
    data_limite: "2026-08-24",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "alta",
  },
  {
    titulo: "Teste de temperamentos com clientes",
    detalhe: "Aplicar teste de perfil/temperamento com a base de clientes para personalizar comunicação.",
    responsaveis: ["Letícia"],
    data_limite: "2026-08-28",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "normal",
  },
  {
    titulo: "Selecionar clientes para audiovisual",
    detalhe: "Identificar clientes com bom perfil para gravação de depoimento em vídeo/audiovisual.",
    responsaveis: ["Letícia"],
    data_limite: "2026-08-22",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "alta",
  },

  // ── EQUIPE GERAL ─────────────────────────────────────────────────────────────
  {
    titulo: "Aprimorar plataforma de vendas",
    detalhe: "Identificar melhorias na plataforma de vendas (checkout, proposta, funil) e implementar.",
    responsaveis: ["Pedro", "Luiz"],
    data_limite: "2026-08-28",
    hora: null,
    status: "pendente",
    origem: "reuniao_lideres_17082026",
    prioridade: "alta",
  },
];

// ─── Normaliza título para comparação ────────────────────────────────────────
function norm(s) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

async function main() {
  console.log("🔄 Buscando tarefas existentes...");
  const { data: existentes, error } = await sb
    .from("expand_plano_acao")
    .select("id, titulo, status");

  if (error) {
    console.error("❌ Erro ao buscar tarefas:", error.message);
    process.exit(1);
  }

  const existentesMap = new Map(existentes.map((t) => [norm(t.titulo), t]));
  console.log(`   ${existentes.length} tarefas existentes no banco.`);

  // ── Atualizações de status ──────────────────────────────────────────────────
  console.log("\n📝 Atualizando status da semana passada...");
  let atualizadas = 0;
  let naoEncontradas = 0;

  for (const upd of statusUpdates) {
    const key = norm(upd.titulo);
    const existente = existentesMap.get(key);

    if (!existente) {
      // Busca parcial
      const parcial = existentes.find((e) => norm(e.titulo).includes(key.slice(0, 20)));
      if (!parcial) {
        console.log(`   ⚠️  Não encontrada: "${upd.titulo}"`);
        naoEncontradas++;
        continue;
      }
      const payload = { status: upd.status };
      if (upd.concluida_em) payload.concluida_em = upd.concluida_em;
      await sb.from("expand_plano_acao").update(payload).eq("id", parcial.id);
      console.log(`   ✅ Atualizada (match parcial): "${parcial.titulo}" → ${upd.status}`);
      atualizadas++;
      continue;
    }

    if (existente.status === upd.status) {
      console.log(`   ○  Sem mudança: "${upd.titulo}" (já ${upd.status})`);
      continue;
    }

    const payload = { status: upd.status };
    if (upd.concluida_em) payload.concluida_em = upd.concluida_em;
    const { error: updErr } = await sb
      .from("expand_plano_acao")
      .update(payload)
      .eq("id", existente.id);

    if (updErr) {
      console.error(`   ❌ Erro ao atualizar "${upd.titulo}":`, updErr.message);
    } else {
      console.log(`   ✅ "${upd.titulo}" → ${upd.status}`);
      atualizadas++;
    }
  }

  // ── Inserção de novas tarefas ───────────────────────────────────────────────
  console.log("\n➕ Inserindo novas tarefas...");
  let inseridas = 0;
  let puladas = 0;

  for (const tarefa of novasTarefas) {
    const key = norm(tarefa.titulo);
    if (existentesMap.has(key)) {
      console.log(`   ○  Já existe: "${tarefa.titulo}"`);
      puladas++;
      continue;
    }
    // Verifica match parcial no banco existente
    const parcial = existentes.find((e) => norm(e.titulo).includes(key.slice(0, 25)));
    if (parcial) {
      console.log(`   ○  Match parcial existente: "${tarefa.titulo}" ~ "${parcial.titulo}" — pulando`);
      puladas++;
      continue;
    }

    const { error: insErr } = await sb.from("expand_plano_acao").insert(tarefa);
    if (insErr) {
      console.error(`   ❌ Erro ao inserir "${tarefa.titulo}":`, insErr.message);
    } else {
      console.log(`   ✅ Inserida: "${tarefa.titulo}"`);
      inseridas++;
    }
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Concluído!
   Status atualizados : ${atualizadas}
   Não encontradas   : ${naoEncontradas}
   Novas inseridas   : ${inseridas}
   Puladas (já exist): ${puladas}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
