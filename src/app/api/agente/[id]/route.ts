import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Chat com o agente (usa prompt + memória + base de conhecimento) e salvamento na memória.
// Conceito inicial: retrieval por recência/tipo. Responde de verdade se ANTHROPIC_API_KEY estiver setada.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role as string)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { data: pf } = await supabase.from("expand_perfis").select("nome, cargo, area, tipo, bio, prompt, memoria").eq("id", id).single();
  if (!pf) return NextResponse.json({ error: "not found" }, { status: 404 });

  // ---- salvar na memória (curadoria manual do chat) ----
  if (body.action === "save") {
    const titulo = String(body.titulo ?? "").trim() || "Nota do chat";
    const conteudo = String(body.conteudo ?? "").trim();
    if (!conteudo) return NextResponse.json({ error: "vazio" }, { status: 400 });
    await supabase.from("expand_conhecimento").insert({
      agente_id: id, tipo: String(body.tipo ?? "conversa"), titulo, conteudo,
      fonte: "Chat interno", criado_por: (me.role as string) === "admin" ? "Admin" : "Equipe",
    });
    return NextResponse.json({ ok: true });
  }

  // ---- chat ----
  const mensagem = String(body.mensagem ?? "").trim();
  const historico = Array.isArray(body.historico) ? body.historico.slice(-10) : [];
  if (!mensagem) return NextResponse.json({ error: "vazio" }, { status: 400 });

  const ehAgente = pf.tipo === "agente";
  const nome = pf.nome as string;

  // Retrieval — recência + grafo de conhecimento (Phase 1)
  const { data: conh } = await supabase.from("expand_conhecimento")
    .select("tipo, titulo, conteudo").eq("agente_id", id).order("criado_em", { ascending: false }).limit(20);
  const recentes = (conh ?? []).map((c) => `[${c.tipo}] ${c.titulo}: ${c.conteudo}`).join("\n");

  // Graph traversal: busca entidades relacionadas à mensagem atual
  const { data: ents } = await supabase.from("expand_conhecimento_entidades")
    .select("id, nome, descricao, tipo").or(`agente_id.eq.${id},agente_id.is.null`).limit(60);
  const palavras = mensagem.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const match = (ents ?? []).find((e) =>
    palavras.some((p) => e.nome.toLowerCase().includes(p) || (e.descricao ?? "").toLowerCase().includes(p))
  );
  let grafCtx = "";
  if (match) {
    const { data: grafo } = await supabase.rpc("grafo_expandir", { inicio: match.id, max_hops: 2 });
    const ids = new Set((grafo ?? []).map((r: { entidade_id: string }) => r.entidade_id));
    const nos = (ents ?? []).filter((e) => ids.has(e.id));
    if (nos.length > 0) {
      grafCtx = "\n=== CONTEXTO DO GRAFO DE CONHECIMENTO ===\n"
        + nos.map((e) => `[${e.tipo}] ${e.nome}${e.descricao ? `: ${e.descricao}` : ""}`).join("\n");
    }
  }
  const base = recentes + grafCtx;

  // atividades atuais desta pessoa/agente (para o chat ser útil sobre o trabalho real)
  const nomeSafe = nome.replace(/[,()]/g, " ");
  let aq = supabase.from("expand_etapas").select("titulo, status, sla, fase").in("status", ["run", "idle"]).order("ordem").limit(16);
  aq = ehAgente ? aq.eq("agente", id) : aq.or(`responsavel_atual.eq.${nomeSafe},responsavel.ilike.%${nomeSafe}%`);
  const { data: ativ } = await aq;
  const atividades = (ativ ?? []).map((a) => `- ${a.titulo} [${a.status === "run" ? "em execução" : "na fila"}] SLA ${a.sla ?? "—"}`).join("\n");

  // contexto do PRODUTO (para o PMO analisar processo, prazos, SLA e carga)
  let contextoProduto = "";
  const prodSlug = (body.contexto && typeof body.contexto.produto === "string") ? (body.contexto.produto as string) : null;
  if (prodSlug) {
    const { data: pf2 } = await supabase.from("expand_prod_fases").select("ordem, nome, janela").eq("produto_slug", prodSlug).order("ordem");
    const { data: pe2 } = await supabase.from("expand_prod_etapas").select("ordem, fase_ordem, titulo, sla, responsavel, agente, marco, depende_de").eq("produto_slug", prodSlug).order("ordem");
    const procTxt = (pf2 ?? []).map((f) => `Fase ${f.ordem} (${f.janela ?? ""}): ${f.nome}\n` +
      (pe2 ?? []).filter((e) => e.fase_ordem === f.ordem).map((e) => `  - #${e.ordem} ${e.marco ? "◆MARCO " : ""}${e.titulo} | SLA ${e.sla ?? "—"} | ${e.responsavel ?? "—"}${e.agente ? ` | IA ${e.agente}` : ""}${e.depende_de ? ` | depende de #${e.depende_de}` : ""}`).join("\n")).join("\n");
    const marcosTxt = (pe2 ?? []).filter((e) => e.marco).map((e) => `#${e.ordem} ${e.titulo}`).join("; ");
    const { data: cls } = await supabase.from("expand_clientes").select("id").eq("produto_slug", prodSlug);
    const ids = (cls ?? []).map((c) => c.id);
    let carga = "—", tempos = "Sem etapas concluídas com datas.";
    if (ids.length) {
      const { data: ets } = await supabase.from("expand_etapas").select("responsavel_atual, responsavel, status, iniciada_em, concluida_em").in("cliente_id", ids);
      const cnt = new Map<string, number>();
      (ets ?? []).filter((e) => e.status === "run").forEach((e) => { const k = (e.responsavel_atual ?? e.responsavel ?? "—") as string; cnt.set(k, (cnt.get(k) ?? 0) + 1); });
      carga = [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join("; ") || "—";
      const done = (ets ?? []).filter((e) => e.status === "done" && e.iniciada_em && e.concluida_em);
      if (done.length) {
        const avg = done.reduce((s, e) => s + (new Date(e.concluida_em as string).getTime() - new Date(e.iniciada_em as string).getTime()) / 864e5, 0) / done.length;
        tempos = `Tempo médio de execução: ${avg.toFixed(1)} dias em ${done.length} etapas concluídas.`;
      }
    }
    contextoProduto = `\n=== PROCESSO DO PRODUTO (${prodSlug}) ===\n${procTxt}\n\n=== MARCOS (datas críticas / divisores de fase) ===\n${marcosTxt || "—"}\n\n=== OPERAÇÃO AO VIVO ===\nContas ativas com este produto: ${ids.length}.\nCarga atual por pessoa (tarefas em execução): ${carga}.\n${tempos}\n`;
  }

  const system = (ehAgente
    ? [
        `Você é ${nome}, ${pf.cargo ?? ""}${pf.area ? ` (${pf.area})` : ""} da Expand.`,
        pf.bio ? `Resumo: ${pf.bio}` : "",
        pf.prompt ? `\n=== SEU PROMPT / INSTRUÇÃO ===\n${pf.prompt}` : "",
        pf.memoria ? `\n=== SUA MEMÓRIA ===\n${pf.memoria}` : "",
        base ? `\n=== SUA BASE DE CONHECIMENTO (acertos, erros, aprendizados, modelos, avaliações) ===\n${base}` : "",
        atividades ? `\n=== SUAS ATIVIDADES ATUAIS ===\n${atividades}` : "",
        `\nResponda sempre em português, no papel de ${nome}, usando seu conhecimento e experiência. Seja direto e prático. Sem travessão. Se não souber algo, diga o que faria para descobrir.`,
      ]
    : [
        `Você é o assistente de IA de ${nome}, ${pf.cargo ?? ""}${pf.area ? ` (${pf.area})` : ""} da Expand. Você tem as mesmas habilidades e funções de ${nome} e conhece o contexto, o RAG e as atividades dela.`,
        `Seu papel é AJUDAR ${nome} nas atividades dela — organizar, lembrar, priorizar, redigir, sugerir e antecipar. Você NÃO se passa por ${nome}: você é o copiloto dela e fala sobre ela na terceira pessoa quando fizer sentido.`,
        pf.bio ? `Sobre ${nome}: ${pf.bio}` : "",
        pf.memoria ? `\n=== CONTEXTO DE ${nome} ===\n${pf.memoria}` : "",
        base ? `\n=== BASE DE CONHECIMENTO DE ${nome} ===\n${base}` : "",
        atividades ? `\n=== ATIVIDADES ATUAIS DE ${nome} ===\n${atividades}` : "",
        `\nResponda em português, como assistente de ${nome}. Direto e prático. Sem travessão.`,
      ]
  ).filter(Boolean).join("\n")
    + contextoProduto
    + (contextoProduto ? "\n\nUse os dados acima para analisar prazos e SLA deste processo, apontar quem está sobrecarregado e quem está ocioso na janela atual, identificar etapas cujo tempo de execução estoura o SLA e sugerir melhorias no modelo. Dê atenção especial aos MARCOS (datas críticas que mudam a fase do projeto) e às DEPENDÊNCIAS (uma etapa que depende de outra, ex.: sem roteiro aprovado não começa a gravação): se um pré-requisito atrasa ou há superlotação de tarefas na janela de um marco, isso é RISCO — avise o gestor com clareza e sugira uma decisão rápida (remanejar pessoa, antecipar, repriorizar). O PMO humano pode te acionar para essa análise a qualquer momento.\n\nEXECUÇÃO: quando (e somente quando) você recomendar UMA mudança concreta e executável numa etapa deste processo — alterar SLA, responsável, agente, marcar/desmarcar marco, ou dependência — termine a resposta com um comando em UMA linha só, exatamente neste formato: [[ACAO tipo=<sla|responsavel|agente|marco|depende_de> etapa=<numero #N da etapa> valor=<novo valor> motivo=<curto>]]. Use os números #N do processo acima, nunca invente. Só escreva o comando quando houver uma ação concreta; caso contrário não escreva nada disso. Quem aprova e executa é sempre o gestor humano." : "")
    + "\n\nESTILO OBRIGATÓRIO: escreva como uma pessoa real conversando — texto corrido, natural e fluido. Proibido usar markdown, asteriscos (**), negrito, títulos (#) ou listas numeradas. Se precisar enumerar, escreva em frases dentro do parágrafo. Poucos parágrafos curtos, tom humano e direto.";

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({
      reply: `⚙️ Chat em modo conceito. Eu sou ${pf.nome} e já estou carregando meu prompt${base ? " e minha base de conhecimento" : ""}, mas para responder de verdade falta configurar a chave ANTHROPIC_API_KEY no ambiente. Configurada a chave, eu passo a responder com base em tudo que sei — e aí dá pra testar se minhas entregas prestam.`,
      concept: true,
    });
  }

  const messages = [
    ...historico.map((m: { role: string; content: string }) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content ?? "") })),
    { role: "user", content: mensagem },
  ];
  const pedido = typeof body.model === "string" && body.model.startsWith("claude-") ? body.model : null;
  const primeiro = pedido ?? process.env.AGENTE_CHAT_MODEL ?? "claude-sonnet-4-5-20250929";
  const FALLBACK = "claude-3-5-sonnet-20241022";

  async function chamar(model: string) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1200, system, messages }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j, model };
  }

  try {
    let res = await chamar(primeiro);
    // se o modelo pedido falhar (id inválido/sem acesso), cai num Sonnet garantido uma vez
    if (!res.ok && primeiro !== FALLBACK) {
      res = await chamar(FALLBACK);
    }
    if (!res.ok) {
      return NextResponse.json({ reply: `Erro do modelo (${res.model}): ${res.j?.error?.message ?? res.status}`, modelo: res.model, concept: true });
    }
    // limpa markdown residual para a conversa parecer natural
    const bruto = (res.j?.content?.[0]?.text ?? "(sem resposta)") as string;
    const reply = bruto.replace(/\*\*/g, "").replace(/__/g, "").replace(/(^|\n)\s*#{1,6}\s+/g, "$1").replace(/(^|\n)\s*[-*]\s+/g, "$1");
    return NextResponse.json({ reply, modelo: res.model });
  } catch {
    return NextResponse.json({ reply: "Não consegui falar com o modelo agora. Tente de novo.", concept: true });
  }
}
