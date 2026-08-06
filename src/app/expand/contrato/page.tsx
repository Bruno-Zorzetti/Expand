import { MESES, BASE_MENSAL } from "@/lib/expand-gov";

export default function Contrato() {
  return (
    <>
      <p className="hx-eyebrow">12 meses</p>
      <h1 className="ex-h1">Linha do <span className="hx-accent-text">Contrato</span></h1>
      <p className="ex-sub">Os 12 meses do PIDE em uma linha. O pacote mensal é fixo; o que muda é o marco estratégico ancorado em cada mês.</p>

      <div className="ex-grph"><span className="gt">Pacote mensal fixo — todo mês se repete</span><span className="gc">{BASE_MENSAL.length}</span><span className="gl" /></div>
      <div className="ex-panel hx-glass">
        <div className="pb" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 8 }}>
          {BASE_MENSAL.map((b) => (
            <div key={b} className="ex-mini"><span className="ml">• {b}</span></div>
          ))}
        </div>
      </div>

      <div className="ex-grph" style={{ marginTop: 24 }}><span className="gt">Marcos por mês</span><span className="gl" /></div>
      <div className="ex-meses">
        {MESES.map((m) => (
          <div key={m.m} className="ex-mes hx-glass hx-glass-hover">
            <div className="mn">Mês {m.m}</div>
            <div className="mtit">{m.nm}</div>
            <div className="mfoco">{m.foco}</div>
            <span className="mmk">◆ {m.mk}</span>
          </div>
        ))}
      </div>
    </>
  );
}
