"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Membro = { id: string; nome: string; cargo: string | null; cor: string | null; foto_url: string | null };
type Msg = { id: string; content: string; user_id: string; criado_em: string };

function ini(nome: string) {
  return nome.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}
function hora(ts: string) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function dia(ts: string) {
  const d = new Date(ts);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}
function dmKey(a: string, b: string) {
  return "dm_" + [a, b].sort().join("_");
}

function Avatar({ membro, size = 34 }: { membro?: Membro | null; size?: number }) {
  const cor = membro?.cor ?? "var(--accent)";
  const s: React.CSSProperties = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    background: cor, display: "grid", placeItems: "center",
    fontSize: size * 0.34, fontWeight: 800, color: "#fff", overflow: "hidden",
  };
  if (membro?.foto_url) {
    return <div style={s}><img src={membro.foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>;
  }
  return <div style={s}>{membro ? ini(membro.nome) : "?"}</div>;
}

function GroupAvatar({ membros, size = 34 }: { membros: Membro[]; size?: number }) {
  const shown = membros.slice(0, 3);
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      {shown.map((m, i) => (
        <div key={m.id} style={{
          position: "absolute",
          width: size * 0.65, height: size * 0.65,
          borderRadius: "50%",
          background: m.cor ?? "var(--accent)",
          border: "1.5px solid var(--panel)",
          display: "grid", placeItems: "center",
          fontSize: size * 0.22, fontWeight: 800, color: "#fff",
          overflow: "hidden",
          left: i === 0 ? 0 : i === 1 ? size * 0.35 : size * 0.2,
          top: i === 0 ? 0 : i === 1 ? size * 0.35 : size * 0.18,
          zIndex: shown.length - i,
        }}>
          {m.foto_url
            ? <img src={m.foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : ini(m.nome)}
        </div>
      ))}
    </div>
  );
}

