"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

function LogoMark({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="lgg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8CC96" />
          <stop offset="45%" stopColor="#C8A84E" />
          <stop offset="100%" stopColor="#E8CC96" />
        </linearGradient>
      </defs>
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
    <Suspense fallback={<main className={`${cinzel.variable} tema-expand`} style={{ minHeight: "100vh", background: "#071610" }} />}>
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
  const [cadastroOk, setCadastroOk] = useState<{ tipo: Tipo } | null>(null);

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
      if (error) {
        setMsg(error.message === "User already registered" ? "Este e-mail já possui uma conta. Faça login ou redefina sua senha." : error.message);
      } else {
        setCadastroOk({ tipo });
        setNome(""); setEmail(""); setSenha(""); setTipo(null);
      }
    }
    setLoading(false);
  }

  function fecharModal() {
    setCadastroOk(null);
    setTab("login");
  }

  const tabStyle = (on: boolean): React.CSSProperties => ({
    flex: 1, borderRadius: 10, padding: "10px 12px", fontSize: 13.5, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", border: "none",
    background: on ? "linear-gradient(135deg,var(--accent),var(--accent-2,var(--accent)))" : "var(--panel-2)",
    color: on ? "#0A1512" : "var(--mut)", transition: "all .2s",
  });

  return (
    <main
      className={`${cinzel.variable} tema-expand`}
      style={{ minHeight: "100vh", display: "flex", alignItems: "stretch" }}
    >
      {/* Lado esquerdo — branding com fundo verde */}
      <div
        className="ex-login-left"
        style={{
          flex: 1, display: "none", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          position: "relative", overflow: "hidden",
          background: "linear-gradient(155deg, #04110B 0%, #0A2117 35%, #0F2D1E 60%, #071610 100%)",
        }}
      >
        {/* Luz difusa superior direita */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 55% 45% at 72% 22%, rgba(70,160,100,0.13) 0%, transparent 65%)",
        }} />
        {/* Reflexo suave inferior esquerdo */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 45% 55% at 20% 85%, rgba(30,90,55,0.14) 0%, transparent 65%)",
        }} />
        {/* Textura sutil via SVG noise */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }} aria-hidden="true">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>

        {/* Conteúdo central */}
        <div style={{ position: "relative", textAlign: "center", padding: "60px 64px", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          <LogoMark size={100} />
          <div style={{
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontSize: 52, fontWeight: 700, letterSpacing: "0.1em",
            color: "#C8A84E", marginTop: 28, lineHeight: 1,
            textShadow: "0 0 60px rgba(200,168,78,0.3)",
          }}>
            EXPAND
          </div>
          <div style={{
            fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase",
            color: "rgba(200,168,78,0.55)", marginTop: 10,
          }}>
            Motor de Trabalho
          </div>
          <div style={{
            marginTop: 48, width: 40, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(200,168,78,0.4), transparent)",
          }} />
          <p style={{
            marginTop: 32, fontSize: 13.5, color: "rgba(180,220,200,0.45)",
            lineHeight: 1.8, maxWidth: 300, letterSpacing: "0.02em",
          }}>
            Tarefas, pipeline, portal do cliente e agentes de IA — integrados e organizados.
          </p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Logo mobile */}
          <div className="ex-login-logo-mobile" style={{ textAlign: "center", marginBottom: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <LogoMark size={44} />
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

      {/* Modal de confirmação de cadastro */}
      {cadastroOk && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: "rgba(4,17,11,0.75)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={fecharModal}
        >
          <div
            style={{
              background: "var(--panel-2)", border: "1px solid var(--line-2)",
              borderRadius: 22, padding: "36px 32px", maxWidth: 440, width: "100%",
              textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ícone de sucesso */}
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "linear-gradient(135deg,rgba(200,168,78,0.15),rgba(200,168,78,0.06))",
              border: "1px solid rgba(200,168,78,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, margin: "0 auto 24px",
            }}>
              ✓
            </div>

            <div style={{ fontFamily: "var(--font-cinzel,Georgia,serif)", fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>
              Conta criada
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--txt)", marginBottom: 14, lineHeight: 1.3 }}>
              {cadastroOk.tipo === "equipe"
                ? "Aguardando aprovação da equipe"
                : "Aguardando validação de acesso"}
            </h2>

            <p style={{ fontSize: 14, color: "var(--mut)", lineHeight: 1.7, marginBottom: 10 }}>
              {cadastroOk.tipo === "equipe"
                ? "Seu cadastro foi recebido. Um administrador vai revisar e liberar seu acesso — você receberá um aviso por e-mail assim que aprovado."
                : "Seu cadastro foi recebido. Nossa equipe validará seu acesso em breve e você receberá uma confirmação por e-mail."}
            </p>

            <p style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.6, marginBottom: 28, padding: "10px 12px", borderRadius: 10, background: "var(--panel)", border: "1px solid var(--line-2)" }}>
              {cadastroOk.tipo === "equipe"
                ? "Enquanto isso, o acesso ao painel fica restrito. Nenhuma ação adicional é necessária da sua parte."
                : "Se precisar de suporte, entre em contato diretamente com o seu responsável na Expand."}
            </p>

            <button
              onClick={fecharModal}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,var(--accent),var(--accent-2,var(--accent)))",
                color: "#0A1512", fontSize: 15, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Entendido — ir para o login
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 860px) {
          .ex-login-left { display: flex !important; }
          .ex-login-logo-mobile { display: none !important; }
        }
      `}</style>
    </main>
  );
}
