"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

type St = { status: string; number?: string; profileName?: string };
type Conn = { qrcode?: string | null; paircode?: string | null; status?: string; erro?: string };

const LABEL: Record<string, { t: string; c: string }> = {
  connected: { t: "Conectado", c: "var(--green)" },
  connecting: { t: "Conectando...", c: "var(--warn)" },
  disconnected: { t: "Desconectado", c: "var(--red)" },
  hibernated: { t: "Pausado", c: "var(--mut)" },
  nao_config: { t: "Não configurado", c: "var(--red)" },
};

function qrSrc(q?: string | null) {
  if (!q) return null;
  return q.startsWith("data:") || q.startsWith("http") ? q : `data:image/png;base64,${q}`;
}

export default function WhatsAppConnect({
  inicial,
  conectar,
  checar,
  desconectar,
}: {
  inicial: St;
  conectar: () => Promise<Conn>;
  checar: () => Promise<St>;
  desconectar: () => Promise<void>;
}) {
  const [st, setSt] = useState<St>(inicial);
  const [qr, setQr] = useState<string | null>(null);
  const [paircode, setPaircode] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  const conectado = st.status === "connected";
  const info = LABEL[st.status] ?? { t: st.status, c: "var(--mut)" };

  function pararPoll() { if (poll.current) { clearInterval(poll.current); poll.current = null; } }

  async function iniciar() {
    setCarregando(true);
    setErro(null);
    const r = await conectar();
    setCarregando(false);
    if (r.erro) return setErro(r.erro);
    if (!r.qrcode && !r.paircode) return setErro("O servidor não retornou o QR (token inválido ou instância expirada). Confira o Instance Token em Integrações.");
    setQr(qrSrc(r.qrcode));
    setPaircode(r.paircode ?? null);
    pararPoll();
    poll.current = setInterval(async () => {
      const s = await checar();
      setSt(s);
      if (s.status === "connected") { setQr(null); setPaircode(null); pararPoll(); }
    }, 4000);
  }

  async function atualizar() { setSt(await checar()); }
  async function sair() {
    await desconectar();
    setSt({ status: "disconnected" });
    setQr(null); setPaircode(null); pararPoll();
  }
  function fecharModal() { setQr(null); setPaircode(null); pararPoll(); }

  return (
    <div className="hx-glass p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${info.c} 18%, transparent)`, color: info.c }}>
          <Icon name="share" size={22} />
        </span>
        <div>
          <p className="font-bold" style={{ color: info.c }}>{info.t}</p>
          {conectado && st.number && (
            <p className="text-sm text-[var(--mut)]">{st.profileName ? `${st.profileName} · ` : ""}{st.number}</p>
          )}
        </div>
        <button onClick={atualizar} className="ml-auto text-sm text-[var(--mut)] hover:text-[var(--txt)]">Atualizar</button>
      </div>

      {erro && <p className="mt-3 text-sm text-[var(--red)]">{erro}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        {!conectado && (
          <button onClick={iniciar} disabled={carregando} className="hx-btn hx-btn-primary disabled:opacity-60">
            {carregando ? "Gerando QR..." : qr ? "Reabrir QR" : "Conectar WhatsApp"}
          </button>
        )}
        {conectado && (
          <button onClick={sair} className="hx-btn hx-btn-ghost text-[var(--red)]">Desconectar</button>
        )}
      </div>

      {/* Modal grande do QR — fácil de ler pelo celular */}
      {qr && (
        <div
          onClick={fecharModal}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(4,10,8,.72)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} className="hx-glass" style={{ position: "relative", width: "min(460px, 94vw)", borderRadius: 20, padding: "26px 26px 30px", textAlign: "center", background: "var(--panel)" }}>
            <button onClick={fecharModal} aria-label="Fechar" style={{ position: "absolute", top: 12, right: 14, background: "transparent", border: "none", color: "var(--mut)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            <p style={{ fontSize: 15, fontWeight: 800, color: "var(--txt)", marginBottom: 4 }}>Escaneie com o celular</p>
            <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5, marginBottom: 18, maxWidth: 340, marginInline: "auto" }}>
              No aparelho de envios: WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b> → aponte para o código:
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR Code do WhatsApp" style={{ width: "min(360px, 82vw)", height: "min(360px, 82vw)", borderRadius: 16, background: "#fff", padding: 14, margin: "0 auto", display: "block" }} />
            {paircode && (
              <p style={{ marginTop: 16, fontSize: 13, color: "var(--mut)" }}>
                Ou digite o código: <b style={{ fontFamily: "monospace", fontSize: 16, color: "var(--txt)", letterSpacing: ".08em" }}>{paircode}</b>
              </p>
            )}
            <p style={{ marginTop: 14, fontSize: 12, color: "var(--dim)", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warn)", display: "inline-block", animation: "pulse 1.4s ease-in-out infinite" }} />
              Aguardando a leitura… a janela fecha sozinha ao conectar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
