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

function LoginInner() {
  const params = useSearchParams();
  const destino = params.get("next") || "/expand/v2";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password: senha });
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
      setLoading(false);
      return;
    }

    // Se veio com ?next= explícito, respeitar
    if (destino !== "/expand/v2") {
      window.location.assign(destino);
      return;
    }

    // Roteamento por papel
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    const role = (profile?.role as string) ?? "pendente";

    if (role === "admin" || role === "equipe") {
      window.location.assign("/expand/v2");
    } else if (role === "cliente") {
      window.location.assign("/cliente");
    } else {
      window.location.assign("/aguardando");
    }
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
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--txt)", marginBottom: 4 }}>Entrar na plataforma</div>
                  <p style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.5 }}>
                    Acesso por convite. Fale com um administrador para solicitar.
                  </p>
                </div>

                <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input required type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={fld} />
                  <input required type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} style={fld} />

                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setForgotEmail(email); setMsg(null); }}
                    style={{ alignSelf: "flex-end", fontSize: 12, color: "var(--dim)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: -2 }}
                  >
                    Esqueci minha senha
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                    className="hx-btn hx-btn-primary"
                    style={{ width: "100%", marginTop: 4, fontSize: 14.5, padding: "12px 14px" }}
                  >
                    {loading ? "Aguarde..." : "Entrar"}
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
