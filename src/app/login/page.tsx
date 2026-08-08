"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

function Logo() {
  return (
    <svg width="46" height="46" viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
      <defs><linearGradient id="lgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E0BC85" /><stop offset="55%" stopColor="#A07644" /><stop offset="100%" stopColor="#E0BC85" /></linearGradient></defs>
      <circle cx="50" cy="50" r="41" stroke="url(#lgg)" strokeWidth="3.4" />
      <path d="M32 19 L70 74" stroke="url(#lgg)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M69 19 L38 63" stroke="url(#lgg)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M52 53 H88" stroke="url(#lgg)" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="34" cy="70" r="7" stroke="url(#lgg)" strokeWidth="3.4" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className={`${cinzel.variable} tema-expand hx-ambient`} style={{ minHeight: "100vh" }} />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const destino = params.get("next") || "/cliente";
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        setMsg(error.message);
      } else {
        window.location.assign(destino);
        return;
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { full_name: nome } },
      });
      if (error) setMsg(error.message);
      else {
        setMsg("Conta criada. Se pedir confirmação, cheque seu e-mail. Agora é só entrar.");
        setMode("login");
      }
    }
    setLoading(false);
  }

  const field: React.CSSProperties = {
    width: "100%", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg)",
    padding: "11px 13px", fontSize: 14, color: "var(--txt)", outline: "none", fontFamily: "inherit",
  };
  const tab = (on: boolean): React.CSSProperties => ({
    flex: 1, borderRadius: 10, padding: "9px 12px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    border: on ? "none" : "1px solid var(--line-2)",
    background: on ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "transparent",
    color: on ? "#0A1512" : "var(--mut)",
  });

  return (
    <main className={`${cinzel.variable} tema-expand hx-ambient`} style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "var(--txt)" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Logo />
          <div>
            <div style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 30, fontWeight: 700, letterSpacing: "0.04em", color: "var(--txt)" }}>EXPAND</div>
            <div style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginTop: 2 }}>Motor de Trabalho</div>
          </div>
        </div>

        <div className="hx-glass" style={{ padding: 26, borderRadius: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <button onClick={() => setMode("login")} style={tab(mode === "login")}>Entrar</button>
            <button onClick={() => setMode("signup")} style={tab(mode === "signup")}>Criar conta</button>
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {mode === "signup" && (
              <input required placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} style={field} />
            )}
            <input required type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={field} />
            <input required type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} style={field} />
            <button disabled={loading} className="hx-btn hx-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: loading ? 0.6 : 1 }}>
              {loading ? "..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          {msg && <p style={{ marginTop: 14, fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>{msg}</p>}
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--dim)", textDecoration: "none" }}>← Voltar ao catálogo</Link>
        </div>
      </div>
    </main>
  );
}
