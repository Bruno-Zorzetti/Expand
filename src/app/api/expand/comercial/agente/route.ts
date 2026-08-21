import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json() as {
    pergunta: string;
    contexto: {
      nome: string;
      cargo: string;
      xpHoje: number;
      metaHoje: number;
      xpTotal: number;
      nivel: string;
      streak: number;
      missoesDia: { id: string; t: string; tipo: string; valor: number; alvo?: number; done: boolean }[];
      metaACV: number;
      ticketMedio: number;
    };
  };

  const { pergunta, contexto: ctx } = body;

  const systemPrompt = `Você é o Téo, assistente comercial da Expand — uma agência de growth marketing.
Sua função: ajudar o time comercial a manter disciplina, bater metas e crescer.
Você fala de forma direta, motivadora e prática — sem enrolar, sem clichê.

Contexto atual do jogador:
- Nome: ${ctx.nome} (${ctx.cargo})
- XP hoje: ${ctx.xpHoje} / meta ${ctx.metaHoje}
- XP total: ${ctx.xpTotal} (${ctx.nivel})
- Sequência: ${ctx.streak} dias consecutivos
- Meta ACV do período: R$ ${ctx.metaACV.toLocaleString("pt-BR")}
- Ticket médio: R$ ${ctx.ticketMedio.toLocaleString("pt-BR")}

Missões de hoje:
${ctx.missoesDia.map(m => `- ${m.t}: ${m.done ? "✓ concluída" : m.tipo === "ctr" ? `${m.valor}/${m.alvo ?? "?"}` : "pendente"}`).join("\n")}

Responda em até 3 parágrafos curtos. Se a pergunta for sobre ajuste de metas ou missões, dê sugestões concretas com números. Seja específico — não dê conselhos genéricos.`;

  const stream = client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: "user", content: pergunta }],
  });

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Transfer-Encoding": "chunked" },
  });
}
