import type { SupabaseClient } from "@supabase/supabase-js";
import { chamarClaude, estimarCusto } from "@/lib/claude";
import { lerMensagensGrupo, type MsgGrupo } from "@/lib/whatsapp";

export type Demanda = { titulo: string; urgencia: string; importancia: string; citacao: string };
export type Perspectivas = { pmo: string; cs: string; comercial: string };
export type ResumoIA = { resumo: string; atividades: string[]; demandas: Demanda[]; perspectivas?: Perspectivas };
export type ProcessoResultado = { cliente: string; ok: boolean; msgs: number; tokensIn: number; tokensOut: number; custo: number; demandas: number; erro?: string };

const DIRETORIA = ["bruno", "pedro", "ana"];

const SYS = `Você é o analista de contas sênior da Expand. Recebe a TRANSCRIÇÃO REAL das últimas horas de um grupo de WhatsApp de um cliente e produz três análises distintas para diferentes perfis profissionais.

REGRAS RÍGIDAS:
- Use SOMENTE o que está na transcrição. NUNCA invente cliente, pessoas, fatos, números ou demandas.
- Toda demanda DEVE ter uma citação curta (verbatim) da mensagem que a originou.
- Se não houver demandas, devolva a lista vazia.
- Analise TODO o conteúdo — não resuma superficialmente, leia cada mensagem.
- Responda em português. Devolva SOMENTE um JSON válido, sem nenhum texto fora dele.

Perspectivas requeridas:
- PMO: foco em tarefas, prazos, riscos operacionais, o que precisa de ação imediata
- CS: foco em saúde do relacionamento, satisfação, ameaças de churn, oportunidades de expansão
- Comercial: foco em oportunidades de upsell, expansão de escopo, referências, renovação

Formato exato:
{"resumo":"2 a 5 frases do que aconteceu no geral","atividades":["combinados e decisões objetivos"],"demandas":[{"titulo":"pedido ou necessidade do cliente","urgencia":"baixa|media|alta","importancia":"baixa|media|alta","citacao":"trecho curto da mensagem de origem"}],"perspectivas":{"pmo":"análise focada em tarefas, riscos e o que o PMO deve agir — 2 a 4 frases","cs":"análise focada em relacionamento, satisfação e oportunidades — 2 a 4 frases","comercial":"análise focada em oportunidades comerciais, expansão e renovação — 2 a 4 frases"}}`;

function parseResumo(t: string): ResumoIA | null {
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]) as Record<string, unknown>;
    const dem = Array.isArray(o.demandas) ? (o.demandas as Record<string, unknown>[]) : [];
    const persp = (o.perspectivas ?? {}) as Record<string, unknown>;
    return {
      resumo: String(o.resumo ?? "").trim(),
      atividades: Array.isArray(o.atividades) ? (o.atividades as unknown[]).map(String) : [],
      demandas: dem
        .map((d) => ({ titulo: String(d.titulo ?? "").trim(), urgencia: String(d.urgencia ?? "media"), importancia: String(d.importancia ?? "media"), citacao: String(d.citacao ?? "").trim() }))
        .filter((d) => d.titulo),
      perspectivas: {
        pmo: String(persp.pmo ?? "").trim(),
        cs: String(persp.cs ?? "").trim(),
        comercial: String(persp.comercial ?? "").trim(),
      },
    };
  } catch { return null; }
}

export async function gerarResumoIA(nomeCliente: string, msgs: MsgGrupo[]) {
  const transcricao = msgs.map((m) => `${m.nos ? "[Equipe]" : "[Cliente]"} ${m.autor}: ${m.texto}`).join("\n").slice(0, 16000);
  const r = await chamarClaude({ system: SYS, maxTokens: 2000, messages: [{ role: "user", content: `Cliente: ${nomeCliente}\n\nTRANSCRIÇÃO COMPLETA (${msgs.length} mensagens, últimas 24h):\n${transcricao}` }] });
  const parsed = r.ok ? parseResumo(r.text) : null;
  return { parsed, usage: r.usage, model: r.model, ok: r.ok && !!parsed, error: r.error ?? (r.ok && !parsed ? "resposta não veio em JSON" : undefined) };
}

export async function processarResumoCliente(supabase: SupabaseClient, cli: { id: string; nome: string; whatsapp_grupo: string | null }): Promise<ProcessoResultado> {
  const base: ProcessoResultado = { cliente: cli.nome, ok: false, msgs: 0, tokensIn: 0, tokensOut: 0, custo: 0, demandas: 0 };
  if (!cli.whatsapp_grupo) return { ...base, erro: "sem grupo configurado" };
  const hoje = new Date().toISOString().slice(0, 10);

  const msgs = await lerMensagensGrupo(cli.whatsapp_grupo, 24);

  // null = falha de API → não gravar "sem conversas" falso
  if (msgs === null) {
    return { ...base, erro: "API WhatsApp indisponível — verifique a instância uazapi" };
  }

  // [] = grupo realmente vazio nas últimas 24h
  if (msgs.length === 0) {
    await supabase.from("expand_cliente_resumo").upsert(
      { cliente_id: cli.id, dia: hoje, resumo: "Sem conversas nas últimas 24h.", atividades: [], demandas: [], perspectivas: null, msgs_lidas: 0, tokens_in: 0, tokens_out: 0, custo: 0, status: "novo" },
      { onConflict: "cliente_id,dia" }
    );
    return { ...base, ok: true, msgs: 0 };
  }

  const g = await gerarResumoIA(cli.nome, msgs);
  if (!g.ok || !g.parsed) return { ...base, msgs: msgs.length, erro: g.error ?? "falha na IA" };
  const custo = estimarCusto(g.model, g.usage);
  await supabase.from("expand_cliente_resumo").upsert({
    cliente_id: cli.id, dia: hoje,
    resumo: g.parsed.resumo, atividades: g.parsed.atividades, demandas: g.parsed.demandas,
    perspectivas: g.parsed.perspectivas ?? null,
    msgs_lidas: msgs.length, tokens_in: g.usage.input_tokens, tokens_out: g.usage.output_tokens, custo, modelo: g.model, status: "novo",
  }, { onConflict: "cliente_id,dia" });

  if (g.parsed.demandas.length) {
    const rows = DIRETORIA.map((mid) => ({ membro_id: mid, tipo: "resumo", texto: `Resumo do grupo de ${cli.nome}: ${g.parsed!.demandas.length} demanda(s) para revisar.`, link: `/expand/clientes/${cli.id}?t=grupo`, lida: false }));
    await supabase.from("expand_notificacoes").insert(rows);
  }
  return { cliente: cli.nome, ok: true, msgs: msgs.length, tokensIn: g.usage.input_tokens, tokensOut: g.usage.output_tokens, custo, demandas: g.parsed.demandas.length };
}
