import { OBJ } from "@/lib/expand-comercial";

export default function Objecoes() {
  return (
    <>
      <p className="hx-eyebrow">Quando ele diz não</p>
      <h1 className="ex-h1">Contorno de <span className="hx-accent-text">objeções</span></h1>
      <p className="ex-sub">A sequência que não muda: solte a pressão · isole a objeção · concorde e contorne com prova · confirme os 3 sins · só então refaça a proposta. Pular o isolamento é o erro mais comum — você contorna a objeção errada e a real continua lá.</p>
      {OBJ.map((o, i) => (
        <div key={i} className="ex-obj hx-glass">
          <div className="oq">{o.q}</div>
          <div className="ot">{o.t}</div>
          <div className="ex-sc" dangerouslySetInnerHTML={{ __html: o.s }} />
          <div className="oz" dangerouslySetInnerHTML={{ __html: o.z }} />
        </div>
      ))}
    </>
  );
}
