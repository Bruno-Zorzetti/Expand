"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Acao = { tipo: string; etapa: number; valor: string; motivo?: string };
type Msg = { role: "user" | "assistant"; content: string; saved?: boolean; modelo?: string; rating?: number; fbSaved?: boolean; acao?: Acao; acaoResult?: string };

function parseAcao(text: string): { texto: string; acao: Acao } | null {
  const m = text.match(/\[\[ACAO\s+tipo=(\w+)\s+etapa=#?(\d+)\s+valor=([^\]]*?)(?:\s+motivo=([^\]]*))?\]\]/i);
  if (!m) return null;
  return { texto: text.replace(m[0], "").trim(), acao: { tipo: m[1].toLowerCase(), etapa: Number(m[2]), valor: (m[3] ?? "").trim(), motivo: (m[4] ?? "").trim() || undefined } };
}
const ACAO_LABEL: Record<string, string> = { sla: "SLA", responsavel: "responsável", agente: "agente de IA", marco: "marco", depende_de: "dependência" };

const MODELOS = [
  { id: "claude-sonnet-4-5-20250929", l: "Sonnet 4.5 · qualidade" },
  { id: "claude-haiku-4-5-20251001", l: "Haiku 4.5 · rápido" },
  { id: "claude-3-5-sonnet-20241022", l: "Sonnet 3.5" },
  { id: "claude-3-5-haiku-20241022", l: "Haiku 3.5 · barato" },
];
const nomeModelo = (id?: string) => MODELOS.find((m) => m.id === id)?.l ?? id ?? "";

export default function AgenteChat({ id, nome, cor, tipo, contexto, memoriaHref }: {
  id: string; nome: string; cor: string; tipo: string; contexto?: Record<string, unknown>; memoriaHref?: string;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelo, setModelo] = useState(MODELOS[0].id);
  const [notas, setNotas] = useState<Record<number, string>>({});
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const produto = contexto && typeof contexto.produto === "string" ? (contexto.produto as string) : null;

  const ehAgente = tipo === "agente";

  const scroll = () => setTimeout(() => boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" }), 40);

  function extrairTopicos(texto: string, pergunta: string): string[] {
    const stops = new Set(["de","do","da","dos","das","em","no","na","nos","nas","que","com","por","para","uma","como","mais","mas","ou","ao","se","é","um","já","isso","esta","este","são","foi","sua","seu","essa","esse","não","sim","ele","ela","você","eles","elas","nós","ter","ser","tem","está","isso","quem","qual","quando","onde","pois"]);
    const combined = (pergunta + " " + texto).toLowerCase();
    const words = combined.split(/[\s,;:!?.()[\]{}"\/\\–—\-]+/).filter((w) => w.length > 4 && !stops.has(w) && /^[a-záéíóúãõâêîôûàèìòùç]+$/i.test(w));
    const freq: Record<string, number> = {};
    for (const w of words) freq[w] = (freq[w] ?? 0) + 1;
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
  }

  async function enviar(texto?: string, histOverride?: { role: string; content: string }[]) {
    const m = (texto ?? input).trim();
    if (!m || loading) return;
    const historico = histOverride ?? msgs.map((x) => ({ role: x.role, content: x.content }));
    setMsgs((s) => [...s, { role: "user", content: m }]);
    setInput("");
    setLoading(true);
    scroll();
    try {
      const r = await fetch(`/api/agente/${id}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mensagem: m, historico, model: modelo, contexto }),
      });
      const j = await r.json();
      let content = (j.reply ?? j.error ?? "(sem resposta)") as string;
      let acao: Acao | undefined;
      if (produto) { const p = parseAcao(content); if (p) { content = p.texto; acao = p.acao; } }
      setMsgs((s) => [...s, { role: "assistant", content, modelo: j.modelo, acao }]);
      // Acender nós do grafo de conhecimento com base nos tópicos da conversa
      if (tipo === "agente" && !j.concept) {
        const topics = extrairTopicos(content, m);
        if (topics.length) window.dispatchEvent(new CustomEvent("grafo:activar", { detail: { topics } }));
      }
    } catch {
      setMsgs((s) => [...s, { role: "assistant", content: "Falha de conexão. Tente de novo." }]);
    } finally {
      setLoading(false);
      scroll();
    }
  }

  function refazer(i: number) {
    const q = msgs[i - 1]?.content;
    if (!q) return;
    const hist = msgs.slice(0, i - 1).map((x) => ({ role: x.role, content: x.content }));
    setMsgs((s) => s.slice(0, i - 1));
    setTimeout(() => enviar(q, hist), 30);
  }
  function excluir(i: number) { setMsgs((s) => s.filter((_, k) => k !== i)); }

  async function api(body: Record<string, unknown>) {
    await fetch(`/api/agente/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }
  async function salvar(i: number) {
    const a = msgs[i], q = msgs[i - 1]?.content ?? "";
    await api({ action: "save", tipo: "conversa", titulo: q.slice(0, 60) || "Nota do chat", conteudo: `P: ${q}\nR: ${a.content}` });
    setMsgs((s) => s.map((x, k) => (k === i ? { ...x, saved: true } : x)));
  }
  function avaliar(i: number, v: number) {
    setMsgs((s) => s.map((x, k) => (k === i ? { ...x, rating: v } : x)));
    if (v === 5) salvarFeedback(i, v, "Resposta excelente.");
  }
  async function salvarFeedback(i: number, v: number, nota: string) {
    const a = msgs[i], q = msgs[i - 1]?.content ?? "";
    await api({ action: "save", tipo: "avaliacao", titulo: `Avaliação ${v}★ do chat`, conteudo: `Nota ${v}/5. ${nota}\nP: ${q}\nR: ${a.content}` });
    setMsgs((s) => s.map((x, k) => (k === i ? { ...x, fbSaved: true } : x)));
  }
  async function executarAcao(i: number) {
    const a = msgs[i].acao;
    if (!a || !produto) return;
    const r = await fetch(`/api/produto/${produto}/acao`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(a) });
    const j = await r.json();
    setMsgs((s) => s.map((x, k) => (k === i ? { ...x, acaoResult: j.ok ? `✓ ${j.resumo}` : `Não deu: ${j.error ?? "erro"}` } : x)));
    if (j.ok) router.refresh();
  }
  const ignorarAcao = (i: number) => setMsgs((s) => s.map((x, k) => (k === i ? { ...x, acao: undefined } : x)));
  async function anexar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    e.target.value = "";
    setMsgs((s) => [...s, { role: "assistant", content: `📎 Enviando "${f.name}" para a memória…` }]);
    const fd = new FormData(); fd.set("file", f);
    try {
      const r = await fetch(`/api/agente/${id}/upload`, { method: "POST", body: fd });
      const j = await r.json();
      setMsgs((s) => s.map((m, k) => k === s.length - 1 ? { ...m, content: j.ok ? `📎 "${j.nome}" salvo na memória.` : `Não consegui salvar (${j.error ?? "erro"}).` } : m));
    } catch { setMsgs((s) => [...s, { role: "assistant", content: "Falha ao enviar o arquivo." }]); }
  }

  const sugestoes = ehAgente
    ? ["Como você faria essa entrega?", "Quais seus critérios de qualidade?", "O que você aprendeu com os últimos trabalhos?"]
    : [`O que está em aberto entre nós?`, "Me passa um status das suas tarefas.", "Tem algum bloqueio que posso ajudar?"];

  const perguntaFb = (v: number) => (v <= 3 ? "O que faltou? Diga o que melhorar:" : "Quase lá — o que deixaria melhor?");

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", padding: "11px 16px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor, boxShadow: `0 0 8px ${cor}` }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>
          {ehAgente ? nome : nome}
        </span>
        {memoriaHref && ehAgente ? <a href={memoriaHref} style={{ fontSize: 10.5, color: "var(--accent)", textDecoration: "none" }}>ver memória ↗</a> : null}
        {ehAgente && (
          <select value={modelo} onChange={(e) => setModelo(e.target.value)} title="Modelo"
            style={{ marginLeft: "auto", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "5px 8px", fontSize: 11, outline: "none", fontFamily: "inherit" }}>
            {MODELOS.map((m) => <option key={m.id} value={m.id}>{m.l}</option>)}
          </select>
        )}
      </div>

      {/* Messages — fills all available vertical space */}
      <div ref={boxRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {msgs.length === 0 ? (
          <div style={{ margin: "auto 0", textAlign: "center", color: "var(--dim)", fontSize: 12.5 }}>
            <p style={{ marginBottom: 12 }}>
              {ehAgente
                ? `Pergunte algo para ${nome}.`
                : `Inicie uma conversa com ${nome}.`}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
              {sugestoes.map((s) => (
                <button key={s} onClick={() => enviar(s)} className="ex-arqbtn" style={{ fontWeight: 500 }}>{s}</button>
              ))}
            </div>
          </div>
        ) : msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 5 }}>
            <div style={{
              maxWidth: "88%", fontSize: 13, lineHeight: 1.55, padding: "9px 13px", borderRadius: 12, whiteSpace: "pre-wrap",
              background: m.role === "user" ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "var(--panel-2)",
              border: `1px solid ${m.role === "user" ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--line)"}`, color: "var(--txt)",
            }}>{m.content}</div>

            {/* Per-message actions — agents only */}
            {m.role === "assistant" && ehAgente ? (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} onClick={() => avaliar(i, v)} title={`${v} estrela(s)`} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, color: (m.rating ?? 0) >= v ? "var(--accent)" : "var(--line-2)" }}>★</button>
                    ))}
                  </div>
                  <button onClick={() => salvar(i)} disabled={m.saved} style={btn(m.saved ? "var(--green)" : "var(--dim)")}>{m.saved ? "✓ salvo" : "💾 salvar"}</button>
                  <button onClick={() => refazer(i)} style={btn("var(--dim)")}>↻ refazer</button>
                  <button onClick={() => excluir(i)} style={btn("var(--dim)")}>✕ excluir</button>
                  {m.modelo ? <span style={{ fontSize: 9.5, color: "var(--dim)", marginLeft: "auto" }}>{nomeModelo(m.modelo)}</span> : null}
                </div>
                {m.rating && m.rating < 5 && !m.fbSaved ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input value={notas[i] ?? ""} onChange={(e) => setNotas((s) => ({ ...s, [i]: e.target.value }))} placeholder={perguntaFb(m.rating)}
                      style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "6px 9px", fontSize: 11.5, outline: "none", fontFamily: "inherit" }} />
                    <button className="hx-btn hx-btn-primary" style={{ padding: "5px 11px", fontSize: 11 }} onClick={() => salvarFeedback(i, m.rating!, notas[i] ?? "")}>Enviar</button>
                  </div>
                ) : null}
                {m.fbSaved ? <span style={{ fontSize: 10.5, color: "var(--green)" }}>{m.rating === 5 ? "Valeu! 🙏 salvei como acerto." : "Feedback salvo — vou usar pra melhorar."}</span> : null}
                {m.acao && !m.acaoResult ? (
                  <div style={{ border: "1px solid var(--accent)", background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12.5, color: "var(--txt)", lineHeight: 1.45 }}>⚙️ <b>Ação sugerida:</b> alterar {ACAO_LABEL[m.acao.tipo] ?? m.acao.tipo} da etapa <b>#{m.acao.etapa}</b> para <b>&ldquo;{m.acao.valor}&rdquo;</b>{m.acao.motivo ? ` — ${m.acao.motivo}` : ""}.</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="hx-btn hx-btn-primary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => executarAcao(i)}>Aprovar e executar</button>
                      <button className="hx-btn hx-btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => ignorarAcao(i)}>Ignorar</button>
                    </div>
                  </div>
                ) : null}
                {m.acaoResult ? <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600 }}>{m.acaoResult}</span> : null}
              </div>
            ) : null}
          </div>
        ))}
        {loading ? <div style={{ fontSize: 12, color: "var(--dim)" }}>{nome} está pensando…</div> : null}
      </div>

      {/* Input — fixed at bottom */}
      <form
        onSubmit={(e) => { e.preventDefault(); enviar(); }}
        style={{ display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid var(--line)", alignItems: "center", flexShrink: 0, background: "var(--bg)" }}
      >
        {ehAgente && (
          <label title="Anexar material à memória" style={{ cursor: "pointer", color: "var(--dim)", fontSize: 18, padding: "0 2px" }}>📎
            <input type="file" onChange={anexar} style={{ display: "none" }} />
          </label>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={ehAgente ? `Falar com ${nome}…` : `Mensagem para ${nome}…`}
          style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 10, color: "var(--txt)", padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }}
        />
        <button className="hx-btn hx-btn-primary" type="submit" disabled={loading || !input.trim()} style={{ padding: "0 16px" }}>Enviar</button>
      </form>
    </div>
  );
}

function btn(cor: string): React.CSSProperties {
  return { background: "none", border: "none", cursor: "pointer", fontSize: 10.5, color: cor, padding: "1px 2px" };
}