export default function ChatHub({
  userId,
  meuPerfil,
  membros,
  userToMembro,
}: {
  userId: string;
  meuPerfil: string;
  membros: Membro[];
  userToMembro: Record<string, string>;
}) {
  const [room, setRoom] = useState<"geral" | string>("geral");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sb = createClient();

  const membroById = Object.fromEntries(membros.map(m => [m.id, m]));

  function membroDaMsg(uid: string): Membro | undefined {
    const pid = userToMembro[uid] ?? (uid === userId ? meuPerfil : undefined);
    return pid ? membroById[pid] : undefined;
  }

  const canalAtual = room === "geral" ? "geral" : dmKey(meuPerfil, room);

  const roomInfo: { nome: string; sub: string; membro?: Membro } = (() => {
    if (room === "geral") return { nome: "Equipe", sub: `${membros.length} pessoas` };
    const m = membroById[room];
    return { nome: m?.nome ?? "DM", sub: m?.cargo ?? "", membro: m };
  })();

  const carregar = useCallback(async (canal: string) => {
    const { data } = await sb
      .from("expand_chat_mensagens")
      .select("id, content, user_id, criado_em")
      .eq("canal_id", canal)
      .is("agente_id", null)
      .order("criado_em", { ascending: true })
      .limit(120);
    if (data) setMsgs(data as Msg[]);
  }, [sb]);

  useEffect(() => {
    setMsgs([]);
    carregar(canalAtual);
    const ch = sb
      .channel(`chat-${canalAtual}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "expand_chat_mensagens",
        filter: `canal_id=eq.${canalAtual}`,
      }, (payload) => {
        setMsgs(prev => [...prev, payload.new as Msg]);
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [canalAtual, carregar, sb]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function enviar() {
    const txt = texto.trim();
    if (!txt || enviando) return;
    setEnviando(true);
    setTexto("");
    await sb.from("expand_chat_mensagens").insert({
      canal_id: canalAtual,
      role: "user",
      content: txt,
      user_id: userId,
      agente_id: null,
      reply_to_id: null,
      arquivo_url: null,
      arquivo_tipo: null,
      arquivo_nome: null,
      mencoes: null,
    });
    setEnviando(false);
    inputRef.current?.focus();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  type Grupo = { dia: string; msgs: Msg[] };
  const grupos: Grupo[] = [];
  for (const m of msgs) {
    const d = dia(m.criado_em);
    if (!grupos.length || grupos[grupos.length - 1].dia !== d) {
      grupos.push({ dia: d, msgs: [m] });
    } else {
      grupos[grupos.length - 1].msgs.push(m);
    }
  }

  const membrosVisiveis = membros.filter(m =>
    !search || m.nome.toLowerCase().includes(search.toLowerCase())
  );

  const placeholderTxt = room === "geral"
    ? "Mensagem para toda a equipe…"
    : `Mensagem para ${roomInfo.nome}…`;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", background: "var(--bg)", overflow: "hidden" }}>

      {/* ─── Painel esquerdo — contatos ─── */}
      <div style={{
        width: 280, flexShrink: 0,
        borderRight: "1px solid var(--line)",
        background: "var(--panel)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* Header esquerdo */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--txt)", marginBottom: 10, letterSpacing: ".03em" }}>
            Chat da Equipe
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 11px",
            background: "var(--panel-2)",
            border: "1px solid var(--line)",
            borderRadius: 9,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              placeholder="Buscar…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, border: "none", outline: "none",
                background: "transparent", color: "var(--txt)",
                fontSize: 12.5, fontFamily: "inherit",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 13 }}>✕</button>
            )}
          </div>
        </div>

        {/* Lista de contatos */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* Geral */}
          {(!search || "equipe geral".includes(search.toLowerCase())) && (
            <button
              onClick={() => setRoom("geral")}
              style={{
                display: "flex", alignItems: "center", gap: 11,
                width: "100%", padding: "10px 14px",
                background: room === "geral" ? "color-mix(in srgb, var(--accent) 10%, var(--panel-2))" : "transparent",
                border: "none",
                borderLeft: room === "geral" ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit",
                transition: "background .12s",
              }}
            >
              <GroupAvatar membros={membros} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: room === "geral" ? "var(--accent)" : "var(--txt)" }}>Equipe Geral</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>{membros.length} pessoas</div>
              </div>
            </button>
          )}

          {/* Separador */}
          {membrosVisiveis.length > 0 && (
            <div style={{ padding: "10px 14px 4px", fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".07em" }}>
              Direto
            </div>
          )}

          {/* Membros */}
          {membrosVisiveis.map(m => {
            const isMe = m.id === meuPerfil;
            const active = room === m.id;
            return (
              <button
                key={m.id}
                onClick={() => !isMe && setRoom(m.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 11,
                  width: "100%", padding: "9px 14px",
                  background: active ? "color-mix(in srgb, var(--accent) 10%, var(--panel-2))" : "transparent",
                  border: "none",
                  borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                  cursor: isMe ? "default" : "pointer",
                  textAlign: "left", font: "inherit", color: "inherit",
                  transition: "background .12s",
                  opacity: isMe ? 0.6 : 1,
                }}
              >
                <Avatar membro={m} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: active ? "var(--accent)" : "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.nome}{isMe ? " (você)" : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.cargo ?? "Equipe"}
                  </div>
                </div>
              </button>
            );
          })}

          {membrosVisiveis.length === 0 && search && (
            <div style={{ padding: "20px 14px", fontSize: 12.5, color: "var(--dim)", textAlign: "center" }}>
              Nenhum membro encontrado
            </div>
          )}
        </div>
      </div>

      {/* ─── Painel direito — mensagens ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header direito */}
        <div style={{
          padding: "12px 20px",
          background: "var(--panel)",
          borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", gap: 12,
          flexShrink: 0,
        }}>
          {room === "geral"
            ? <GroupAvatar membros={membros} size={36} />
            : <Avatar membro={roomInfo.membro} size={36} />
          }
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--txt)" }}>{roomInfo.nome}</div>
            <div style={{ fontSize: 11, color: "var(--mut)" }}>{roomInfo.sub}</div>
          </div>
        </div>

        {/* Área de mensagens */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>

          {msgs.length === 0 && (
            <div style={{ textAlign: "center", margin: "auto", color: "var(--mut)", fontSize: 13 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
              {room === "geral"
                ? <>Nenhuma mensagem ainda.<br />Seja o primeiro a falar!</>
                : <>Inicie uma conversa com {roomInfo.nome}.</>
              }
            </div>
          )}

          {grupos.map(({ dia: d, msgs: ms }) => (
            <div key={d}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0 10px" }}>
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>{d}</div>
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              </div>

              {ms.map((m, idx) => {
                const meu = m.user_id === userId;
                const mesmo = idx > 0 && ms[idx - 1].user_id === m.user_id;
                const autor = membroDaMsg(m.user_id);

                return (
                  <div key={m.id} style={{
                    display: "flex", gap: 10,
                    flexDirection: meu ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    marginTop: mesmo ? 2 : 10,
                  }}>
                    <div style={{ width: 34, flexShrink: 0, visibility: mesmo ? "hidden" : "visible" }}>
                      <Avatar membro={autor} size={34} />
                    </div>
                    <div style={{ maxWidth: "66%", display: "flex", flexDirection: "column", alignItems: meu ? "flex-end" : "flex-start" }}>
                      {!mesmo && (
                        <div style={{ fontSize: 11, color: "var(--mut)", marginBottom: 3, fontWeight: 600 }}>
                          {autor?.nome ?? (meu ? "Você" : "Equipe")}&nbsp;&nbsp;
                          <span style={{ fontWeight: 400 }}>{hora(m.criado_em)}</span>
                        </div>
                      )}
                      <div style={{
                        padding: "9px 14px",
                        borderRadius: meu ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: meu
                          ? "color-mix(in srgb, var(--accent) 18%, var(--panel))"
                          : "var(--panel)",
                        border: `1px solid ${meu ? "color-mix(in srgb, var(--accent) 28%, transparent)" : "var(--line)"}`,
                        fontSize: 13.5, color: "var(--txt)", lineHeight: 1.55,
                        wordBreak: "break-word", whiteSpace: "pre-wrap",
                      }}>
                        {m.content}
                      </div>
                      {mesmo && (
                        <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>{hora(m.criado_em)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 20px 16px",
          background: "var(--panel)",
          borderTop: "1px solid var(--line)",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            padding: "10px 14px 10px 16px",
            borderRadius: 13,
            background: "var(--panel-2)",
            border: "1px solid var(--line)",
          }}>
            <textarea
              ref={inputRef}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={handleKey}
              placeholder={placeholderTxt}
              rows={1}
              style={{
                flex: 1, resize: "none", border: "none", outline: "none",
                background: "transparent", color: "var(--txt)", fontSize: 13.5,
                fontFamily: "inherit", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
              }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={enviar}
              disabled={!texto.trim() || enviando}
              style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: texto.trim() ? "var(--accent)" : "var(--line)",
                border: "none", cursor: texto.trim() ? "pointer" : "default",
                display: "grid", placeItems: "center",
                transition: "background .15s",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={texto.trim() ? "#0E1F18" : "var(--dim)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 6, textAlign: "center" }}>
            Enter para enviar · Shift+Enter para nova linha
          </div>
        </div>
      </div>
    </div>
  );
}
