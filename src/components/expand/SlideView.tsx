import { OURO as C, type Slide } from "@/lib/expand-slides";

// Renderiza UM slide numa tela fixa 1920×1080 (o container faz o scale).
export default function SlideView({ slide: s }: { slide: Slide }) {
  const centered = s.layout === "encerramento" || s.layout === "citacao" || s.layout === "secao";
  const Eyebrow = s.eyebrow ? (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, fontSize: 24, letterSpacing: "0.24em", textTransform: "uppercase", color: C.ouro, fontWeight: 600, marginBottom: 28 }}>
      <span style={{ width: 40, height: 2, background: `linear-gradient(90deg,${C.ouro},${C.ouroHi})` }} />{s.eyebrow}
    </div>
  ) : null;
  const Foot = !centered ? (
    <div style={{ position: "absolute", left: 140, right: 140, bottom: 56, display: "flex", alignItems: "center", gap: 10, fontSize: 22, letterSpacing: "0.12em", color: C.dim }}>
      <span style={{ width: 22, height: 2, background: `linear-gradient(90deg,${C.ouro},${C.ouroHi})` }} />GRUPO EXPAND
    </div>
  ) : null;

  return (
    <div style={{ width: 1920, height: 1080, position: "relative", background: C.bg, color: C.txt, padding: 140, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: centered ? "center" : "stretch", textAlign: centered ? "center" : "left", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      {s.layout === "capa" && (<>
        {Eyebrow}
        <h1 style={{ fontFamily: C.serif, fontSize: 140, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.01em" }}>{s.titulo}</h1>
        {s.subtitulo ? <p style={{ fontSize: 38, color: C.mut, maxWidth: 1300, marginTop: 34, lineHeight: 1.5 }}>{s.subtitulo}</p> : null}
      </>)}

      {s.layout === "secao" && (<>
        <div style={{ width: 60, height: 2, background: `linear-gradient(90deg,${C.ouro},${C.ouroHi})`, marginBottom: 34 }} />
        {s.eyebrow ? <div style={{ fontSize: 26, letterSpacing: "0.24em", textTransform: "uppercase", color: C.ouro, fontWeight: 600, marginBottom: 20 }}>{s.eyebrow}</div> : null}
        <h2 style={{ fontFamily: C.serif, fontSize: 110, fontWeight: 700, lineHeight: 1.1 }}>{s.titulo}</h2>
      </>)}

      {s.layout === "texto" && (<>
        {Eyebrow}
        <h2 style={{ fontFamily: C.serif, fontSize: 84, fontWeight: 600, lineHeight: 1.12, maxWidth: 1500 }}>{s.titulo}</h2>
        {s.corpo ? <p style={{ fontSize: 38, color: C.mut, maxWidth: 1400, marginTop: 36, lineHeight: 1.55 }}>{s.corpo}</p> : null}
      </>)}

      {s.layout === "topicos" && (<>
        {Eyebrow}
        <h2 style={{ fontFamily: C.serif, fontSize: 76, fontWeight: 600, lineHeight: 1.1, marginBottom: 44 }}>{s.titulo}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {(s.itens ?? []).map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 22 }}>
              <div style={{ width: 46, height: 46, flexShrink: 0, borderRadius: "50%", background: `linear-gradient(135deg,${C.ouro},${C.ouroHi})`, color: "#0A1512", display: "grid", placeItems: "center", fontFamily: C.serif, fontWeight: 700, fontSize: 24, marginTop: 4 }}>{i + 1}</div>
              <div style={{ fontSize: 34, color: C.txt, lineHeight: 1.4, maxWidth: 1440 }}>{it}</div>
            </div>
          ))}
        </div>
      </>)}

      {s.layout === "numero" && (<>
        {Eyebrow}
        <div style={{ display: "flex", gap: 70, alignItems: "baseline" }}>
          <div>
            <div style={{ fontFamily: C.serif, fontSize: 150, fontWeight: 700, color: C.ouro, lineHeight: 1 }}>{s.numero}</div>
            {s.titulo ? <div style={{ fontSize: 32, color: C.mut, marginTop: 12, maxWidth: 640 }}>{s.titulo}</div> : null}
          </div>
          {s.corpo ? <><div style={{ width: 1, alignSelf: "stretch", background: C.line }} /><p style={{ fontSize: 38, color: C.txt, lineHeight: 1.4, fontFamily: C.serif, maxWidth: 760 }}>{s.corpo}</p></> : null}
        </div>
      </>)}

      {s.layout === "citacao" && (<>
        <div style={{ fontFamily: C.serif, fontSize: 30, color: C.ouro, marginBottom: 20 }}>❝</div>
        <h2 style={{ fontFamily: C.serif, fontSize: 72, fontWeight: 600, lineHeight: 1.25, maxWidth: 1500 }}>{s.titulo}</h2>
        {s.autor ? <p style={{ fontSize: 30, color: C.mut, marginTop: 28, letterSpacing: "0.05em" }}>— {s.autor}</p> : null}
      </>)}

      {s.layout === "encerramento" && (<>
        <div style={{ width: 60, height: 2, background: `linear-gradient(90deg,${C.ouro},${C.ouroHi})`, marginBottom: 40 }} />
        <h2 style={{ fontFamily: C.serif, fontSize: 118, fontWeight: 700 }}>{s.titulo}</h2>
        {s.subtitulo ? <p style={{ fontSize: 34, color: C.mut, marginTop: 26 }}>{s.subtitulo}</p> : null}
      </>)}

      {Foot}
    </div>
  );
}
