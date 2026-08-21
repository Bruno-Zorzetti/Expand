"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

function LogoMark({ size = 52, variant = "cream" }: { size?: number; variant?: "cream" | "gold" }) {
  return (
    <img
      src={variant === "gold" ? "/midia/expand-icone-gold.png" : "/midia/expand-icone-cream.png"}
      width={size}
      height={size}
      alt="Expand"
      style={{ flexShrink: 0, objectFit: "contain" }}
    />
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
  const destino = params.get("next") || "/expand/v2";
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>("login");
  const [tipo, setTipo] = useState<Tipo>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cadastroOk, setCadastroOk] = useState<{ tipo: Tipo } | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    if (tab === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        const raw = (error.message ?? "").trim();
        setMsg(
          !raw || raw === "{}"
            ? "Erro ao entrar. Verifique os dados e tente novamente."
            : /invalid login/i.test(raw) || /invalid credentials/i.test(raw)
            ? "E-mail ou senha incorretos."
            : /email not confirmed/i.test(raw)
            ? "E-mail ainda não confirmado. Verifique sua caixa de entrada."
            : "E-mail ou senha incorretos."
        );
      }
      else { window.location.assign(destino); return; }
    } else {
      if (!tipo) { setMsg("Escolha se você é da equipe ou cliente."); setLoading(false); return; }
      const { error } = await supabase.auth.signUp({
        email, password: senha,
        options: { data: { full_name: nome, tipo_acesso: tipo } },
      });
      if (error) {
        const raw = (error.message ?? "").trim();
        const friendly =
          !raw || raw === "{}" || raw === "[]"
            ? "Erro ao criar conta. Verifique os dados e tente novamente."
            : raw === "User already registered"
            ? "Este e-mail já possui uma conta. Faça login ou redefina sua senha."
            : /password should be at least/i.test(raw)
            ? "A senha deve ter no mínimo 6 caracteres."
            : /unable to validate email/i.test(raw)
            ? "E-mail inválido. Use um endereço de e-mail válido."
            : /rate limit/i.test(raw)
            ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
            : /signup/i.test(raw) && /disabled/i.test(raw)
            ? "Cadastro desativado. Entre em contato com a equipe Expand."
            : raw;
        setMsg(friendly);
      } else {
        setCadastroOk({ tipo });
        setNome(""); setEmail(""); setSenha(""); setTipo(null);
      }
    }
    setLoading(false);
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
    });
    if (error) {
      setMsg("Erro ao enviar e-mail. Verifique o endereço e tente novamente.");
    } else {
      setForgotSent(true);
    }
    setForgotLoading(false);
  }

  async function signInWithGoogle() {
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) setMsg("Erro ao conectar com Google. Tente novamente.");
  }

  function fecharModal() {
    setCadastroOk(null);
    setTab("login");
  }

  const tabStyle = (on: boolean): React.CSSProperties => ({
    flex: 1, borderRadius: 10, padding: "10px 12px", fontSize: 13.5, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
    border: on ? "1.5px solid color-mix(in srgb, var(--accent) 60%, transparent)" : "1.5px solid transparent",
    background: on ? "linear-gradient(135deg,var(--accent),var(--accent-2,var(--accent)))" : "transparent",
    color: on ? "#0A1512" : "var(--dim)",
    transition: "all .18s ease",
    boxShadow: on ? "0 2px 10px color-mix(in srgb, var(--accent) 25%, transparent)" : "none",
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
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 55% 45% at 72% 22%, rgba(70,160,100,0.13) 0%, transparent 65%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 45% 55% at 20% 85%, rgba(30,90,55,0.14) 0%, transparent 65%)",
        }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }} aria-hidden="true">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>

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
            <LogoMark size={44} variant="gold" />
            <div>
              <div style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 26, fontWeight: 700, letterSpacing: "0.04em", color: "var(--txt)" }}>EXPAND</div>
              <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)" }}>Motor de Trabalho</div>
            </div>
          </div>

          <div className="hx-glass" style={{ padding: "28px 26px", borderRadius: 18 }}>

            {/* ── Forgot password view ── */}
            {showForgot ? (
              <div>
                <button
                  onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); setMsg(null); }}
                  style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 12, padding: 0, marginBottom: 16, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
                >
                  ← Voltar
                </button>
                {forgotSent ? (
                  <div style={{ textAlign: "center", paddingTop: 8 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", marginBottom: 8 }}>E-mail enviado!</div>
                    <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.6 }}>
                      Verifique sua caixa de entrada em <strong>{forgotEmail}</strong> e clique no link para criar uma nova senha.
                    </p>
                    <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>
                      Não recebeu? Verifique o spam ou aguarde alguns minutos.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--txt)", marginBottom: 6 }}>Esqueceu sua senha?</div>
                      <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>
                        Informe seu e-mail e enviaremos um link para você criar uma nova senha.
                      </p>
                    </div>
                    <form onSubmit={submitForgot} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <input
                        required
                        type="email"
                        placeholder="Seu e-mail"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        style={fld}
                      />
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="hx-btn hx-btn-primary"
                        style={{ width: "100%", marginTop: 4, fontSize: 14.5, padding: "12px 14px" }}
                      >
                        {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
                      </button>
                    </form>
                    {msg && (
                      <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 9, background: "var(--panel-2)", fontSize: 13, color: "var(--mut)", lineHeight: 1.55 }}>
                        {msg}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                {/* ── Tabs ── */}
                <div style={{ display: "flex", gap: 6, marginBottom: 22, background: "var(--panel-2)", borderRadius: 12, padding: 4 }}>
                  <button onClick={() => { setTab("login"); setTipo(null); setMsg(null); }} style={tabStyle(tab === "login")}>Entrar</button>
                  <button onClick={() => { setTab("signup"); setMsg(null); }} style={tabStyle(tab === "signup")}>Criar conta</button>
                </div>

                {/* ── Google OAuth button ── */}
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 10, marginBottom: 16,
                    border: "1px solid var(--line-2)", background: "var(--panel-2)",
                    color: "var(--txt)", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", transition: "border-color .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line-2)")}
                >
                  {/* Google "G" icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {tab === "login" ? "Entrar com Google" : "Cadastrar com Google"}
                </button>

                {/* Separator */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ flex: 1, height: 1, background: "var(--line-2)" }} />
                  <span style={{ fontSize: 11.5, color: "var(--dim)", flexShrink: 0 }}>ou com e-mail</span>
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

                    {tab === "login" && (
                      <button
                        type="button"
                        onClick={() => { setShowForgot(true); setForgotEmail(email); setMsg(null); }}
                        style={{ alignSelf: "flex-end", fontSize: 12, color: "var(--dim)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: -2 }}
                      >
                        Esqueci minha senha
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      aria-busy={loading}
                      className="hx-btn hx-btn-primary"
                      style={{ width: "100%", marginTop: 4, fontSize: 14.5, padding: "12px 14px" }}
                    >
                      {loading ? "Aguarde..." : tab === "login" ? "Entrar" : tipo === "equipe" ? "Solicitar acesso à equipe" : "Solicitar acesso de cliente"}
                    </button>
                  </form>
                )}

                {msg && (
                  <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 9, background: "var(--panel-2)", fontSize: 13, color: "var(--mut)", lineHeight: 1.55 }}>
                    {msg}
                  </div>
                )}
              </>
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
              className="hx-btn hx-btn-primary"
              style={{ width: "100%", fontSize: 15, padding: "13px 16px" }}
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
