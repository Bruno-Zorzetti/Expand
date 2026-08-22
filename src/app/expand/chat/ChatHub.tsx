"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────── */
type Canal = { id: string; nome: string; descricao: string | null; icone: string | null };
type Membro = { id: string; nome: string; cargo: string | null; cor: string | null; foto_url: string | null };
type UserInfo = { nome: string; cargo: string | null; cor: string | null; foto_url: string | null };
type Msg = {
  id: string; role: string; content: string;
  user_id: string; criado_em: string;
  canal_id: string | null; agente_id: string | null;
};
type View = { tipo: "canal"; canal: Canal } | { tipo: "dm"; membro: Membro };

/* ─── Helpers ────────────────────────────────────────── */
function ini(nome: string) { return nome.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(); }
function dmId(a: string, b: string) { return [a, b].sort().join(":"); }

function fmtHora(ts: string) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDia(ts: string) {
  const d = new Date(ts);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function Avatar({ u, size = 32 }: { u: UserInfo | undefined; size?: number }) {
  const s: React.CSSProperties = {
    width: size, height: size, borderRadius: "50%", flexShrink: 0,
    background: u?.cor ?? "var(--accent)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.34, fontWeight: 700, color: "#fff", overflow: "hidden",
  };
  if (u?.foto_url) return <div style={s}><img src={u.foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>;
  return <div style={s}>{u ? ini(u.nome) : "?"}</div>;
}

/* ─── Component ──────────────────────────────────────── */
export default function ChatHub({
  canais, membros, meuPerfil, userId, userMap,
}: {
  canais: Canal[];
  membros: Membro[];
  meuPerfil: string | null;
  userId: string;
  userMap: Record<string, UserInfo>;
}) {
  const [view, setView] = useState<View | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sb = createClient();

  const scroll = useCallback(() => {
    setTimeout(() => boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" }), 60);
  }, []);

  /* Carregar mensagens ao mudar de view */
  useEffect(() => {
    if (!view) return;
    setLoading(true);
    setMsgs([]);

    const q = sb.from("expand_chat_mensagens")
      .select("id,role,content,user_id,criado_em,canal_id,agente_id")
      .order("criado_em", { ascending: true })
      .limit(100);

    const roomKey = view.tipo === "canal"
      ? view.canal.id
      : meuPerfil ? dmId(meuPerfil, view.membro.id) : null;

    if (!roomKey) return;

    const filter = view.tipo === "canal"
      ? q.eq("canal_id", roomKey)
      : q.eq("agente_id", roomKey);

    filter.then(({ data }) => {
      setMsgs((data ?? []) as Msg[]);
      setLoading(false);
      scroll();
    });

    /* Realtime */
    const filterStr = view.tipo === "canal"
      ? `canal_id=eq.${roomKey}`
      : `agente_id=eq.${roomKey}`;

    const channel = sb.channel(`chat-${roomKey}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "expand_chat_mensagens", filter: filterStr,
      }, (p) => {
        setMsgs(s => [...s, p.new as Msg]);
        scroll();
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.tipo === "canal" ? (view as { canal: Canal }).canal?.id : view?.tipo === "dm" ? (view as { membro: Membro }).membro?.id : null]);

  async function enviar() {
    const m = input.trim();
    if (!m || sending || !view) return;
    setSending(true);
    setInput("");

    if (view.tipo === "canal") {
      await sb.from("expand_chat_mensagens").insert({
        canal_id: view.canal.id, user_id: userId, role: "user", content: m,
      });
    } else if (meuPerfil) {
      await sb.from("expand_chat_mensagens").insert({
        agente_id: dmId(meuPerfil, view.membro.id), user_id: userId, role: "user", content: m,
      });
    }
    setSending(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  /* Agrupar mensagens por dia e por remetente consecutivo */
  type Group = { dia: string; blocs: { userId: string; ts: string; msgs: Msg[] }[] };
  const groups: Group[] = [];
  let curDia = "";
  let curBloc: { userId: string; ts: string; msgs: Msg[] } | null = null;

  msgs.forEach(msg => {
    const d = fmtDia(msg.criado_em);
    if (d !== curDia) {
      curDia = d;
      curBloc = null;
      groups.push({ dia: d, blocs: [] });
    }
    const g = groups[groups.length - 1];
    const minDiff = curBloc
      ? (new Date(msg.criado_em).getTime() - new Date(curBloc.ts).getTime()) / 60000
      : Infinity;
    if (!curBloc || curBloc.userId !== msg.user_id || minDiff > 5) {
      curBloc = { userId: msg.user_id, ts: msg.criado_em, msgs: [msg] };
      g.blocs.push(curBloc);
    } else {
      curBloc.msgs.push(msg);
      curBloc.ts = msg.criado_em;
    }
  });

  const filtroMembros = membros.filter(m =>
    !busca || m.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const viewTitle = view?.tipo === "canal"
    ? `#${view.canal.nome}`
    : view?.tipo === "dm" ? view.membro.nome : "";

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", overflow: "hidden", fontFamily: "var(--font-sans, inherit)" }}>

      {/* ══════════ SIDEBAR ══════════ */}
      <div style={{
        width: 240, flexShrink: 0,
        background: "var(--panel)", borderRight: "1px solid var(--line)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Workspace */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--line-2)", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--txt)" }}>Expand</p>
          <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--dim)" }}>chat da equipe</p>
        </div>

        {/* Search */}
        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--line-2)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "5px 10px" }}>
            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: "none", stroke: "var(--dim)", strokeWidth: 2, flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar pessoas…"
              style={{ flex: 1, background: "none", border: "none", color: "var(--txt)", fontSize: 12.5, outline: "none", fontFamily: "inherit" }}
            />
          </div>
        </div>

        {/* Scrollable nav */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>

          {/* Canais */}
          {!busca && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ margin: "0 0 3px", padding: "0 16px", fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".07em" }}>Canais</p>
              {canais.map(c => {
                const ativo = view?.tipo === "canal" && (view as { canal: Canal }).canal.id === c.id;
                return (
                  <button key={c.id} onClick={() => setView({ tipo: "canal", canal: c })}
                    style={{
                      width: "100%", border: "none", cursor: "pointer", textAlign: "left",
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "5px 16px", background: ativo ? "color-mix(in srgb,var(--accent) 10%,transparent)" : "none",
                      borderLeft: `2px solid ${ativo ? "var(--accent)" : "transparent"}`,
                      color: ativo ? "var(--accent)" : "var(--mut)",
                      fontSize: 13, fontWeight: ativo ? 600 : 400, fontFamily: "inherit",
                    }}>
                    <span style={{ color: "var(--dim)", fontSize: 14 }}>#</span>
                    {c.nome}
                  </button>
                );
              })}
            </div>
          )}

          {/* DMs */}
          <div>
            <p style={{ margin: "0 0 3px", padding: "0 16px", fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".07em" }}>Mensagens diretas</p>
            {filtroMembros.filter(m => m.id !== meuPerfil).map(m => {
              const ativo = view?.tipo === "dm" && (view as { membro: Membro }).membro.id === m.id;
              return (
                <button key={m.id} onClick={() => setView({ tipo: "dm", membro: m })}
                  style={{
                    width: "100%", border: "none", cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "5px 16px", background: ativo ? "color-mix(in srgb,var(--accent) 10%,transparent)" : "none",
                    borderLeft: `2px solid ${ativo ? "var(--accent)" : "transparent"}`,
                    fontFamily: "inherit",
                  }}>
                  <Avatar u={m} size={24} />
                  <div style={{ overflow: "hidden", flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: ativo ? 600 : 400, color: ativo ? "var(--accent)" : "var(--txt)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.nome}</p>
                    {m.cargo && <p style={{ margin: 0, fontSize: 10.5, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.cargo}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer — link para perfil */}
        {meuPerfil && (
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line-2)", flexShrink: 0 }}>
            <Link href={`/expand/equipe/${meuPerfil}`} style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
              <Avatar u={userMap[userId]} size={28} />
              <span style={{ fontSize: 12.5, color: "var(--mut)", fontWeight: 600 }}>{userMap[userId]?.nome ?? "Você"}</span>
            </Link>
          </div>
        )}
      </div>

      {/* ══════════ ÁREA PRINCIPAL ══════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>

        {!view ? (
          /* Empty state */
          <div style={{ margin: "auto", textAlign: "center", padding: 40, maxWidth: 420 }}>
            <svg viewBox="0 0 24 24" style={{ width: 52, height: 52, fill: "none", stroke: "var(--dim)", strokeWidth: 1.4, margin: "0 auto 18px", display: "block" }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ fontSize: 18, fontWeight: 800, color: "var(--txt)", marginBottom: 8 }}>Boas-vindas ao Chat Expand</p>
            <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6, marginBottom: 22 }}>
              Discuta clientes, projetos e demandas com a equipe.<br />
              Selecione um canal ou inicie uma mensagem direta.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {canais.map(c => (
                <button key={c.id} onClick={() => setView({ tipo: "canal", canal: c })}
                  className="hx-btn hx-btn-ghost" style={{ padding: "7px 14px", fontSize: 12.5 }}>
                  # {c.nome}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Header do canal/DM */}
            <div style={{
              padding: "11px 20px", borderBottom: "1px solid var(--line)",
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--panel)", flexShrink: 0,
            }}>
              {view.tipo === "canal" ? (
                <>
                  <span style={{ fontSize: 20, color: "var(--dim)", fontWeight: 700, lineHeight: 1 }}>#</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--txt)" }}>{view.canal.nome}</p>
                    {view.canal.descricao && <p style={{ margin: 0, fontSize: 11, color: "var(--dim)" }}>{view.canal.descricao}</p>}
                  </div>
                </>
              ) : (
                <>
                  <Avatar u={view.membro} size={36} />
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--txt)" }}>{view.membro.nome}</p>
                    {view.membro.cargo && <p style={{ margin: 0, fontSize: 11, color: "var(--dim)" }}>{view.membro.cargo}</p>}
                  </div>
                  <Link href={`/expand/equipe/${view.membro.id}`}
                    className="hx-btn hx-btn-ghost"
                    style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 12 }}>
                    Ver perfil ↗
                  </Link>
                </>
              )}
            </div>

            {/* Mensagens */}
            <div ref={boxRef} style={{ flex: 1, overflowY: "auto", padding: "12px 20px 4px" }}>
              {loading ? (
                <p style={{ color: "var(--dim)", fontSize: 12, textAlign: "center", paddingTop: 40 }}>Carregando…</p>
              ) : msgs.length === 0 ? (
                <div style={{ textAlign: "center", paddingTop: 60, color: "var(--dim)" }}>
                  {view.tipo === "canal" ? (
                    <>
                      <p style={{ fontSize: 28, margin: "0 0 10px" }}>#</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", marginBottom: 6 }}>
                        Bem-vindo ao #{view.canal.nome}
                      </p>
                      <p style={{ fontSize: 13 }}>{view.canal.descricao ?? "Início do canal."}</p>
                    </>
                  ) : (
                    <>
                      <Avatar u={view.membro} size={52} />
                      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", margin: "14px 0 6px" }}>
                        {view.membro.nome}
                      </p>
                      <p style={{ fontSize: 13 }}>Início da conversa. Diga olá!</p>
                    </>
                  )}
                </div>
              ) : (
                groups.map(g => (
                  <div key={g.dia}>
                    {/* Separador de dia */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 14px" }}>
                      <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                      <span style={{ fontSize: 11.5, color: "var(--dim)", fontWeight: 600, whiteSpace: "nowrap" }}>{g.dia}</span>
                      <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                    </div>

                    {g.blocs.map(bloc => {
                      const isMe = bloc.userId === userId;
                      const sender = userMap[bloc.userId];
                      return (
                        <div key={bloc.userId + bloc.ts} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                          {/* Avatar (primeiro do bloco) */}
                          <div style={{ flexShrink: 0, paddingTop: 2 }}>
                            <Avatar u={sender} size={34} />
                          </div>
                          {/* Conteúdo */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Nome + hora */}
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 13.5, fontWeight: 700, color: isMe ? "var(--accent)" : "var(--txt)" }}>
                                {isMe ? "Você" : (sender?.nome ?? "Membro")}
                              </span>
                              <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{fmtHora(bloc.ts)}</span>
                            </div>
                            {/* Mensagens do bloco */}
                            {bloc.msgs.map(msg => (
                              <p key={msg.id} style={{
                                margin: "0 0 2px",
                                fontSize: 13.5, lineHeight: 1.6,
                                color: "var(--txt)",
                                whiteSpace: "pre-wrap", wordBreak: "break-word",
                              }}>
                                {msg.content}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div style={{ height: 8 }} />
            </div>

            {/* Input */}
            <div style={{ padding: "8px 16px 16px", flexShrink: 0 }}>
              <form onSubmit={e => { e.preventDefault(); enviar(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "var(--panel)", border: "1px solid var(--line-2)",
                  borderRadius: 12, padding: "8px 10px 8px 16px",
                }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={view.tipo === "canal"
                    ? `Mensagem para #${view.canal.nome} — clientes, projetos, reuniões…`
                    : `Mensagem para ${view.membro.nome}`}
                  style={{
                    flex: 1, background: "none", border: "none",
                    color: "var(--txt)", fontSize: 13.5, outline: "none", fontFamily: "inherit",
                  }}
                />
                <button type="submit" disabled={sending || !input.trim()}
                  title="Enviar (Enter)"
                  style={{
                    width: 36, height: 36, borderRadius: 9, border: "none",
                    background: input.trim() ? "var(--accent)" : "var(--panel-2)",
                    cursor: input.trim() ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "background .15s",
                  }}>
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "none", stroke: input.trim() ? "#fff" : "var(--dim)", strokeWidth: 2.5 }}>
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </form>
              <p style={{ margin: "5px 0 0 4px", fontSize: 10.5, color: "var(--dim)" }}>
                <b>Enter</b> para enviar &nbsp;·&nbsp;
                <b>@</b> mencionar membro &nbsp;·&nbsp;
                <span style={{ color: "var(--accent)" }}>/reunião &nbsp;/tarefa &nbsp;/cliente</span> — em breve
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
