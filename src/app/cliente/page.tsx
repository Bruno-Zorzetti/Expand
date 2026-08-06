import Link from "next/link";
import { redirect } from "next/navigation";
import { Cinzel } from "next/font/google";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

const STATUS: Record<string, { l: string; c: string }> = {
  recebido: { l: "Recebido", c: "var(--mut)" },
  confirmado: { l: "Confirmado", c: "var(--accent)" },
  pago: { l: "Pago", c: "var(--green)" },
  producao: { l: "Em produção", c: "var(--warn)" },
  entregue: { l: "Entregue", c: "var(--green)" },
};

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 100 100" fill="none" style={{ flexShrink: 0 }}>
      <defs><linearGradient id="clg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#E0BC85" /><stop offset="55%" stopColor="#A07644" /><stop offset="100%" stopColor="#E0BC85" /></linearGradient></defs>
      <circle cx="50" cy="50" r="41" stroke="url(#clg)" strokeWidth="3.4" />
      <path d="M32 19 L70 74" stroke="url(#clg)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M69 19 L38 63" stroke="url(#clg)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M52 53 H88" stroke="url(#clg)" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="34" cy="70" r="7" stroke="url(#clg)" strokeWidth="3.4" />
    </svg>
  );
}

// Entrada da área do cliente — painel único no tema Expand.
// não logado → login · equipe → /expand · cliente → PIDE (se houver) + serviços contratados.
export default async function ClienteHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cliente");

  const { data: me } = await supabase.from("profiles").select("role, expand_cliente").eq("id", user.id).single();
  if (me && ["admin", "equipe"].includes(me.role as string)) redirect("/expand");
  const pideId = (me?.expand_cliente as string | null) ?? null;

  const { data: oData } = await supabase
    .from("orders")
    .select("id, status, product_slug, created_at, products(name, category)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const orders = (oData ?? []) as { id: string; status: string; product_slug: string; created_at: string; products: { name: string; category: string | null } | { name: string; category: string | null }[] | null }[];

  return (
    <div className={`${cinzel.variable} tema-expand`}>
      <div className="ex-cwrap hx-ambient">
        <div className="ex-ctop">
          <Logo />
          <div><div className="ex-cbn">EXPAND</div><div className="ex-cbs">Área do cliente</div></div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{user.email}</div>
              <div style={{ fontSize: 10.5, color: "var(--dim)" }}>Sua conta</div>
            </div>
            <Link href="/produtos" className="hx-btn hx-btn-ghost" style={{ padding: "7px 13px", fontSize: 12 }}>Ver produtos ↗</Link>
          </div>
        </div>

        <div className="ex-cmain">
          <p className="hx-eyebrow">Bem-vindo(a)</p>
          <h1 className="ex-h1">Sua <span className="hx-accent-text">área</span></h1>
          <p className="ex-sub">Tudo o que a Expand está fazendo por você num lugar só — o acompanhamento do seu PIDE e os serviços que você contratou.</p>

          {pideId ? (
            <Link href={`/portal/${pideId}`} className="hx-glass hx-glass-hover" style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 22px", textDecoration: "none", color: "inherit", borderLeft: "4px solid var(--accent)", marginBottom: 22 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, display: "grid", placeItems: "center", background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)", fontSize: 22, flexShrink: 0 }}>◆</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Acompanhar meu PIDE</div>
                <div style={{ fontSize: 12.5, color: "var(--mut)" }}>Fases, entregas, aprovações e resultados da sua esteira.</div>
              </div>
              <span className="hx-btn hx-btn-primary" style={{ padding: "8px 15px", fontSize: 12.5, flexShrink: 0 }}>Abrir portal</span>
            </Link>
          ) : null}

          <div className="ex-grph"><span className="gt">Meus serviços</span><span className="gc">{orders.length}</span><span className="gl" /></div>

          {orders.length === 0 ? (
            <div className="hx-glass" style={{ padding: "26px 24px", textAlign: "center" }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>Você ainda não tem serviços contratados.</p>
              <p style={{ color: "var(--mut)", fontSize: 13, marginBottom: 14 }}>Conheça o catálogo da Expand e comece agora.</p>
              <Link href="/produtos" className="hx-btn hx-btn-primary">Ver produtos</Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
              {orders.map((o) => {
                const prod = Array.isArray(o.products) ? o.products[0] : o.products;
                const st = STATUS[o.status] ?? { l: o.status, c: "var(--mut)" };
                return (
                  <Link key={o.id} href={`/projeto/${o.id}`} className="hx-glass hx-glass-hover" style={{ display: "block", padding: "16px 18px", textDecoration: "none", color: "inherit", borderLeft: `3px solid ${st.c}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, minWidth: 0 }}>{prod?.name ?? o.product_slug}</div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: st.c, background: `color-mix(in srgb, ${st.c} 15%, transparent)`, padding: "3px 8px", borderRadius: 7, flexShrink: 0 }}>{st.l}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6, fontFamily: "monospace" }}>
                      {prod?.category ? `${prod.category} · ` : ""}#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--accent)", marginTop: 9, fontWeight: 700 }}>Acompanhar projeto →</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <footer className="ex-foot"><span className="fb">EXPAND</span><span>Área do cliente · seu PIDE e seus serviços num lugar só</span></footer>
      </div>
    </div>
  );
}
