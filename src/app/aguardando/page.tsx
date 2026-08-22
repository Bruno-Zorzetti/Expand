import { redirect } from "next/navigation";
import Link from "next/link";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

async function sair() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function Logo() {
  return (
    <svg width="38" height="38" viewBox="0 0 100 100" fill="none">
      <defs><linearGradient id="lga" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E0BC85" /><stop offset="55%" stopColor="#A07644" /><stop offset="100%" stopColor="#E0BC85" /></linearGradient></defs>
      <circle cx="50" cy="50" r="41" stroke="url(#lga)" strokeWidth="3.4" />
      <path d="M32 19 L70 74" stroke="url(#lga)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M69 19 L38 63" stroke="url(#lga)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M52 53 H88" stroke="url(#lga)" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="34" cy="70" r="7" stroke="url(#lga)" strokeWidth="3.4" />
    </svg>
  );
}

export default async function Aguardando() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (me?.role as string) ?? "pendente";
  if (role === "admin" || role === "equipe") redirect("/expand/v2");
  if (role === "cliente") redirect("/cliente");

  const nome = user.user_metadata?.full_name as string | undefined;
  const tipo = user.user_metadata?.tipo_acesso as string | undefined;

  const passos = [
    { n: 1, txt: "Cadastro realizado", feito: true },
    { n: 2, txt: "Validação pela equipe Expand", feito: false },
    { n: 3, txt: "Acesso liberado", feito: false },
  ];

  return (
    <main className={`${cinzel.variable} tema-expand hx-ambient`} style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "var(--txt)" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 30 }}>
          <Logo />
          <div>
            <div style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 22, fontWeight: 700, letterSpacing: "0.04em" }}>EXPAND</div>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent)" }}>Motor de Trabalho</div>
          </div>
        </div>

        <div className="hx-glass" style={{ padding: "32px 28px", borderRadius: 18 }}>
          {/* Ícone animado */}
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 20, margin: "0 auto 16px",
              display: "grid", placeItems: "center",
              background: "color-mix(in srgb, var(--accent) 14%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              fontSize: 28,
            }}>
              {tipo === "cliente" ? "★" : "◆"}
            </div>
            <h1 style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              {nome ? `Olá, ${nome.split(" ")[0]}!` : "Cadastro recebido!"}
            </h1>
            <p style={{ fontSize: 14, color: "var(--mut)", lineHeight: 1.6 }}>
              {tipo === "cliente"
                ? "Seu cadastro como cliente foi registrado. A equipe Expand vai validar e liberar seu acesso em breve."
                : "Seu cadastro como membro da equipe foi registrado. A gestão precisa aprovar antes de entrar."}
            </p>
          </div>

          {/* Progresso */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, margin: "20px 0 24px" }}>
            {passos.map((p, i) => (
              <div key={p.n} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center",
                    background: p.feito ? "var(--accent)" : "var(--panel-2)",
                    border: p.feito ? "none" : "2px solid var(--line-2)",
                    color: p.feito ? "#0A1512" : "var(--dim)", fontSize: 12, fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {p.feito ? "✓" : p.n}
                  </div>
                  {i < passos.length - 1 && (
                    <div style={{ width: 2, height: 24, background: p.feito ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--line-2)", margin: "3px 0" }} />
                  )}
                </div>
                <div style={{ paddingTop: 4, paddingBottom: i < passos.length - 1 ? 0 : 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: p.feito ? 700 : 400, color: p.feito ? "var(--txt)" : "var(--mut)" }}>
                    {p.txt}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.55, padding: "12px 14px", borderRadius: 10, background: "var(--panel-2)", marginBottom: 20 }}>
            Conta: <b style={{ color: "var(--txt)" }}>{user.email}</b>
            <br />Quando aprovado, é só entrar novamente com o mesmo e-mail.
          </p>

          <form action={sair}>
            <button type="submit" className="hx-btn hx-btn-ghost" style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: 13.5 }}>
              Sair
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/" style={{ fontSize: 12.5, color: "var(--dim)", textDecoration: "none" }}>← Voltar ao catálogo</Link>
        </div>
      </div>
    </main>
  );
}
