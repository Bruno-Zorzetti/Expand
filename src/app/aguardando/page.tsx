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

export default async function Aguardando() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (me?.role as string) ?? "pendente";
  // Já aprovado? Manda pro lugar certo.
  if (role === "admin" || role === "equipe") redirect("/expand");
  if (role === "cliente") redirect("/cliente");

  return (
    <main className={`${cinzel.variable} tema-expand hx-ambient`} style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: "var(--txt)" }}>
      <div className="hx-glass" style={{ width: "100%", maxWidth: 460, padding: 34, borderRadius: 18, textAlign: "center" }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, margin: "0 auto 18px", display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)", fontSize: 26 }}>⏳</div>
        <h1 style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 24, fontWeight: 700, color: "var(--txt)" }}>Conta em aprovação</h1>
        <p style={{ fontSize: 14, color: "var(--mut)", lineHeight: 1.6, marginTop: 12 }}>
          Recebemos seu cadastro, <b style={{ color: "var(--txt)" }}>{user.email}</b>. Por segurança, todo acesso — equipe ou cliente — é <b style={{ color: "var(--txt)" }}>liberado pela equipe da Expand</b> antes de entrar.
        </p>
        <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.55, marginTop: 10 }}>
          Assim que aprovarem, é só entrar de novo com o mesmo e-mail e senha. Qualquer coisa, fale com a equipe.
        </p>
        <form action={sair} style={{ marginTop: 22 }}>
          <button type="submit" className="hx-btn hx-btn-ghost" style={{ padding: "9px 18px", fontSize: 13 }}>Sair</button>
        </form>
        <div style={{ marginTop: 14 }}>
          <Link href="/" style={{ fontSize: 12.5, color: "var(--dim)", textDecoration: "none" }}>← Voltar ao início</Link>
        </div>
      </div>
    </main>
  );
}
