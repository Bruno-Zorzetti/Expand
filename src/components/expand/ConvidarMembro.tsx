"use client";

import { useActionState, useState } from "react";

type Res = { ok?: boolean; id?: string; nome?: string; link?: string | null; aviso?: string | null; erro?: string } | null;

const fld: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit", flex: 1, minWidth: 150 };

export default function ConvidarMembro({ convidar }: { convidar: (p: Res, fd: FormData) => Promise<Res> }) {
  const [res, action, pend] = useActionState<Res, FormData>(convidar, null);
  const [aberto, setAberto] = useState(false);

  return (
    <div className="hx-glass" style={{ borderRadius: 12, padding: "12px 14px", marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
      <button onClick={() => setAberto((v) => !v)} style={{ background: "transparent", border: "none", color: "var(--txt)", font: "inherit", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", transform: aberto ? "rotate(90deg)" : "none", transition: "transform .15s", color: "var(--accent)" }}>▸</span>
        ＋ Incluir membro <span style={{ fontWeight: 400, fontSize: 11.5, color: "var(--dim)" }}>· cria no time e envia o link de acesso</span>
      </button>
      {aberto && (
        <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input name="nome" placeholder="Nome" required style={fld} />
            <input name="cargo" placeholder="Cargo (ex.: Produção)" style={fld} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input name="area" placeholder="Área (ex.: Audiovisual)" style={fld} />
            <input name="email" type="email" placeholder="E-mail (para o convite)" style={fld} />
          </div>
          <div><button className="hx-btn hx-btn-primary" type="submit" disabled={pend} style={{ padding: "9px 15px", fontSize: 12.5, opacity: pend ? 0.6 : 1 }}>{pend ? "Criando..." : "Criar membro + gerar convite"}</button></div>

          {res?.erro && <p style={{ fontSize: 12.5, color: "var(--red)", margin: 0 }}>{res.erro}</p>}
          {res?.ok && (
            <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5 }}>
              ✅ <b style={{ color: "var(--txt)" }}>{res.nome}</b> criado(a) no time.
              {res.link ? (
                <div style={{ marginTop: 6 }}>Envie este link para a pessoa criar a senha:
                  <code style={{ display: "block", marginTop: 5, fontFamily: "monospace", fontSize: 11.5, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 10px", color: "var(--accent)", wordBreak: "break-all", userSelect: "all" }}>{res.link}</code>
                </div>
              ) : null}
              {res.aviso ? <p style={{ color: "var(--warn)", margin: "6px 0 0" }}>{res.aviso}</p> : null}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
