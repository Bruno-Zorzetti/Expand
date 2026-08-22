"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Membro = { id: string; nome: string; cargo: string | null; area: string | null; cor: string | null; foto_url: string | null };
type Msg = { id: string; role: "user" | "assistant"; content: string; user_id: string; criado_em: string };

function ini(nome: string) { return nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(); }
function chatId(a: string, b: string) { return [a, b].sort().join(":"); }
function hora(ts: string) { return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }

export default function ChatHub({ membros, meuPerfil, userId }: { membros: Membro[]; meuPerfil: string | null; userId: string }) {
  const [ativo, setAtivo] = useState<Membro | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const sb = createClient();

  const outros = membros.filter((m) => m.id !== meuPerfil);

  const scroll = () => setTimeout(() => boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" }), 40);

  useEffect(() => {
    if (!ativo || !meuPerfil) return;
    setCarregando(true);
    const cid = chatId(meuPerfil, ativo.id);
    sb.from("expand_chat_mensagens")
      .select("id, role, content, user_id, criado_em")
      .eq("agente_id", cid)
      .order("criado_em", { ascending: true })
      .limit(60)
      .then(({ data }) => {
        setMsgs((data ?? []) as Msg[]);
        setCarregando(false);
        scroll();
      });

    // Realtime
    const channel = sb
      .channel(`chat-${cid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "expand_chat_mensagens", filter: `agente_id=eq.${cid}` },
        (payload) => {
          const row = payload.new as Msg;
          setMsgs((s) => [...s, row]);
          scroll();
        }
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [ativo?.id]);

  async function enviar() {
    const m = input.trim();
    if (!m || loading || !ativo || !meuPerfil) return;
    setInput("");
    setLoading(true);
    const cid = chatId(meuPerfil, ativo.id);
    await sb.from("expand_chat_mensagens").insert({ agente_id: cid, user_id: userId, role: "user", content: m });
    setLoading(false);
  }

  const euSou = (msg: Msg) => msg.user_id === userId;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", overflow: "hidden" }}>
      {/* Sidebar — lista de DMs */}
      <div style={{ width: 260, flexShrink: 0, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 14px 10px", borderBottom: "1px solid var(--line)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Mensagens diretas</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {outros.length === 0 ? (
            <p style={{ padding: "12px 16px", fontSize: 12, color: "var(--dim)" }}>Nenhum membro encontrado.</p>
          ) : outros.map((m) => (
            <button key={m.id} onClick={() => setAtivo(m)}
              style={{ width: "100%", background: ativo?.id === m.id ? "var(--panel-2)" : "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", textAlign: "left" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: m.cor ?? "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
                {m.foto_url ? <img src={m.foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini(m.nome)}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--txt)" }}>{m.nome}</p>
                {m.cargo ? <p style={{ margin: 0, fontSize: 11, color: "var(--dim)" }}>{m.cargo}</p> : null}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Área de conversa */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!ativo ? (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--dim)" }}>
            <svg viewBox="0 0 24 24" style={{ width: 40, height: 40, fill: "none", stroke: "currentColor", strokeWidth: 1.5, margin: "0 auto 12px" }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>Selecione uma conversa</p>
            <p style={{ fontSize: 12 }}>Escolha um membro da equipe para iniciar.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: ativo.cor ?? "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", overflow: "hidden" }}>
                {ativo.foto_url ? <img src={ativo.foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini(ativo.nome)}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--txt)" }}>{ativo.nome}</p>
                {ativo.cargo ? <p style={{ margin: 0, fontSize: 11, color: "var(--dim)" }}>{ativo.cargo}</p> : null}
              </div>
            </div>

            {/* Messages */}
            <div ref={boxRef} style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              {carregando ? (
                <p style={{ color: "var(--dim)", fontSize: 12, textAlign: "center" }}>Carregando…</p>
              ) : msgs.length === 0 ? (
                <p style={{ color: "var(--dim)", fontSize: 12, textAlign: "center", marginTop: "auto" }}>Sem mensagens ainda. Diga olá.</p>
              ) : msgs.map((msg) => (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: euSou(msg) ? "flex-end" : "flex-start", gap: 2 }}>
                  <div style={{
                    maxWidth: "80%", fontSize: 13, lineHeight: 1.5, padding: "8px 12px", borderRadius: 12, whiteSpace: "pre-wrap",
                    background: euSou(msg) ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "var(--panel-2)",
                    border: `1px solid ${euSou(msg) ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--line)"}`,
                    color: "var(--txt)",
                  }}>{msg.content}</div>
                  <span style={{ fontSize: 9.5, color: "var(--dim)" }}>{hora(msg.criado_em)}</span>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={(e) => { e.preventDefault(); enviar(); }}
              style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--line)", flexShrink: 0, background: "var(--bg)" }}>
              <input value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={`Mensagem para ${ativo.nome}…`}
                style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 10, color: "var(--txt)", padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              <button className="hx-btn hx-btn-primary" type="submit" disabled={loading || !input.trim()} style={{ padding: "0 16px" }}>Enviar</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
