"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

type Brand = null | "hashes" | "expand";

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
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#090e1a" }} />}>
      <LoginInner />
    </Suspense>
  );
}

const fldE: React.CSSProperties = {
  width: "100%", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg)",
  padding: "11px 13px", fontSize: 14, color: "var(--txt)", outline: "none", fontFamily: "inherit",
};
const fldH: React.CSSProperties = {
  width: "100%", borderRadius: 10, border: "1px solid #1e293b", background: "#0f1623",
  padding: "11px 13px", fontSize: 14, color: "#e2e8f0", outline: "none", fontFamily: "inherit",
};

function LoginInner() {
  const params = useSearchParams();
  const nextParam = params.get("next") || "";

  // Se o next já define a brand, pula a tela de escolha
  const autoDetect: Brand = nextParam.startsWith("/hashes") ? "hashes"
    : nextParam.startsWith("/expand") ? "expand"
    : null;

  const [brand, setBrand] = useState<Brand>(autoDetect);
  const destino = nextParam || (brand === "hashes" ? "/hashes/admin" : "/expand/v2");

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
    if (nextParam) {
      window.location.assign(nextParam);
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
      window.location.assign(brand === "hashes" ? "/hashes/admin" : "/expand/v2");
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

  // ── Tela de escolha ────────────────────────────────────────────────────────
  if (!brand) {
    return (
      <main style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#090e1a", fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{ textAlign: "center", maxWidth: 480, padding: "0 24px" }}>
          <p style={{ fontSize: 13, color: "#475569", marginBottom: 40, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Selecione a plataforma
          </p>
          <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
            {/* Card Hashes */}
            <button
              onClick={() => setBrand("hashes")}
              style={{
                flex: 1, maxWidth: 200, padding: "32px 24px", borderRadius: 16, cursor: "pointer",
                background: "#0f1623", border: "1px solid #1e293b",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#2563eb")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e293b")}
            >
              <span style={{ fontSize: 44 }}>⚡</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#60a5fa" }}>Hashes</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>CRM · Ferramentas · IA</div>
              </div>
            </button>

            {/* Card Expand */}
            <button
              onClick={() => setBrand("expand")}
              style={{
                flex: 1, maxWidth: 200, padding: "32px 24px", borderRadius: 16, cursor: "pointer",
                background: "#04110B", border: "1px solid #0f2d1e",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#C8A84E")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#0f2d1e")}
            >
              <LogoMark size={44} variant="gold" />
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#C8A84E", fontFamily: "Georgia, serif", letterSpacing: "0.04em" }}>EXPAND</div>
                <div style={{ fontSize: 11, color: "#3d5c46", marginTop: 4 }}>Motor de Trabalho</div>
              </div>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Formulário de login ────────────────────────────────────────────────────
  const isHashes = brand === "hashes";

  return (
    <main
      className={isHashes ? cinzel.variable : `${cinzel.variable} tema-expand`}
      style={{ minHeight: "100vh", display: "flex", alignItems: "stretch", background: isHashes ? "#090e1a" : undefined }}
    >
      {/* Lado esquerdo — branding (desktop) */}
      <div
        className="ex-login-left"
        style={{
          flex: 1, display: "none", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          position: "relative", overflow: "hidden",
          background: isHashes
            ? "linear-gradient(155deg, #050d1a 0%, #0a1628 40%, #0f1e36 70%, #090e1a 100%)"
            : "linear-gradient(155deg, #04110B 0%, #0A2117 35%, #0F2D1E 60%, #071610 100%)",
        }}
      >
        <div style={{ position: "relative", textAlign: "center", padding: "60px 64px", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
          {isHashes ? (
            <>
              <div style={{ fontSize: 64, lineHeight: 1 }}>⚡</div>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", color: "#60a5fa", marginTop: 20 }}>
                Hashes
              </div>
              <div style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(96,165,250,0.5)", marginTop: 10 }}>
                Plataforma interna
              </div>
              <p style={{ marginTop: 40, fontSize: 13, color: "rgba(148,163,184,0.5)", lineHeight: 1.8, maxWidth: 280 }}>
                CRM de disparos, leads, campanhas e automações WhatsApp.
              </p>
            </>
          ) : (
            <>
              <LogoMark size={100} />
              <div style={{
                fontFamily: "var(--font-cinzel), Georgia, serif",
                fontSize: 52, fontWeight: 700, letterSpacing: "0.1em",
                color: "#C8A84E", marginTop: 28, lineHeight: 1,
                textShadow: "0 0 60px rgba(200,168,78,0.3)",
              }}>
                EXPAND
              </div>
              <div style={{ fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase", color: "rgba(200,168,78,0.55)", marginTop: 10 }}>
                Motor de Trabalho
              </div>
              <div style={{ marginTop: 48, width: 40, height: 1, background: "linear-gradient(90deg, transparent, rgba(200,168,78,0.4), transparent)" }} />
              <p style={{ marginTop: 32, fontSize: 13.5, color: "rgba(180,220,200,0.45)", lineHeight: 1.8, maxWidth: 300, letterSpacing: "0.02em" }}>
                Tarefas, pipeline, portal do cliente e agentes de IA — integrados e organizados.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: isHashes ? "#0f1623" : "var(--bg)" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Logo mobile */}
          <div className="ex-login-logo-mobile" style={{ textAlign: "center", marginBottom: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {isHashes ? (
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#60a5fa" }}>
                ⚡ Hashes
              </div>
            ) : (
              <>
                <LogoMark size={44} variant="gold" />
                <div>
                  <div style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 26, fontWeight: 700, letterSpacing: "0.04em", color: "var(--txt)" }}>EXPAND</div>
                  <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)" }}>Motor de Trabalho</div>
                </div>
              </>
            )}
          </div>

          <div style={{
            padding: "28px 26px", borderRadius: 18,
            background: isHashes ? "#090e1a" : undefined,
            border: isHashes ? "1px solid #1e293b" : undefined,
          }} className={isHashes ? "" : "hx-glass"}>

            {showForgot ? (
              <div>
                <button
                  onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); setMsg(null); }}
                  style={{ background: "none", border: "none", color: isHashes ? "#475569" : "var(--dim)", cursor: "pointer", fontSize: 12, padding: 0, marginBottom: 16, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
                >
                  ← Voltar
                </button>
                {forgotSent ? (
                  <div style={{ textAlign: "center", paddingTop: 8 }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isHashes ? "#e2e8f0" : "var(--txt)", marginBottom: 8 }}>E-mail enviado!</div>
                    <p style={{ fontSize: 13, color: isHashes ? "#64748b" : "var(--mut)", lineHeight: 1.6 }}>
                      Verifique sua caixa de entrada em <strong>{forgotEmail}</strong> e clique no link para criar uma nova senha.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: isHashes ? "#e2e8f0" : "var(--txt)", marginBottom: 6 }}>Esqueceu sua senha?</div>
                      <p style={{ fontSize: 13, color: isHashes ? "#64748b" : "var(--mut)", lineHeight: 1.5 }}>
                        Informe seu e-mail e enviaremos um link para criar uma nova senha.
                      </p>
                    </div>
                    <form onSubmit={submitForgot} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <input required type="email" placeholder="Seu e-mail" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} style={isHashes ? fldH : fldE} />
                      <button type="submit" disabled={forgotLoading}
                        style={isHashes ? { width: "100%", marginTop: 4, fontSize: 14.5, padding: "12px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" } : undefined}
                        className={isHashes ? "" : "hx-btn hx-btn-primary"}
                      >
                        {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
                      </button>
                    </form>
                    {msg && <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 9, background: isHashes ? "#0f1623" : "var(--panel-2)", fontSize: 13, color: isHashes ? "#64748b" : "var(--mut)", lineHeight: 1.55 }}>{msg}</div>}
                  </>
                )}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: isHashes ? "#e2e8f0" : "var(--txt)", marginBottom: 4 }}>Entrar na plataforma</div>
                  <p style={{ fontSize: 12.5, color: isHashes ? "#475569" : "var(--dim)", lineHeight: 1.5 }}>
                    Acesso por convite. Fale com um administrador para solicitar.
                  </p>
                </div>

                <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input required type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={isHashes ? fldH : fldE} />
                  <input required type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} style={isHashes ? fldH : fldE} />

                  <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); setMsg(null); }}
                    style={{ alignSelf: "flex-end", fontSize: 12, color: isHashes ? "#475569" : "var(--dim)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", marginTop: -2 }}
                  >
                    Esqueci minha senha
                  </button>

                  <button type="submit" disabled={loading} aria-busy={loading}
                    className={isHashes ? "" : "hx-btn hx-btn-primary"}
                    style={isHashes ? { width: "100%", marginTop: 4, fontSize: 14.5, padding: "12px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" } : { width: "100%", marginTop: 4, fontSize: 14.5, padding: "12px 14px" }}
                  >
                    {loading ? "Aguarde..." : "Entrar"}
                  </button>
                </form>

                {msg && <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 9, background: isHashes ? "#0f1623" : "var(--panel-2)", fontSize: 13, color: isHashes ? "#64748b" : "var(--mut)", lineHeight: 1.55 }}>{msg}</div>}

                {/* Voltar para escolha */}
                {!autoDetect && (
                  <button onClick={() => { setBrand(null); setMsg(null); setEmail(""); setSenha(""); }}
                    style={{ marginTop: 20, width: "100%", background: "none", border: "none", fontSize: 12, color: isHashes ? "#334155" : "var(--dim)", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    ← Trocar plataforma
                  </button>
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
