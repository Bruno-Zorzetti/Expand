"use client";

import { useActionState } from "react";

type Res = { token?: string; nome?: string; erro?: string } | null;

export default function CriarInstancia({ criar }: { criar: (prev: Res, fd: FormData) => Promise<Res> }) {
  const [res, action, pend] = useActionState<Res, FormData>(criar, null);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input name="nome" placeholder="Nome da instância (ex.: expand-comercial)" style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, minWidth: 240, fontFamily: "inherit", flex: 1 }} />
        <button className="hx-btn hx-btn-primary" type="submit" disabled={pend} style={{ padding: "9px 15px", fontSize: 12.5, opacity: pend ? 0.6 : 1 }}>{pend ? "Criando..." : "Criar instância"}</button>
      </div>
      {res?.erro && <p style={{ fontSize: 12.5, color: "var(--red)", lineHeight: 1.5, margin: 0 }}>{res.erro}</p>}
      {res?.token && (
        <div className="hx-glass" style={{ borderRadius: 10, padding: "12px 14px", borderLeft: "3px solid var(--green)" }}>
          <p style={{ fontSize: 12, color: "var(--mut)", margin: "0 0 6px" }}>Instância <b style={{ color: "var(--txt)" }}>{res.nome}</b> criada. Copie este <b>Instance Token</b> e cole em <code style={{ fontFamily: "monospace" }}>UAZAPI_TOKEN</code> no Vercel:</p>
          <code style={{ display: "block", fontFamily: "monospace", fontSize: 12.5, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", color: "var(--accent)", wordBreak: "break-all", userSelect: "all" }}>{res.token}</code>
        </div>
      )}
    </form>
  );
}
