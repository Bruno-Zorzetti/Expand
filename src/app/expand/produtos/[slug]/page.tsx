import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcesso } from "@/lib/expand-acesso";
import AgenteChat from "@/components/expand/AgenteChat";

export const dynamic = "force-dynamic";

type P = {
  id: string; name: string; slug: string; category: string | null; tagline: string | null;
  description: string | null; price: number | null; preco_setup: number | null;
  preco_mensal: number | null; recorrente: boolean; delivery: string | null;
  popular: boolean; active: boolean;
};

export default async function ProdutoVisaoGeral({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { isAdmin } = await getAcesso();

  const { data: prod } = await supabase.from("products").select("*").eq("slug", slug).single();
  if (!prod) notFound();
  const p = prod as P;

  const [{ data: fData }, { data: eData }] = await Promise.all([
    supabase.from("expand_prod_fases").select("id").eq("produto_slug", slug),
    supabase.from("expand_prod_etapas").select("id, visivel_cliente, agente").eq("produto_slug", slug),
  ]);
  const fases = fData?.length ?? 0;
  const etapas = eData?.length ?? 0;
  const visiveis = eData?.filter((e) => e.visivel_cliente).length ?? 0;
  const comIA = eData?.filter((e) => e.agente).length ?? 0;

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR");
  const preco = p.recorrente
    ? p.preco_mensal ? `R$ ${fmtBRL(p.preco_mensal)}/mês` : "Mensal"
    : p.price ? `R$ ${fmtBRL(p.price)}` : p.delivery ?? "—";
  const setup = p.preco_setup ? `+ R$ ${fmtBRL(p.preco_setup)} setup` : null;

  return (
    <>
      <div className="ex-kpis" style={{ marginBottom: 20 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Fases</div><div className="val hx-accent-text">{fases}</div><div className="foot">blocos do processo</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Etapas</div><div className="val hx-accent-text">{etapas}</div><div className="foot">tarefas instanciáveis</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Visíveis ao cliente</div><div className="val">{visiveis}</div><div className="foot">aparecem no portal</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Com agente de IA</div><div className="val">{comIA}</div><div className="foot">executadas por agente</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent)", marginBottom: 12 }}>Precificação</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--txt)", marginBottom: 4 }}>{preco}</div>
          {setup && <div style={{ fontSize: 12, color: "var(--mut)" }}>{setup}</div>}
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {p.popular && <span className="ex-pill" style={{ background: "color-mix(in srgb,var(--accent) 16%,transparent)", color: "var(--accent)" }}>Popular</span>}
            {p.recorrente && <span className="ex-pill" style={{ color: "var(--mut)" }}>Recorrente</span>}
            <span className="ex-pill" style={{ color: p.active ? "var(--green)" : "var(--dim)" }}>{p.active ? "Ativo" : "Rascunho"}</span>
          </div>
        </div>

        <div className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent)", marginBottom: 10 }}>Descrição</div>
          {p.description ? (
            <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.6 }}>{p.description}</p>
          ) : (
            <p style={{ fontSize: 12, color: "var(--dim)" }}>
              Sem descrição cadastrada.{" "}
              {isAdmin && <Link href={`/expand/produtos/novo?edit=${slug}`} style={{ color: "var(--accent)" }}>Editar produto</Link>}
            </p>
          )}
        </div>
      </div>

      {isAdmin && (
        <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
          <Link href={`/expand/produtos/novo?edit=${slug}`} className="hx-btn hx-btn-primary">Editar produto</Link>
          <Link href={`/expand/produtos/${slug}/processo`} className="hx-btn">Configurar processo</Link>
          <Link href={`/expand/produtos/${slug}/cronograma`} className="hx-btn">Ver cronograma</Link>
          <Link href={`/expand/produtos/${slug}/entregaveis`} className="hx-btn">Entregáveis do cliente</Link>
        </div>
      )}

      <details className="ex-panel hx-glass">
        <summary className="ph" style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#5FA8D3" }} />
          <span className="pt">Analisar com o Agente de Produtos</span>
          <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--dim)" }}>oferta · prazos · equipe · margem</span>
        </summary>
        <div className="pb">
          <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 10 }}>
            Uma leitura do produto antes de publicar: se os prazos batem com o tempo real, se a equipe dá conta e o que melhorar.
          </p>
          <AgenteChat id="agente-produtos" nome="Agente de Produtos" cor="#5FA8D3" tipo="agente" contexto={{ produto: slug }} memoriaHref="/expand/equipe/agente-produtos/conhecimento" />
        </div>
      </details>
    </>
  );
}
