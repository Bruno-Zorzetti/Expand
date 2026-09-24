"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { postarThreadTarefa } from "@/app/expand/actions";

type Msg = { id: string; user_id: string; content: string; criado_em: string };
type UserMap = Record<string, { nome: string; cor: string | null; foto_url: string | null }>;

function ini(nome: string) { return nome.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(); }
function fmtHora(ts: string) { return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }

function Avatar({ info, size = 28 }: { info?: { nome: string; cor: string | null; foto_url: string | null }; size?: number }) {
  const s: React.CSSProperties = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    background: info?.cor ?? "var(--accent)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.36, fontWeight: 700, color: "#fff", overflow: "hidden",
  };
  if (info?.foto_url) return <div style={s}><img src={info.foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>;
  return <div style={s}>{info ? ini(info.nome) : "?"}</div>;
}

export default function TarefaThread({
  etapaId, userId, userMap, initialMsgs,
}: {
  etapaId: string;
  userId: string;
  userMap: UserMap;
  initialMsgs: Msg[];
}) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMsgs);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const sb = createClient();

  const scroll = useCallback(() => {
    setTimeout(() => boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" }), 60);
  }, []);

  useEffect(() => {
    scroll();
    const ch = sb.channel(`thread-${etapaId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "expand_chat_mensagens",
        filter: `etapa_id=eq.${etapaId}`,
      }, (p) => { setMsgs(s => [...s, p.new as Msg]); scroll(); })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapaId]);

  async function enviar() {
    const m = input.trim();
    if (!m || sending) return;
    setSending(true);
    setInput("");
    const fd = new FormData();
    fd.set("etapaId", etapaId);
    fd.set("texto", m);
    await postarThreadTarefa(fd);
    setSending(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  const inp: React.CSSProperties = {
    flex: 1, background: "none", border: "none",
    color: "var(--txt)", fontSize: 13, outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* mensagens */}
      <div ref={boxRef} style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: "4px 0 12px" }}>
        {msgs.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", padding: "18px 0" }}>
            Nenhuma mensagem. Use este espaço para discutir a tarefa, pedir orientações ou avisar o responsável.
          </p>
        )}
        {msgs.map(msg => {
          const isMe = msg.user_id === userId;
          const info = userMap[msg.user_id];
          return (
            <div key={msg.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Avatar info={info} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isMe ? "var(--accent)" : "var(--txt)" }}>
                    {isMe ? "Você" : (info?.nome ?? "Membro")}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--dim)" }}>{fmtHora(msg.criado_em)}</span>
                </div>
                <div style={{
                  fontSize: 13, lineHeight: 1.5, color: "var(--txt)",
                  background: isMe ? "color-mix(in srgb,var(--accent) 8%,var(--panel-2))" : "var(--panel-2)",
                  borderRadius: 9, padding: "7px 11px",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>{msg.content}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* input */}
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        background: "var(--bg)", border: "1px solid var(--line-2)",
        borderRadius: 10, padding: "6px 8px 6px 12px",
      }}>
        <input
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
          placeholder="Mensagem na thread da tarefa…"
          style={inp}
        />
        <button
          onClick={enviar}
          disabled={!input.trim() || sending}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "none", flexShrink: 0,
            background: input.trim() ? "var(--accent)" : "var(--panel-2)", cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s",
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "none", stroke: input.trim() ? "#fff" : "var(--dim)", strokeWidth: 2.5 }}>
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
      <p style={{ fontSize: 10, color: "var(--dim)", marginTop: 4 }}>Enter envia · Shift+Enter quebra linha</p>
    </div>
  );
}
