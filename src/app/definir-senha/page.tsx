"use client";

import { useEffect, useState } from "react";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

export default function DefinirSenha() {
  const supabase = createClient();
  const [estado, setEstado] = useState<"checando" | "pronto" | "invalido">("checando");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // O supabase-js processa o token do convite na URL e cria a sessão.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setEstado(data.session ? "pronto" : "invalido");
    }, 600);
    return () => clearTimeout(t);
  }, [supabase]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (senha.length < 6) return setMsg("A senha precisa de ao menos 6 caracteres.");
    if (senha !== senha2) return setMsg("As senhas não conferem.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) return setMsg(error.message);
    window.location.assign("/expand");
  }

  const field: React.CSSProperties = { width: "100%", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg)", padding: "11px 13px", fontSize: 14, color: "var(--txt)", outline: "none", fontFamily: "inherit" };

  return (
    <main className={`${cinzel.variable} tema-expand hx-ambient`} style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "var(--txt)" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 30, fontWeight: 700, letterSpacing: "0.04em" }}>EXPAND</div>
          <div style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginTop: 2 }}>Criar sua senha</div>
        </div>
        <div className="hx-glass" style={{ padding: 26, borderRadius: 16 }}>
          {estado === "checando" && <p style={{ fontSize: 13, color: "var(--mut)" }}>Validando seu convite…</p>}
          {estado === "invalido" && <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>Este link de convite é inválido ou expirou. Peça um novo convite ao administrador da Expand.</p>}
          {estado === "pronto" && (
            <form onSubmit={salvar} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5, margin: 0 }}>Bem-vindo(a) ao time! Defina sua senha de acesso.</p>
              <input required type="password" placeholder="Nova senha" value={senha} onChange={(e) => setSenha(e.target.value)} style={field} />
              <input required type="password" placeholder="Repita a senha" value={senha2} onChange={(e) => setSenha2(e.target.value)} style={field} />
              <button disabled={loading} className="hx-btn hx-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: loading ? 0.6 : 1 }}>{loading ? "..." : "Criar senha e entrar"}</button>
            </form>
          )}
          {msg && <p style={{ marginTop: 14, fontSize: 13, color: "var(--red)", lineHeight: 1.5 }}>{msg}</p>}
        </div>
      </div>
    </main>
  );
}
