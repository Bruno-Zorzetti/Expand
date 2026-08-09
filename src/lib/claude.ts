// Chamada à API da Anthropic com medição de uso (tokens) e custo estimado.
export type ClaudeUsage = { input_tokens: number; output_tokens: number };
export type ClaudeResult = { ok: boolean; text: string; usage: ClaudeUsage; model: string; error?: string };

// Preços aproximados por milhão de tokens (USD) — usados só para ESTIMATIVA de custo.
const RATES: Record<string, { in: number; out: number }> = {
  "claude-haiku": { in: 1.0, out: 5.0 },
  "claude-sonnet": { in: 3.0, out: 15.0 },
  "claude-opus": { in: 15.0, out: 75.0 },
};

export function estimarCusto(model: string, u: ClaudeUsage): number {
  const k = Object.keys(RATES).find((p) => model.includes(p)) ?? "claude-sonnet";
  const r = RATES[k];
  return (u.input_tokens / 1e6) * r.in + (u.output_tokens / 1e6) * r.out;
}

export async function chamarClaude(opts: {
  system: string;
  messages: { role: string; content: string }[];
  model?: string;
  maxTokens?: number;
}): Promise<ClaudeResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = opts.model ?? process.env.RESUMO_MODEL ?? "claude-haiku-4-5-20251001";
  const zero = { input_tokens: 0, output_tokens: 0 };
  if (!key) return { ok: false, text: "", usage: zero, model, error: "ANTHROPIC_API_KEY ausente no ambiente" };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: opts.maxTokens ?? 1500, system: opts.system, messages: opts.messages }),
    });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) {
      const err = ((j.error as Record<string, unknown>)?.message ?? `HTTP ${r.status}`) as string;
      return { ok: false, text: "", usage: zero, model, error: err };
    }
    const content = j.content as { text?: string }[] | undefined;
    const u = (j.usage ?? {}) as Record<string, number>;
    return { ok: true, text: content?.[0]?.text ?? "", usage: { input_tokens: u.input_tokens ?? 0, output_tokens: u.output_tokens ?? 0 }, model };
  } catch (e) {
    return { ok: false, text: "", usage: zero, model, error: String((e as Error)?.message ?? e) };
  }
}
