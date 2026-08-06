import { RITUAIS, SEMAFORO, ESCAL, RISCOS } from "@/lib/expand-gov";
import Ajuda, { AJUDA } from "@/components/expand/Ajuda";

function Tabela({ data }: { data: { cols: string[]; rows: string[][] } }) {
  return (
    <div className="ex-tblwrap hx-glass">
      <table className="ex-tbl">
        <thead><tr>{data.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{data.rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function Ritmo() {
  return (
    <>
      <p className="hx-eyebrow">Rituais e SLA</p>
      <h1 className="ex-h1">Ritmo e <span className="hx-accent-text">Governança</span></h1>
      <p className="ex-sub">O processo só se sustenta com batimento cardíaco. Estes são os encontros fixos e os critérios de escalonamento quando algo trava.</p>

      <div className="ex-grph"><span className="gt">Rituais fixos</span><span className="gl" /></div>
      <Tabela data={RITUAIS} />

      <div className="ex-grph" style={{ marginTop: 24 }}><span className="gt">Semáforo de SLA<Ajuda t={AJUDA.sla} /></span><span className="gl" /></div>
      <div className="ex-cards">
        {SEMAFORO.map((s) => (
          <div key={s.h} className="hx-glass" style={{ padding: "15px 17px", borderLeft: `3px solid ${s.c}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 5, color: s.c }}>{s.h}</div>
            <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55 }}>{s.p}</div>
          </div>
        ))}
      </div>

      <div className="ex-grph" style={{ marginTop: 24 }}><span className="gt">Escalonamento</span><span className="gl" /></div>
      <Tabela data={ESCAL} />

      <div className="ex-grph" style={{ marginTop: 24 }}><span className="gt">Riscos de retrabalho e resposta do sistema</span><span className="gl" /></div>
      <Tabela data={RISCOS} />
    </>
  );
}
