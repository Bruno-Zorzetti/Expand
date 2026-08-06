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

  async function iniciar() {
    setCarregando(true);
    setErro(null);
    const r = await conectar();
    setCarregando(false);
    if (r.erro) return setErro(r.erro);
    setQr(qrSrc(r.qrcode));
    setPaircode(r.paircode ?? null);
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(async () => {
      const s = await checar();
      setSt(s);
      if (s.status === "connected") {
        setQr(null);
        setPaircode(null);
        if (poll.current) clearInterval(poll.current);
      }
    }, 4000);
  }

  async function atualizar() {
    setSt(await checar());
  }
  async function sair() {
    await desconectar();
    setSt({ status: "disconnected" });
    setQr(null);
    setPaircode(null);
  }

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

      {qr && (
        <div className="mt-6 flex flex-col items-center">
          <p className="mb-3 text-sm text-[var(--mut)]">Abra o WhatsApp → Aparelhos conectados → Conectar aparelho, e escaneie:</p>
          <img src={qr} alt="QR Code WhatsApp" className="h-56 w-56 rounded-xl bg-white p-2" />
          {paircode && (
            <p className="mt-3 text-sm text-[var(--mut)]">
              Ou use o código: <b className="font-mono text-[var(--txt)]">{paircode}</b>
            </p>
          )}
          <p className="mt-2 text-xs text-[var(--dim)]">Aguardando a leitura...</p>
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-[var(--red)]">{erro}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        {!conectado && !qr && (
          <button onClick={iniciar} disabled={carregando} className="hx-btn hx-btn-primary disabled:opacity-60">
            {carregando ? "Gerando QR..." : "Conectar WhatsApp"}
          </button>
        )}
        {conectado && (
          <button onClick={sair} className="hx-btn hx-btn-ghost text-[var(--red)]">Desconectar</button>
        )}
      </div>
    </div>
  );
}
