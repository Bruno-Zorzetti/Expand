/**
 * /expand/vma — VMA: Vitrine de Imóveis
 * Dashboard de diagnóstico OLX + visão geral de portais.
 */
import { exigirAdmin } from "@/lib/expand-acesso";
import { createClient } from "@/lib/supabase/server";
import type { CSSProperties } from "react";
import VmaClient from "./VmaClient";
import type { VmaImovel } from "./imoveis/actions";

export const dynamic = "force-dynamic";

// ── Regras OLX Canal Pro ─────────────────────────────────────────────────────
type Severity = "error" | "warning";
type Rule = {
  id: string;
  label: string;
  hint: string;
  severity: Severity;
  check: (l: Listing) => boolean;
};

const RULES: Rule[] = [
  { id: "photos_5", label: "Mínimo 5 fotos",                severity: "error",   hint: "OLX recomenda pelo menos 5 fotos para visibilidade máxima.",          check: (l) => l.photos >= 5 },
  { id: "photos_3", label: "Pelo menos 3 fotos",            severity: "error",   hint: "Mínimo absoluto para publicação no OLX Canal Pro.",                   check: (l) => l.photos >= 3 },
  { id: "price",    label: "Preço > 0",                     severity: "error",   hint: "Imóvel sem preço é rejeitado pelo OLX.",                              check: (l) => l.price > 0 },
  { id: "title",    label: "Título (min 10 chars)",          severity: "error",   hint: "Título obrigatório e descritivo.",                                    check: (l) => (l.title || "").length >= 10 },
  { id: "desc",     label: "Descrição (min 50 chars)",       severity: "warning", hint: "OLX recomenda ao menos 50 caracteres de descrição.",                  check: (l) => (l.description || "").length >= 50 },
  { id: "city",     label: "Cidade informada",               severity: "error",   hint: "Cidade é campo obrigatório para o OLX.",                             check: (l) => (l.city || "").length > 0 },
  { id: "hood",     label: "Bairro informado",               severity: "warning", hint: "Bairro ajuda o OLX a posicionar o anúncio.",                         check: (l) => (l.neighborhood || "").length > 0 },
  { id: "area",     label: "Área total informada",           severity: "warning", hint: "Sem área o anúncio fica menos atraente.",                            check: (l) => l.area > 0 },
  { id: "trans",    label: "Tipo de transação",              severity: "error",   hint: "Deve indicar se é Venda ou Locação.",                                 check: (l) => (l.transactionType || "").length > 0 },
  { id: "type",     label: "Tipo de imóvel informado",       severity: "error",   hint: "Sem tipo, o OLX não consegue categorizar o anúncio.",                 check: (l) => (l.propertyType || "").length > 0 },
];

export type Listing = {
  id: string;
  title: string;
  transactionType: string;
  propertyType: string;
  subPropertyType: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  garages: number;
  area: number;
  usableArea: number;
  city: string;
  state: string;
  neighborhood: string;
  address: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  description: string;
  photos: number;
  photoUrls: string[];
  externalLink: string;
  issues: { id: string; label: string; hint: string; severity: Severity }[];
  score: number;
  status: "ok" | "warning" | "error";
};

function imovelToListing(im: VmaImovel): Listing {
  const tx = im.finalidade === "Locação" ? "For Rent" : "For Sale";
  const price = tx === "For Sale" ? (im.preco_venda || 0) : (im.preco_locacao || 0);
  const fotos = (im.fotos || []).filter(f => f.url);

  const partial: Omit<Listing, "issues" | "score" | "status"> = {
    id:              im.codigo || im.id.slice(0, 8),
    title:           im.titulo || "",
    transactionType: tx,
    propertyType:    im.tipo || "",
    subPropertyType: im.subtipo || "",
    price,
    currency:        "BRL",
    bedrooms:        im.quartos || 0,
    bathrooms:       im.banheiros || 0,
    garages:         im.vagas || 0,
    area:            im.area_total || 0,
    usableArea:      im.area_util || 0,
    city:            im.cidade || "",
    state:           im.estado || "",
    neighborhood:    im.bairro || "",
    address:         im.endereco || "",
    zipCode:         im.cep || "",
    latitude:        im.latitude ? String(im.latitude) : "",
    longitude:       im.longitude ? String(im.longitude) : "",
    description:     im.descricao || "",
    photos:          fotos.length,
    photoUrls:       fotos.slice(0, 6).map(f => f.url),
    externalLink:    im.link_video || im.link_tour || "",
  };

  const issues = RULES
    .filter(r => !r.check(partial as Listing))
    .map(r => ({ id: r.id, label: r.label, hint: r.hint, severity: r.severity }));

  const errors   = issues.filter(i => i.severity === "error").length;
  const warnings = issues.filter(i => i.severity === "warning").length;
  const score    = Math.max(0, 100 - errors * 15 - warnings * 5);
  const status   = errors > 0 ? "error" : warnings > 0 ? "warning" : "ok";

  return { ...partial, issues, score, status };
}

const PORTAIS = [
  { key: "olx",          label: "OLX Canal Pro",   color: "#9f3fbf" },
  { key: "chavenamao",   label: "Chave na Mão",     color: "#e05c00" },
  { key: "mercadolivre", label: "Mercado Livre",    color: "#ffe600" },
];

