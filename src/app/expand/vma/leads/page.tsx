import { exigirAdmin } from "@/lib/expand-acesso";
import { createClient } from "@/lib/supabase/server";
import LeadsClient from "./LeadsClient";

export const dynamic = "force-dynamic";

export type VmaLead = {
  id: string;
  portal: string;
  listing_id: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  mensagem: string | null;
  raw: Record<string, unknown>;
  status: "novo" | "contatado" | "descartado" | "fechado";
  criado_em: string;
};

export default async function LeadsPage() {
  await exigirAdmin();

  const sb = await createClient();
  const { data } = await sb
    .from("vma_leads")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(200);

  const leads = (data ?? []) as unknown as VmaLead[];

  const novos      = leads.filter(l => l.status === "novo").length;
  const contatados = leads.filter(l => l.status === "contatado").length;
  const fechados   = leads.filter(l => l.status === "fechado").length;

  const portais: Record<string, number> = {};
  for (const l of leads) {
    portais[l.portal] = (portais[l.portal] || 0) + 1;
  }

  return (
    <>
      <p className="hx-eyebrow">VMA · Ferramentas</p>
      <h1 className="ex-h1">Leads recebidos</h1>
      <p className="ex-sub" style={{ marginBottom: 24 }}>
        Contatos recebidos pelos portais de anúncio.
      </p>

      <div className="ex-kpis" style={{ marginBottom: 24 }}>
        <div className="ex-kpi hx-glass">
          <div className="lab">Total</div>
          <div className="val hx-accent-text">{leads.length}</div>
          <div className="foot">leads recebidos</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Novos</div>
          <div className="val" style={{ color: "var(--red)" }}>{novos}</div>
          <div className="foot">aguardando contato</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Contatados</div>
          <div className="val" style={{ color: "var(--warn)" }}>{contatados}</div>
          <div className="foot">em andamento</div>
        </div>
        <div className="ex-kpi hx-glass">
          <div className="lab">Fechados</div>
          <div className="val" style={{ color: "var(--green)" }}>{fechados}</div>
          <div className="foot">negócio realizado</div>
        </div>
      </div>

      {/* Por portal */}
      {Object.keys(portais).length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {Object.entries(portais).map(([portal, count]) => (
            <span key={portal} style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}>
              {portal.toUpperCase()}: {count}
            </span>
          ))}
        </div>
      )}

      <LeadsClient leads={leads} />
    </>
  );
}
