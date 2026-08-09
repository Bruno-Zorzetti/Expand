import type { SupabaseClient } from "@supabase/supabase-js";
import { chamarClaude, estimarCusto } from "@/lib/claude";
import { lerMensagensGrupo, type MsgGrupo } from "@/lib/whatsapp";

export type Demanda = { titulo: string; urgencia: string; importancia: string; citacao: string };
export type ResumoIA = { resumo: string; atividades: string[]; demandas: Demanda[] };
export type ProcessoResultado = { cliente: string; ok: boolean; msgs: number; tokensIn: number; tokensOut: number; custo: number; demandas: number; erro?: string };

const DIRETORIA = ["bruno", "pedro", "ana"];

const SYS = `Você é o analista de contas da Expand. Recebe a TRANSCRIÇÃO REAL das últimas horas de um grupo de WhatsApp de um cliente e produz o relato do dia.
REGRAS RÍGIDAS:
- Use SOMENTE o que está na transcrição. NUNCA invente cliente, pessoas, fatos, números ou demandas.
- Toda demanda DEVE ter uma citação curta (verbatim) da mensagem que a originou. Sem base clara na conversa, NÃO proponha a demanda.
- Se não houver demandas, devolva a lista vazia.
Responda em português. Devolva SOMENTE um JSON válido, sem nenhum texto fora dele, exatamente neste formato:
{"resumo":"2 a 4 frases do que aconteceu","atividades":["combinados e decisões objetivas"],"demandas":[{"titulo":"pedido ou necessidade do cliente","urgencia":"baixa|media|alta","importancia":"baixa|media|alta","citacao":"trecho curto da mensagem de origem"}]}`;

function parseResumo(t: string): ResumoIA | null {
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]) as Record<string, unknown>;
    const dem = Array.isArray(o.demandas) ? (o.demandas as Record<string, unknown>[]) : [];
    return {
      resumo: String(o.resumo ?? "").trim(),
      atividades: Array.isArray(o.atividades) ? (o.atividades as unknown[]).map(String) : [],
      demandas: dem
        .map((d) => ({ titulo: String(d.titulo ?? "").trim(), urgencia: String(d.urgencia ?? "media"), importancia: String(d.importancia ?? "media"), citacao: String(d.citacao ?? "").trim() }))
        .filter((d) => d.titulo),
    };
  } catch { return null; }
}

export async function gerarResumoIA(nomeCliente: string, msgs: MsgGrupo[]) {
  const transcricao = msgs.map((m) => `${m.nos ? "[Equipe]" : "[Cliente]"} ${m.autor}: ${m.texto}`).join("\n").slice(0, 12000);
  const r = await chamarClaude({ system: SYS, maxTokens: 1200, messages: [{ role: "user", content: `Cliente: ${nomeCliente}\n\nTRANSCRIÇÃO (${msgs.length} mensagens, últimas 24h):\n${transcricao}` }] });
  const parsed = r.ok ? parseResumo(r.text) : null;
  return { parsed, usage: r.usage, model: r.model, ok: r.ok && !!parsed, error: r.error ?? (r.ok && !parsed ? "resposta não veio em JSON" : undefined) };
}

export async function processarResumoCliente(supabase: SupabaseClient, cli: { id: string; nome: string; whatsapp_grupo: string | null }): Promise<ProcessoResultado> {
  const base: ProcessoResultado = { cliente: cli.nome, ok: false, msgs: 0, tokensIn: 0, tokensOut: 0, custo: 0, demandas: 0 };
  if (!cli.whatsapp_grupo) return { ...base, erro: "sem grupo configurado" };
  const hoje = new Date().toISOString().slice(0, 10);
  const msgs = await lerMensagensGrupo(cli.whatsapp_grupo, 24);
  if (msgs.length === 0) {
    await supabase.from("expand_cliente_resumo").upsert({ cliente_id: cli.id, dia: hoje, resumo: "Sem conversas nas últimas 24h.", atividades: [], demandas: [], msgs_lidas: 0, tokens_in: 0, tokens_out: 0, custo: 0, status: "novo" }, { onConflict: "cliente_id,dia" });
    return { ...base, ok: true, msgs: 0 };
  }
  const g = await gerarResumoIA(cli.nome, msgs);
  if (!g.ok || !g.parsed) return { ...base, msgs: msgs.length, erro: g.error ?? "falha na IA" };
  const custo = estimarCusto(g.model, g.usage);
  await supabase.from("expand_cliente_resumo").upsert({
    cliente_id: cli.id, dia: hoje, resumo: g.parsed.resumo, atividades: g.parsed.atividades, demandas: g.parsed.demandas,
    msgs_lidas: msgs.length, tokens_in: g.usage.input_tokens, tokens_out: g.usage.output_tokens, custo, modelo: g.model, status: "novo",
  }, { onConflict: "cliente_id,dia" });
  if (g.parsed.demandas.length) {
    const rows = DIRETORIA.map((mid) => ({ membro_id: mid, tipo: "resumo", texto: `Resumo do grupo de ${cli.nome}: ${g.parsed!.demandas.length} demanda(s) para revisar.`, link: `/expand/clientes/${cli.id}?t=grupo`, lida: false }));
    await supabase.from("expand_notificacoes").insert(rows);
  }
  return { cliente: cli.nome, ok: true, msgs: msgs.length, tokensIn: g.usage.input_tokens, tokensOut: g.usage.output_tokens, custo, demandas: g.parsed.demandas.length };
}
