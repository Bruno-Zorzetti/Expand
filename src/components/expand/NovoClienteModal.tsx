"use client";

import { useRef, useState, useTransition } from "react";
import { criarCliente2026 } from "@/app/expand/2026/actions";

type Props = { onCriado?: (id: string) => void };

export default function NovoClienteModal({ onCriado }: Props) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setErro(null);
    startTransition(async () => {
      const res = await criarCliente2026(fd);
      if (res?.erro) { setErro(res.erro); return; }
      formRef.current?.reset();
      setAberto(false);
      if (res?.id) onCriado?.(res.id);
    });
  }

  return (
    <>
      <button onClick={() => setAberto(true)} className="hx-btn hx-btn-primary"
        style={{ padding: "7px 16px", fontSize: 13 }}>
        + Novo cliente
      </button>

      {aberto && (
        <>
          <div onClick={() => setAberto(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 300 }} />

          <div style={{
            position: "fixed", top: "50%", left: "50%", zIndex: 301,
            transform: "translate(-50%,-50%)",
            width: "min(420px, 96vw)",
            background: "var(--bg)", borderRadius: 14,
            border: "1px solid var(--line)",
            boxShadow: "0 20px 60px rgba(0,0,0,.2)",
            padding: "24px 24px 20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--txt)" }}>Novo cliente</h2>
              <button onClick={() => setAberto(false)}
                style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                ✕
              </button>
            </div>

            <form ref={formRef} onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={lbSt}>Nome *</label>
                <input name="nome" required autoFocus placeholder="Nome do cliente ou empresa" style={inputSt} />
              </div>
              <div>
                <label style={lbSt}>Segmento</label>
                <input name="segmento" placeholder="Ex.: Saúde, Educação, E-commerce..." style={inputSt} />
              </div>

              {erro && <p style={{ fontSize: 12.5, color: "var(--red)", margin: 0 }}>{erro}</p>}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={() => setAberto(false)}
                  className="hx-btn hx-btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={pending}
                  className="hx-btn hx-btn-primary" style={{ padding: "8px 20px", fontSize: 13 }}>
                  {pending ? "Criando..." : "Criar cliente"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}

const inputSt: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 8,
  border: "1px solid var(--line-2)", background: "var(--panel)",
  color: "var(--txt)", fontSize: 13, outline: "none", fontFamily: "inherit",
};
const lbSt: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: ".06em", color: "var(--dim)", marginBottom: 5,
};
