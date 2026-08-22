import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — pode ter várias tarefas

// Rotina diária: executa tarefas atribuídas a agentes de IA.
// Busca expand_etapas onde agente IS NOT NULL e status = 'idle'.
// Para cada tarefa: chama o agente via Anthropic, salva resultado em expand_log,
// atualiza status para 'done' (ou 'block' em caso de erro).
// Protegida por CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = process.env.ANTHROPIC_API_KEY;

  if (!url || !svc) {
    return NextResponse.json({ skipped: true, motivo: "SUPABASE_SERVICE_ROLE_KEY não configurada" });
  }
  if (!key) {
    return NextResponse.json({ skipped: true, motivo: "ANTHROPIC_API_KEY não configurada" });
  }

  const sb = createClient(url, svc, { auth: { persistSession: false } });

  // Verificar se a rotina está ativa
  const { data: rot } = await sb.from("expand_rotina").select("ativa").eq("chave", "tarefas-agentes").maybeSingle();
  if (rot && rot.ativa === false) return NextResponse.json({ skipped: true, motivo: "rotina pausada" });

  // Buscar tarefas pendentes com agente atribuído
  // Prioridade: data_prevista mais próxima primeiro, depois ordem de criação
  const hoje = new Date().toISOString().split("T")[0];
  const { data: tarefas } = await sb
    .from("expand_etapas")
    .select("id, titulo, area, sla, status, agente, cliente_id, fase, data_prevista, origem")
    .not("agente", "is", null)
    .eq("status", "idle")
    .order("data_prevista", { ascending: true, nullsFirst: false })
    .order("criado_em", { ascending: true })
    .limit(20); // máximo 20 tarefas por rodada para controlar custo

  if (!tarefas || tarefas.length === 0) {
    return NextResponse.json({ ok: true, tarefas: 0, msg: "Nenhuma tarefa pendente para agentes" });
  }

  // Carregar perfis de agentes (batch — evitar N+1)
  const agenteIds = [...new Set(tarefas.map((t) => t.agente as string))];
  const { data: perfis } = await sb
    .from("expand_perfis")
    .select("id, nome, cargo, area, bio, prompt, memoria, tipo")
    .in("id", agenteIds);
  const perfilMap = new Map((perfis ?? []).map((p) => [p.id as string, p]));

  // Carregar clientes (batch)
  const clienteIds = [...new Set(tarefas.map((t) => t.cliente_id as string))];
  const { data: clientes } = await sb
    .from("expand_clientes")
    .select("id, nome, maturidade, produto_slug")
    .in("id", clienteIds);
  const clienteMap = new Map((clientes ?? []).map((c) => [c.id as string, c]));

  // Carregar base de conhecimento dos agentes (batch)
  const { data: conh } = await sb
    .from("expand_conhecimento")
    .select("agente_id, tipo, titulo, conteudo")
    .in("agente_id", agenteIds)
    .order("criado_em", { ascending: false })
    .limit(100);
  const conhecMap = new Map<string, string[]>();
  for (const c of (conh ?? [])) {
    const k = c.agente_id as string;
    if (!conhecMap.has(k)) conhecMap.set(k, []);
    if (conhecMap.get(k)!.length < 15) {
      conhecMap.get(k)!.push(`[${c.tipo}] ${c.titulo}: ${c.conteudo}`);
    }
  }

  const modelo = process.env.AGENTE_CHAT_MODEL ?? "claude-sonnet-4-5-20250929";
  const FALLBACK = "claude-3-5-sonnet-20241022";

  const resultados: { tarefa: string; agente: string; ok: boolean; erro?: string }[] = [];
  let tokensTotal = 0;

  for (const t of tarefas) {
    const agId = t.agente as string;
    const pf = perfilMap.get(agId);
    const cli = clienteMap.get(t.cliente_id as string);
    if (!pf || !cli) {
      resultados.push({ tarefa: t.titulo as string, agente: agId, ok: false, erro: "perfil ou cliente não encontrado" });
      continue;
    }

    const base = (conhecMap.get(agId) ?? []).join("\n");
    const atraso = t.data_prevista && t.data_prevista < hoje ? `⚠️ TAREFA EM ATRASO (prevista para ${t.data_prevista})` : "";

    const system = [
      `Você é ${pf.nome}, ${pf.cargo ?? ""}${pf.area ? ` (${pf.area})` : ""} da Expand.`,
      pf.bio ? `Resumo: ${pf.bio}` : "",
      pf.prompt ? `\n=== SEU PROMPT / INSTRUÇÃO ===\n${pf.prompt}` : "",
      pf.memoria ? `\n=== SUA MEMÓRIA ===\n${pf.memoria}` : "",
      base ? `\n=== SUA BASE DE CONHECIMENTO ===\n${base}` : "",
      `\nVocê está executando uma tarefa atribuída a você no sistema. Produza o entregável solicitado de forma concreta e completa. Responda em português. Sem travessão. Sem markdown (sem asteriscos, sem #). Escreva como um profissional humano real.`,
    ].filter(Boolean).join("\n");

    const mensagemExecucao = [
      atraso,
      `TAREFA A EXECUTAR: ${t.titulo}`,
      `Cliente: ${cli.nome}${cli.produto_slug ? ` | Produto: ${cli.produto_slug}` : ""}`,
      `Área: ${t.area ?? "—"} | Fase: ${t.fase ?? "—"} | SLA: ${t.sla ?? "—"}`,
      `\nExecute esta tarefa e entregue o resultado completo. Seja específico, prático e acionável.`,
      `Se precisar de informações que não tem, liste o que falta e produza o máximo possível com o que sabe sobre o cliente.`,
    ].filter(Boolean).join("\n");

    try {
      // Marcar como em execução
      await sb.from("expand_etapas").update({ status: "run", iniciada_em: new Date().toISOString() }).eq("id", t.id);

      async function chamar(mod: string) {
        return fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": key!, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: mod,
            max_tokens: 1500,
            system,
            messages: [{ role: "user", content: mensagemExecucao }],
          }),
        });
      }

      let resp = await chamar(modelo);
      if (!resp.ok && modelo !== FALLBACK) resp = await chamar(FALLBACK);

      const j = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        await sb.from("expand_etapas").update({ status: "block" }).eq("id", t.id);
        await sb.from("expand_log").insert({
          cliente_id: t.cliente_id, tipo: "exec_agente_erro", autor: pf.nome,
          detalhe: `Erro ao executar tarefa "${t.titulo}": ${j?.error?.message ?? resp.status}`,
        });
        resultados.push({ tarefa: t.titulo as string, agente: pf.nome as string, ok: false, erro: j?.error?.message ?? `HTTP ${resp.status}` });
        continue;
      }

      const bruto = (j?.content?.[0]?.text ?? "(sem resposta)") as string;
      const resultado = bruto.replace(/\*\*/g, "").replace(/__/g, "").replace(/(^|\n)\s*#{1,6}\s+/g, "$1");
      const tokens = (j?.usage?.input_tokens ?? 0) + (j?.usage?.output_tokens ?? 0);
      tokensTotal += tokens;

      // Salvar resultado no log
      await sb.from("expand_log").insert({
        cliente_id: t.cliente_id,
        tipo: "exec_agente",
        autor: pf.nome,
        detalhe: JSON.stringify({
          tarefa_id: t.id,
          tarefa: t.titulo,
          resultado,
          modelo: j?.model ?? modelo,
          tokens,
        }),
      });

      // Marcar tarefa como concluída
      await sb.from("expand_etapas").update({
        status: "done",
        concluida_em: new Date().toISOString(),
      }).eq("id", t.id);

      resultados.push({ tarefa: t.titulo as string, agente: pf.nome as string, ok: true });
    } catch (e) {
      await sb.from("expand_etapas").update({ status: "idle" }).eq("id", t.id); // reverter
      resultados.push({ tarefa: t.titulo as string, agente: agId, ok: false, erro: String(e) });
    }
  }

  // Atualizar metadados da rotina
  const { data: rr } = await sb.from("expand_rotina").select("tokens_total, custo_total").eq("chave", "tarefas-agentes").maybeSingle();
  const custo = tokensTotal * 0.000003; // estimativa Sonnet ~$3/M tokens
  await sb.from("expand_rotina").upsert({
    chave: "tarefas-agentes",
    ativa: true,
    ultima_exec: new Date().toISOString(),
    proxima_exec: new Date(Date.now() + 864e5).toISOString(),
    tokens_total: Number(rr?.tokens_total ?? 0) + tokensTotal,
    custo_total: Number(rr?.custo_total ?? 0) + custo,
  }, { onConflict: "chave" });

  return NextResponse.json({
    ok: true,
    tarefas_processadas: resultados.length,
    tokens: tokensTotal,
    custo: custo.toFixed(4),
    resultados,
  });
}
