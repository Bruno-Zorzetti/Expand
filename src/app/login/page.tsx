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
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  async function entrarComGoogle() {
    setLoadingGoogle(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destino)}`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) { setMsg(error.message); setLoadingGoogle(false); }
  }

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
        setMsg("Conta criada! Por segurança, a equipe da Expand precisa liberar seu acesso antes de entrar. Você é avisado quando aprovarem — aí é só entrar com este e-mail e senha.");
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

          {/* Google OAuth */}
          <button
            type="button"
            onClick={entrarComGoogle}
            disabled={loadingGoogle}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "11px 14px", borderRadius: 10, marginBottom: 14, cursor: "pointer",
              border: "1px solid var(--line-2)", background: "var(--bg)", color: "var(--txt)",
              fontSize: 14, fontFamily: "inherit", fontWeight: 600, opacity: loadingGoogle ? 0.6 : 1,
            }}
          >
            {/* Google G icon */}
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24.3v8.9h13c-.6 3-2.3 5.5-4.9 7.2v5.9h7.9c4.6-4.2 7.2-10.4 7.2-17.3z" fill="#4285F4"/>
              <path d="M24.3 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-5.9c-2.1 1.4-4.8 2.2-8 2.2-6.1 0-11.3-4.1-13.1-9.6H2.9v6.1C6.8 42.8 15 48 24.3 48z" fill="#34A853"/>
              <path d="M11.2 28.9c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5v-6H2.9A23.7 23.7 0 0 0 .3 24.4c0 3.8.9 7.4 2.6 10.6l8.3-6.1z" fill="#FBBC05"/>
              <path d="M24.3 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.7 2.4 30.3 0 24.3 0 15 0 6.8 5.2 2.9 13l8.3 6.1c1.8-5.4 7-9.6 13.1-9.6z" fill="#EA4335"/>
            </svg>
            {loadingGoogle ? "Redirecionando..." : "Entrar com Google"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: "var(--line-2)" }} />
            <span style={{ fontSize: 12, color: "var(--dim)" }}>ou use e-mail</span>
            <div style={{ flex: 1, height: 1, background: "var(--line-2)" }} />
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
