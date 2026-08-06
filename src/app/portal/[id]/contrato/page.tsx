import { createClient } from "@/lib/supabase/server";
import { MESES, BASE_MENSAL } from "@/lib/expand-gov";

export const dynamic = "force-dynamic";

export default async function MeuPide({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cli } = await supabase.from("expand_cliente_publico").select("contrato_ini, contrato_dur, contrato_tipo").eq("id", id).single();
  const dur = (cli?.contrato_dur as number | null) ?? 12;
  let mesAtual = 1;
  if (cli?.contrato_ini) {
    const dias = Math.floor((Date.now() - new Date(cli.contrato_ini as string).getTime()) / 864e5);
    mesAtual = Math.min(Math.max(Math.floor(dias / 30) + 1, 1), dur || 12);
  }
  const meses = MESES.slice(0, dur || 12);
  const mAtual = meses.find((m) => m.m === mesAtual) ?? meses[0];

  return (
    <>
      <div className="ex-hero" style={{ padding: "24px 28px" }}>
        <div className="eb">{cli?.contrato_tipo ?? "PIDE"} · Mês {mesAtual} de {dur || 12}</div>
        <h2>{mAtual?.nm ?? "Seu PIDE"}</h2>
        <p>{mAtual?.foco}</p>
      </div>

      <div className="ex-grph"><span className="gt">Todo mês você recebe</span><span className="gc">{BASE_MENSAL.length}</span><span className="gl" /></div>
      <div className="ex-panel hx-glass">
        <div className="pb" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 8 }}>
          {BASE_MENSAL.map((b) => <div key={b} className="ex-mini"><span className="ml">• {b}</span></div>)}
        </div>
      </div>

      <div className="ex-grph" style={{ marginTop: 24 }}><span className="gt">A linha do seu contrato</span><span className="gl" /></div>
      <div className="ex-meses">
        {meses.map((m) => {
          const st = m.m < mesAtual ? "done" : m.m === mesAtual ? "now" : "";
          return (
            <div key={m.m} className="ex-mes hx-glass" style={st === "now" ? { borderColor: "var(--accent)" } : undefined}>
              <div className="mn" style={{ color: st === "done" ? "var(--green)" : "var(--accent)" }}>Mês {m.m}{st === "now" ? " · você está aqui" : st === "done" ? " · concluído" : ""}</div>
              <div className="mtit">{m.nm}</div>
              <div className="mfoco">{m.foco}</div>
              <span className="mmk">◆ {m.mk}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
