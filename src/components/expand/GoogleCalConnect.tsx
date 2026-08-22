"use client";
import { useState, useEffect, useCallback } from "react";

type CalEvent = {
  id: string; titulo: string; inicio: string; fim: string | null;
  allDay: boolean; link: string | null; local: string | null; meet: string | null;
};

type Status = { conectado: boolean; email: string | null };

function fmtInicio(iso: string, allDay: boolean): string {
  if (!iso) return "";
  if (allDay) {
    const [ano, mes, dia] = iso.split("-");
    return new Date(Number(ano), Number(mes) - 1, Number(dia))
      .toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
  }
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function GoogleCalConnect({
  perfilId,
  initialStatus,
}: {
  perfilId: string;
  initialStatus: Status;
}) {
  const [status, setStatus]       = useState<Status>(initialStatus);
  const [eventos, setEventos]     = useState<CalEvent[] | null>(null);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const [showEventos, setShow]    = useState(false);
  const [disconnecting, setDisco] = useState(false);

  const carregarEventos = useCallback(async () => {
    if (!status.conectado) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/google/cal/events?perfilId=${encodeURIComponent(perfilId)}`);
      const j = await r.json() as { eventos?: CalEvent[]; error?: string };
      if (!r.ok) { setErr(j.error ?? "Erro"); return; }
      setEventos(j.eventos ?? []);
      setShow(true);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, [perfilId, status.conectado]);

  async function desconectar() {
    setDisco(true);
    try {
      const r = await fetch(`/api/google/cal/disconnect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ perfilId }),
      });
      if (r.ok) {
        setStatus({ conectado: false, email: null });
        setEventos(null);
        setShow(false);
      }
    } catch { /* noop */ } finally {
      setDisco(false);
    }
  }

  // Se voltou da OAuth com ?gcal=ok, recarrega status
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("gcal") === "ok") {
      setStatus({ conectado: true, email: null });
      // Limpa o query param sem recarregar
      const url = new URL(window.location.href);
      url.searchParams.delete("gcal");
      window.history.replaceState({}, "", url.toString());
    }
    if (p.get("gcal") === "erro") {
      const msg = p.get("msg") ? decodeURIComponent(p.get("msg")!) : "Erro ao conectar";
      setErr(msg);
      const url = new URL(window.location.href);
      url.searchParams.delete("gcal");
      url.searchParams.delete("msg");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const pill = (txt: string, cor: string) => (
    <span style={{
      fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
      background: `color-mix(in srgb,${cor} 14%,transparent)`,
      color: cor, border: `1px solid color-mix(in srgb,${cor} 28%,transparent)`,
    }}>{txt}</span>
  );

  return (
    <div style={{ marginTop: 10 }}>
      {err && (
        <div style={{ fontSize: 12, color: "var(--red)", padding: "7px 12px", borderRadius: 8, background: "color-mix(in srgb,var(--red) 10%,transparent)", marginBottom: 10 }}>
          {err}
        </div>
      )}

      {!status.conectado ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "var(--panel-2)", border: "1px solid var(--line-2)" }}>
          <span style={{ fontSize: 22 }}>📅</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", marginBottom: 1 }}>Google Agenda não conectada</div>
            <div style={{ fontSize: 11.5, color: "var(--dim)" }}>Conecte para ver os próximos compromissos aqui</div>
          </div>
          <a
            href={`/api/google/cal/auth?perfilId=${encodeURIComponent(perfilId)}`}
            style={{
              fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 9, textDecoration: "none",
              background: "#4285F4", color: "#fff", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <GoogleIcon /> Conectar
          </a>
        </div>
      ) : (
        <div>
          {/* Status bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {pill("✓ Google Agenda", "#0F9D58")}
            {status.email && <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{status.email}</span>}
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {!showEventos && (
                <button
                  onClick={carregarEventos}
                  disabled={loading}
                  style={{ fontSize: 11.5, padding: "4px 12px", borderRadius: 7, border: "1px solid var(--line-2)", background: "var(--panel-2)", color: "var(--txt)", cursor: "pointer", fontFamily: "inherit" }}
                >
                  {loading ? "Carregando…" : "Ver próximos"}
                </button>
              )}
              <button
                onClick={desconectar}
                disabled={disconnecting}
                style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "1px solid color-mix(in srgb,var(--red) 30%,transparent)", background: "none", color: "var(--red)", cursor: "pointer", fontFamily: "inherit", opacity: disconnecting ? 0.5 : 1 }}
              >
                {disconnecting ? "…" : "Desconectar"}
              </button>
            </div>
          </div>

          {/* Lista de eventos */}
          {showEventos && eventos !== null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {eventos.length === 0 ? (
                <p style={{ fontSize: 12.5, color: "var(--dim)", padding: "10px 0" }}>Sem eventos nos próximos dias.</p>
              ) : (
                eventos.map((ev) => (
                  <div key={ev.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "9px 12px", borderRadius: 10,
                    background: "var(--panel-2)", border: "1px solid var(--line-2)",
                  }}>
                    <div style={{ flexShrink: 0, fontSize: 16, lineHeight: 1, marginTop: 1 }}>
                      {ev.meet ? "🎥" : ev.local ? "📍" : "📅"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.link ? (
                          <a href={ev.link} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{ev.titulo}</a>
                        ) : ev.titulo}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{fmtInicio(ev.inicio, ev.allDay)}</div>
                      {ev.local && !ev.meet && (
                        <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.local}</div>
                      )}
                    </div>
                    {ev.meet && (
                      <a href={ev.meet} target="_blank" rel="noreferrer" style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 7, flexShrink: 0,
                        background: "color-mix(in srgb,#0F9D58 14%,transparent)",
                        color: "#0F9D58", border: "1px solid color-mix(in srgb,#0F9D58 28%,transparent)",
                        textDecoration: "none",
                      }}>Entrar no Meet</a>
                    )}
                  </div>
                ))
              )}
              <button
                onClick={() => setShow(false)}
                style={{ fontSize: 11, color: "var(--dim)", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "2px 0", fontFamily: "inherit" }}
              >
                ocultar agenda
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
