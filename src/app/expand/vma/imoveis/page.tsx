import { exigirAdmin } from "@/lib/expand-acesso";
import { createClient } from "@/lib/supabase/server";
import type { VmaImovel } from "./actions";
import ImoveisClient from "./ImoveisClient";

export const dynamic = "force-dynamic";

const PORTAIS_LABELS: Record<string, string> = {
  olx: "OLX", chavenamao: "Chave na Mão", mercadolivre: "Mercado Livre",
};

export default async function ImoveisPage() {
  await exigirAdmin();

  const sb = await createClient();
  const { data } = await sb
    .from("vma_imoveis")
    .select("*")
    .order("criado_em", { ascending: false });

  const imoveis = (data ?? []) as unknown as VmaImovel[];

  // Stats por portal
  const portalStats: Record<string, number> = {};
  for (const im of imoveis) {
    for (const [portal, ativo] of Object.entries(im.portais ?? {})) {
      if (ativo) portalStats[portal] = (portalStats[portal] || 0) + 1;
    }
  }

  return (
    <>
      <p className="hx-eyebrow">VMA · Ferramentas</p>
      <h1 className="ex-h1">Imóveis cadastrados</h1>

      {/* KPIs rápidos */}
      <div className="ex-kpis" style={{ marginBottom: 24 }}>
        <div className="ex-kpi hx-glass">
          <div className="lab">Total</div>
          <div className="val hx-accent-text">{imoveis.length}</div>
          <div className="foot">imóveis no sistema</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Ativos</div>
          <div className="val" style={{ color: "var(--green)" }}>
            {imoveis.filter(i => i.status === "Ativo").length}
          </div>
          <div className="foot">disponíveis para portais</div>
        </div>
        {Object.entries(portalStats).map(([portal, count]) => (
          <div key={portal} className="ex-kpi hx-glass">
            <div className="lab">{PORTAIS_LABELS[portal] || portal}</div>
            <div className="val">{count}</div>
            <div className="foot">publicados</div>
          </div>
        ))}
      </div>

      {/* Botão novo */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <a
          href="/expand/vma/imoveis/novo"
          style={{ padding: "9px 20px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
        >
          + Novo imóvel
        </a>
      </div>

      <ImoveisClient imoveis={imoveis} />
    </>
  );
}
