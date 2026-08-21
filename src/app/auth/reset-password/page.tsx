"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

const fld: React.CSSProperties = {
  width: "100%", borderRadius: 10, border: "1px solid var(--line-2)", background: "var(--bg)",
  padding: "11px 13px", fontSize: 14, color: "var(--txt)", outline: "none", fontFamily: "inherit",
};

function ResetInner() {
  const router = useRouter();
  const supabase = createClient();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) { setMsg("A senha deve ter no mínimo 6 caracteres."); return; }
    if (senha !== confirmar) { setMsg("As senhas não coincidem."); return; }
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setMsg("Erro ao atualizar senha. O link pode ter expirado — solicite um novo.");
    } else {
      setDone(true);
      setTimeout(() => router.replace("/expand/v2"), 2500);
    }
    setLoading(false);
  }

  return (
    <main
      className={`${cinzel.variable} tema-expand`}
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <img src="/midia/expand-icone-gold.png" width={44} height={44} alt="Expand" style={{ objectFit: "contain" }} />
          <div>
            <div style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 26, fontWeight: 700, letterSpacing: "0.04em", color: "var(--txt)" }}>EXPAND</div>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent)" }}>Motor de Trabalho</div>
          </div>
        </div>

        <div className="hx-glass" style={{ padding: "28px 26px", borderRadius: 18 }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>✓</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", marginBottom: 8 }}>Senha atualizada!</div>
              <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.6 }}>Redirecionando para o painel…</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--txt)", marginBottom: 6 }}>Criar nova senha</div>
                <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.5 }}>Digite e confirme sua nova senha abaixo.</p>
              </div>

              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  required
                  type="password"
                  placeholder="Nova senha (mín. 6 caracteres)"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  style={fld}
                />
                <input
                  required
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  style={fld}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="hx-btn hx-btn-primary"
                  style={{ width: "100%", marginTop: 4, fontSize: 14.5, padding: "12px 14px" }}
                >
                  {loading ? "Aguarde..." : "Salvar nova senha"}
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
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className={`${cinzel.variable} tema-expand`} style={{ minHeight: "100vh", background: "#071610" }} />}>
      <ResetInner />
    </Suspense>
  );
}
