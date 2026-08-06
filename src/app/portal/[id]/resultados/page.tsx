import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Resultados({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cli } = await supabase.from("expand_cliente_publico").select("nome").eq("id", id).single();

  const grupos: { titulo: string; mets: { l: string; v: string; d: string; up?: boolean }[] }[] = [
    {
      titulo: "Comercial — o que realmente conta",
      mets: [
        { l: "Leads gerados", v: "47", d: "Ciclo atual", up: true },
        { l: "Reuniões agendadas", v: "9", d: "19% dos leads", up: true },
        { l: "Custo por reunião", v: "R$ 222", d: "Métrica principal" },
        { l: "Clientes fechados", v: "2", d: "Acompanhado até a venda", up: true },
      ],
    },
    {
      titulo: "Conteúdo e perfil",
      mets: [
        { l: "Seguidores", v: "2.847", d: "+124 no ciclo", up: true },
        { l: "Alcance / 30d", v: "18,4 mil", d: "+41% vs. anterior", up: true },
        { l: "Visitas ao perfil", v: "1.203", d: "+67% após a nova bio", up: true },
        { l: "Cliques no link", v: "86", d: "+22 vs. anterior", up: true },
      ],
    },
    {
      titulo: "Produção no ciclo",
      mets: [
        { l: "Roteiros", v: "9 / 9", d: "Aprovados" },
        { l: "Vídeos gravados", v: "9 / 9", d: "Captação concluída" },
        { l: "Vídeos publicados", v: "6", d: "No calendário" },
        { l: "Depoimentos", v: "3", d: "Ciclo anterior" },
      ],
    },
  ];

  return (
    <>
      <div className="ex-hero" style={{ padding: "24px 28px" }}>
        <div className="eb">Resultados</div>
        <h2>Os números de {cli?.nome}</h2>
        <p>O que importa não é alcance: é quantas reuniões e quantos clientes o digital gerou. Números do ciclo atual.</p>
      </div>

      {grupos.map((g) => (
        <div key={g.titulo}>
          <div className="ex-grph"><span className="gt">{g.titulo}</span><span className="gl" /></div>
          <div className="ex-kpis">
            {g.mets.map((m) => (
              <div key={m.l} className="ex-kpi hx-glass">
                <div className="lab">{m.l}</div>
                <div className="val" style={{ fontSize: 24, color: m.up ? "var(--green)" : "var(--txt)" }}>{m.v}</div>
                <div className="foot">{m.d}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p style={{ color: "var(--dim)", fontSize: 11.5, marginTop: 18 }}>Números ilustrativos — serão ligados às campanhas e ao perfil reais na integração de métricas.</p>
    </>
  );
}
