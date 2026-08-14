"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

function Logo({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
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

const fld: React.CSSProperties = {
  width: "100%", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg)",
  padding: "11px 13px", fontSize: 14, color: "var(--txt)", outline: "none", fontFamily: "inherit",
};

type Tab = "login" | "signup";
type Tipo = "equipe" | "cliente" | null;

function LoginInner() {
  const params = useSearchParams();
  const destino = params.get("next") || "/cliente";
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("login");
  const [tipo, setTipo] = useState<Tipo>(null);
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

    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) { setMsg("E-mail ou senha incorretos."); }
      else { window.location.assign(destino); return; }
    } else {
      if (!tipo) { setMsg("Escolha se você é da equipe ou cliente."); setLoading(false); return; }
      const { error } = await supabase.auth.signUp({
        email, password: senha,
        options: { data: { full_name: nome, tipo_acesso: tipo } },
      });
      if (error) setMsg(error.message);
      else {
        setMsg(tipo === "equipe"
          ? "Conta criada! A equipe de gestão precisa aprovar seu acesso. Você receberá um aviso quando liberado."
          : "Conta criada! Nossa equipe irá validar seu acesso em breve. Fique de olho no e-mail.");
        setTab("login");
        setTipo(null);
      }
    }
    setLoading(false);
  }

  const tabStyle = (on: boolean): React.CSSProperties => ({
    flex: 1, borderRadius: 10, padding: "10px 12px", fontSize: 13.5, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", border: "none",
    background: on ? "linear-gradient(135deg,var(--accent),var(--accent-2,var(--accent)))" : "var(--panel-2)",
    color: on ? "#0A1512" : "var(--mut)", transition: "all .2s",
  });

  return (
    <main
      className={`${cinzel.variable} tema-expand hx-ambient`}
      style={{ minHeight: "100vh", display: "flex", alignItems: "stretch" }}
    >
      {/* Lado esquerdo — branding */}
      <div
        style={{
          flex: 1, display: "none", flexDirection: "column", justifyContent: "center",
          padding: "60px 64px", borderRight: "1px solid var(--line-2)",
          // show on wider screens via inline media won't work — handled by @media in className
        }}
        className="ex-login-left"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
          <Logo size={56} />
          <div>
            <div style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 34, fontWeight: 700, letterSpacing: "0.04em", color: "var(--txt)" }}>EXPAND</div>
            <div style={{ fontSize: 11, letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--accent)" }}>Motor de Trabalho</div>
          </div>
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.3, color: "var(--txt)", marginBottom: 20, maxWidth: 340 }}>
          Tudo o que a operação precisa, num lugar só.
        </h2>
        <p style={{ fontSize: 14.5, color: "var(--mut)", lineHeight: 1.7, maxWidth: 360, marginBottom: 40 }}>
          Tarefas, pipeline comercial, portal do cliente, agentes de IA e memória de equipe — integrados e organizados pela Expand.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: "◆", txt: "Painel de tarefas em tempo real" },
            { icon: "⚡", txt: "Agentes de IA por função e cliente" },
            { icon: "▶", txt: "Pipeline de vendas + CRM integrado" },
          ].map(({ icon, txt }) => (
            <div key={txt} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13.5, color: "var(--mut)" }}>
              <span style={{ color: "var(--accent)", width: 20, textAlign: "center" }}>{icon}</span>
              {txt}
            </div>
          ))}
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Logo mobile */}
          <div className="ex-login-logo-mobile" style={{ textAlign: "center", marginBottom: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Logo size={44} />
            <div>
              <div style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 26, fontWeight: 700, letterSpacing: "0.04em", color: "var(--txt)" }}>EXPAND</div>
              <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)" }}>Motor de Trabalho</div>
            </div>
          </div>

          <div className="hx-glass" style={{ padding: "28px 26px", borderRadius: 18 }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 22, background: "var(--panel-2)", borderRadius: 12, padding: 4 }}>
              <button onClick={() => { setTab("login"); setTipo(null); setMsg(null); }} style={tabStyle(tab === "login")}>Entrar</button>
              <button onClick={() => { setTab("signup"); setMsg(null); }} style={tabStyle(tab === "signup")}>Criar conta</button>
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={entrarComGoogle}
              disabled={loadingGoogle}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "11px 14px", borderRadius: 10, marginBottom: 16, cursor: "pointer",
                border: "1px solid var(--line-2)", background: "var(--bg)", color: "var(--txt)",
                fontSize: 14, fontFamily: "inherit", fontWeight: 600, opacity: loadingGoogle ? 0.6 : 1, transition: "opacity .15s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24.3v8.9h13c-.6 3-2.3 5.5-4.9 7.2v5.9h7.9c4.6-4.2 7.2-10.4 7.2-17.3z" fill="#4285F4"/>
                <path d="M24.3 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-5.9c-2.1 1.4-4.8 2.2-8 2.2-6.1 0-11.3-4.1-13.1-9.6H2.9v6.1C6.8 42.8 15 48 24.3 48z" fill="#34A853"/>
                <path d="M11.2 28.9c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5v-6H2.9A23.7 23.7 0 0 0 .3 24.4c0 3.8.9 7.4 2.6 10.6l8.3-6.1z" fill="#FBBC05"/>
                <path d="M24.3 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.7 2.4 30.3 0 24.3 0 15 0 6.8 5.2 2.9 13l8.3 6.1c1.8-5.4 7-9.6 13.1-9.6z" fill="#EA4335"/>
              </svg>
              {loadingGoogle ? "Redirecionando..." : tab === "login" ? "Entrar com Google" : "Cadastrar com Google"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "var(--line-2)" }} />
              <span style={{ fontSize: 11.5, color: "var(--dim)" }}>ou use e-mail</span>
              <div style={{ flex: 1, height: 1, background: "var(--line-2)" }} />
            </div>

            {/* Escolha de tipo no cadastro */}
            {tab === "signup" && !tipo && (
              <div>
                <p style={{ fontSize: 13, color: "var(--mut)", marginBottom: 12, textAlign: "center" }}>
                  Qual é sua relação com a Expand?
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {([
                    { key: "equipe" as const, icon: "◆", title: "Sou da equipe", desc: "Colaborador interno da Expand" },
                    { key: "cliente" as const, icon: "★", title: "Sou cliente", desc: "Contratei serviços da Expand" },
                  ] as { key: Tipo; icon: string; title: string; desc: string }[]).map((op) => (
                    <button
                      key={op.key!}
                      type="button"
                      onClick={() => setTipo(op.key)}
                      style={{
                        border: "1px solid var(--line-2)", borderRadius: 12, padding: "16px 12px",
                        background: "var(--bg)", color: "var(--txt)", cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                        textAlign: "center", fontFamily: "inherit", transition: "border-color .15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line-2)")}
                    >
                      <span style={{ fontSize: 22, color: "var(--accent)" }}>{op.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{op.title}</span>
                      <span style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.4 }}>{op.desc}</span>
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 14, textAlign: "center", lineHeight: 1.5 }}>
                  Após o cadastro, sua conta passa por aprovação da equipe Expand.
                </p>
              </div>
            )}

            {/* Formulário (login ou signup após escolher tipo) */}
            {(tab === "login" || tipo) && (
              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tab === "signup" && tipo && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 9, background: "color-mix(in srgb, var(--accent) 10%, transparent)", marginBottom: 4 }}>
                    <span style={{ color: "var(--accent)", fontSize: 13 }}>{tipo === "equipe" ? "◆" : "★"}</span>
                    <span style={{ fontSize: 12.5, color: "var(--accent)", fontWeight: 600 }}>
                      {tipo === "equipe" ? "Colaborador da equipe Expand" : "Cliente da Expand"}
                    </span>
                    <button type="button" onClick={() => setTipo(null)} style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      Mudar
                    </button>
                  </div>
                )}
                {tab === "signup" && (
                  <input required placeholder="Seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} style={fld} />
                )}
                <input required type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={fld} />
                <input required type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} style={fld} />
                <button
                  disabled={loading}
                  style={{
                    width: "100%", padding: "12px 14px", marginTop: 4, borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg,var(--accent),var(--accent-2,var(--accent)))",
                    color: "#0A1512", fontSize: 14.5, fontWeight: 700, cursor: "pointer",
                    opacity: loading ? 0.7 : 1, fontFamily: "inherit",
                  }}
                >
                  {loading ? "..." : tab === "login" ? "Entrar" : tipo === "equipe" ? "Solicitar acesso à equipe" : "Solicitar acesso de cliente"}
                </button>
              </form>
            )}

            {msg && (
              <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 9, background: "var(--panel-2)", fontSize: 13, color: "var(--mut)", lineHeight: 1.55 }}>
                {msg}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 860px) {
          .ex-login-left { display: flex !important; }
          .ex-login-logo-mobile { display: none !important; }
        }
      `}</style>
    </main>
  );
}