export default async function VmaPage() {
  await exigirAdmin();

  const sb = await createClient();
  const { data } = await sb
    .from("vma_imoveis")
    .select("*")
    .eq("status", "Ativo")
    .order("criado_em", { ascending: false });

  const imoveis = (data ?? []) as unknown as VmaImovel[];
  const listings = imoveis.map(imovelToListing);

  const totalOk      = listings.filter(l => l.status === "ok").length;
  const totalWarning = listings.filter(l => l.status === "warning").length;
  const totalError   = listings.filter(l => l.status === "error").length;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://expand.hshs.com.br";
  const feedPublicUrl  = `${baseUrl}/api/vma/feed`;
  const leadsPublicUrl = `${baseUrl}/api/vma/leads`;

  const CD: CSSProperties = {
    fontFamily: "monospace", fontSize: 11, background: "var(--panel-2)",
    border: "1px solid var(--line)", borderRadius: 6, padding: "2px 7px", color: "var(--accent)",
  };

  // Contagem por portal (apenas ativos)
  const portalCount: Record<string, number> = {};
  for (const im of imoveis) {
    for (const [portal, ativo] of Object.entries(im.portais ?? {})) {
      if (ativo) portalCount[portal] = (portalCount[portal] || 0) + 1;
    }
  }

  return (
    <>
      <p className="hx-eyebrow">Ferramentas · Imóveis</p>
      <h1 className="ex-h1">
        <span className="hx-accent-text">VMA</span> — Vitrine de Imóveis
      </h1>
      <p className="ex-sub">
        Gerencie seu portfólio de imóveis e distribua para os portais de anúncio.
      </p>

      {/* Ação rápida */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <a href="/expand/vma/imoveis/novo" style={{ padding: "9px 20px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
          + Novo imóvel
        </a>
        <a href="/expand/vma/imoveis" style={{ padding: "9px 20px", borderRadius: 10, border: "1px solid var(--line-2)", color: "var(--txt)", fontSize: 13, textDecoration: "none" }}>
          Gerenciar imóveis →
        </a>
      </div>

      {/* KPIs */}
      <div className="ex-kpis" style={{ marginBottom: 24 }}>
        <div className="ex-kpi hx-glass">
          <div className="lab">Imóveis ativos</div>
          <div className="val hx-accent-text">{imoveis.length}</div>
          <div className="foot">no portfólio</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Prontos para OLX</div>
          <div className="val" style={{ color: "var(--green)" }}>{totalOk}</div>
          <div className="foot">sem pendências</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Com avisos</div>
          <div className="val" style={{ color: "var(--warn)" }}>{totalWarning}</div>
          <div className="foot">melhorias recomendadas</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Com erros</div>
          <div className="val" style={{ color: "var(--red)" }}>{totalError}</div>
          <div className="foot">bloqueados para publicação</div>
        </div>
      </div>

      {/* Portais */}
      <div className="ex-grph"><span className="gt">Portais de divulgação</span><span className="gc">feed + leads por portal</span><span className="gl" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 24 }}>
        {PORTAIS.map(p => {
          const count = portalCount[p.key] || 0;
          return (
            <div key={p.key} className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${p.color}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--txt)", marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: p.color, marginBottom: 4 }}>{count}</div>
              <div style={{ fontSize: 11, color: "var(--dim)" }}>imóveis com este portal ativo</div>
            </div>
          );
        })}
      </div>

      {/* URLs públicas do bridge */}
      <div className="ex-grph"><span className="gt">URLs do bridge (cadastre no portal)</span><span className="gl" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Feed XML (GrupZap)", url: feedPublicUrl, color: "var(--accent)", note: "?bust=1 força refresh imediato" },
          { label: "Leads (POST)",       url: leadsPublicUrl, color: "#48bb78", note: "substitua a URL direta do Ingaia no painel do portal" },
        ].map(item => (
          <div key={item.label} className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${item.color}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
            <code style={{ ...CD, color: item.color, display: "block", wordBreak: "break-all", padding: "6px 10px" }}>{item.url}</code>
            <p style={{ fontSize: 10.5, color: "var(--dim)", margin: "4px 0 0" }}>{item.note}</p>
          </div>
        ))}
      </div>

      {/* Regras OLX */}
      <div className="ex-grph"><span className="gt">Regras OLX Canal Pro verificadas</span><span className="gl" /></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {RULES.map(r => (
          <span key={r.id} style={{
            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
            background: r.severity === "error" ? "color-mix(in srgb, var(--red) 12%, transparent)" : "color-mix(in srgb, var(--warn) 12%, transparent)",
            color: r.severity === "error" ? "var(--red)" : "var(--warn)",
            border: `1px solid ${r.severity === "error" ? "color-mix(in srgb, var(--red) 25%, transparent)" : "color-mix(in srgb, var(--warn) 25%, transparent)"}`,
          }}>
            {r.severity === "error" ? "✗" : "⚠"} {r.label}
          </span>
        ))}
      </div>

      {/* Diagnóstico por imóvel */}
      {listings.length === 0 ? (
        <div className="hx-glass" style={{ borderRadius: 12, padding: 40, textAlign: "center", color: "var(--dim)" }}>
          Nenhum imóvel ativo. <a href="/expand/vma/imoveis/novo" style={{ color: "var(--accent)" }}>Cadastrar o primeiro →</a>
        </div>
      ) : (
        <VmaClient listings={listings} />
      )}
    </>
  );
}
