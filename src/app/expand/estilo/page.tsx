import Icon from "@/components/Icon";
import ExpandTema from "@/components/expand/ExpandTema";

const CORES: Record<string, { n: string; v: string }[]> = {
  Superfícies: [
    { n: "bg", v: "#08110E" }, { n: "panel", v: "#0F1B16" }, { n: "panel-2", v: "#13251F" },
    { n: "line", v: "#1D4034" }, { n: "line-2", v: "#28503F" },
  ],
  Texto: [{ n: "txt", v: "#F4E8D4" }, { n: "mut", v: "#B5AC97" }, { n: "dim", v: "#7C8C7F" }],
  "Acento (verde/dourado)": [{ n: "accent", v: "#C89B5E" }, { n: "accent-2", v: "#E0BC85" }],
  Status: [{ n: "green", v: "#6FBF92" }, { n: "warn", v: "#D9A94E" }, { n: "red", v: "#CE6A5F" }],
};

const AREAS = [
  { n: "Comercial", c: "#CE6A5F" }, { n: "PM", c: "#C89B5E" }, { n: "CS", c: "#E6D0A8" },
  { n: "Audiovisual", c: "#6FBF92" }, { n: "Social", c: "#86C0A6" }, { n: "Tráfego", c: "#CE7F4C" },
];
const ICONES = ["user", "users", "target", "chart", "share", "pen", "bolt", "compass", "star", "check", "checkCircle", "briefcase", "building", "calendar", "whatsapp", "link", "wave", "flame", "activity", "settings"];
const GLOW = [{ i: "target", c: "#E0BC85" }, { i: "compass", c: "#6FBF92" }, { i: "bolt", c: "#C89B5E" }, { i: "star", c: "#E6D0A8" }, { i: "share", c: "#86C0A6" }];

function Donut() {
  const size = 140, sw = 12, r = size / 2 - sw, c = 2 * Math.PI * r, off = c * (1 - 0.72);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-32 w-32">
      <defs><linearGradient id="egc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--accent-2)" /></linearGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#egc)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 45%, transparent))" }} />
      <text x="50%" y="47%" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--txt)">72%</text>
      <text x="50%" y="62%" textAnchor="middle" fontSize="9" fill="var(--dim)">execução</text>
    </svg>
  );
}
function LineGlow() {
  const pts = [8, 20, 14, 34, 26, 46, 38, 58, 50, 44, 62], W = 320, H = 80, step = W / (pts.length - 1);
  const y = (v: number) => H - 8 - (v / 66) * (H - 20);
  const d = pts.map((v, i) => `${i ? "L" : "M"} ${i * step} ${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs><linearGradient id="elf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill="url(#elf)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 5px color-mix(in srgb, var(--accent) 60%, transparent))" }} />
    </svg>
  );
}
function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (<section className="ex-grph" style={{ display: "block", margin: "34px 0 0" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}><span className="gt" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>{titulo}</span><span className="gl" /></div>
    {children}
  </section>);
}

export default function EstiloExpand() {
  return (
    <>
      <p className="hx-eyebrow">Brand guideline · Grupo Expand</p>
      <h1 className="ex-h1" style={{ fontSize: 44, lineHeight: 1.05 }}>Estilo <span className="hx-accent-text">Expand</span></h1>
      <p className="ex-sub">O sistema visual da Expand: verde profundo e dourado, serif Cinzel nos títulos, cards de vidro com brilho e cantos arredondados. Sofisticado e consistente — o mesmo motor de cores da plataforma, no template da Expand.</p>

      <Bloco titulo="Editar cores (aplica e salva)">
        <ExpandTema />
      </Bloco>

      <Bloco titulo="Paleta de cores">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {Object.entries(CORES).map(([grupo, cores]) => (
            <div key={grupo}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--mut)", marginBottom: 8 }}>{grupo}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
                {cores.map((c) => (
                  <div key={c.n} className="hx-glass" style={{ padding: 12 }}>
                    <div style={{ height: 52, borderRadius: 10, background: c.v, border: "1px solid var(--line)" }} />
                    <p style={{ fontSize: 12, fontWeight: 600, marginTop: 8 }}>{c.n}</p>
                    <p style={{ fontFamily: "monospace", fontSize: 10, color: "var(--dim)" }}>{c.v}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--mut)", marginBottom: 8 }}>Cores das áreas (fluxo/agentes)</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {AREAS.map((a) => (
                <span key={a.n} className="ex-pill" style={{ background: `color-mix(in srgb, ${a.c} 15%, transparent)`, color: a.c }}><i className="ex-dot" />{a.n}</span>
              ))}
            </div>
          </div>
        </div>
      </Bloco>

      <Bloco titulo="Tipografia">
        <div className="hx-glass" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="hx-eyebrow">Eyebrow · mono uppercase</p>
          <p className="ex-serif" style={{ fontSize: 40, fontWeight: 600, letterSpacing: ".5px" }}>Cinzel · Título display</p>
          <p className="ex-serif" style={{ fontSize: 24, fontWeight: 600 }}>Cinzel · Seção</p>
          <p style={{ fontSize: 18, fontWeight: 700 }}>Inter · Subtítulo</p>
          <p style={{ color: "var(--txt)" }}>Corpo em Inter — legível, com respiro e boa hierarquia.</p>
          <p style={{ fontSize: 13, color: "var(--mut)" }}>Secundário — apoio.</p>
          <p style={{ fontSize: 12, color: "var(--dim)" }}>Terciário — legendas e metadados.</p>
        </div>
      </Bloco>

      <Bloco titulo="Botões & tags">
        <div className="hx-glass" style={{ padding: 24, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <button className="hx-btn hx-btn-primary">Ação primária</button>
          <button className="hx-btn hx-btn-ghost">Secundária</button>
          <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--green) 16%, transparent)", color: "var(--green)" }}><i className="ex-dot" />Concluída</span>
          <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}><i className="ex-dot" />Em execução</span>
          <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--red) 16%, transparent)", color: "var(--red)" }}><i className="ex-dot" />Atrasada</span>
        </div>
      </Bloco>

      <Bloco titulo="Ícones">
        <p style={{ fontSize: 13, color: "var(--mut)", marginBottom: 12 }}>Coloridos, com brilho — reconhecimento rápido:</p>
        <div className="hx-glass" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(64px,1fr))", gap: 16, padding: 22 }}>
          {ICONES.map((n, i) => (
            <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Icon name={n} size={24} className="hx-icon-glow" style={{ color: AREAS[i % AREAS.length].c }} />
              <span style={{ fontSize: 9, color: "var(--dim)" }}>{n}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: "var(--mut)", margin: "18px 0 12px" }}>Tiles em gradiente (destaques e agentes):</p>
        <div className="hx-glass" style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 22 }}>
          {GLOW.map((g) => (
            <span key={g.i} className="hx-icon-tile" style={{ height: 56, width: 56, ["--accent" as string]: g.c, ["--accent-2" as string]: g.c }}>
              <Icon name={g.i} size={26} className="hx-icon-glow" />
            </span>
          ))}
        </div>
      </Bloco>

      <Bloco titulo="Componentes">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
          <div className="hx-glass" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ alignSelf: "flex-start", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Progresso</p><Donut />
          </div>
          <div className="hx-glass" style={{ padding: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Gráfico com glow</p><LineGlow />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 12, textAlign: "center" }}>
              {[["16", "Contas"], ["8,1", "Relação"], ["5,9", "Execução"]].map(([v, l]) => (<div key={l}><p style={{ fontSize: 22, fontWeight: 800 }}>{v}</p><p style={{ fontSize: 11, color: "var(--mut)" }}>{l}</p></div>))}
            </div>
          </div>
          <div className="ex-kpi hx-glass"><div className="lab">Indicador</div><div className="val hx-accent-text">72%</div><div className="foot">KPI no padrão Expand</div></div>
          <div className="ex-panel hx-glass">
            <div className="ph"><span className="pt">Painel</span><span className="pc">3</span></div>
            <div className="pb">
              <div className="ex-mini"><span className="ml">Linha de painel</span><span className="mv">12</span></div>
              <div className="ex-mini"><span className="ml">Outra linha</span><span className="mv" style={{ color: "var(--green)" }}>ok</span></div>
            </div>
          </div>
        </div>
      </Bloco>

      <Bloco titulo="Logos & Marca">
        <div className="hx-glass" style={{ padding: 24, display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
          {[
            { src: "/midia/expand-logo-horizontal-cream.png", label: "Horizontal — Cream" },
            { src: "/midia/expand-logo-horizontal-gold.png", label: "Horizontal — Gold" },
            { src: "/midia/expand-icone-cream.png", label: "Ícone — Cream" },
            { src: "/midia/expand-icone-gold.png", label: "Ícone — Gold" },
          ].map((logo) => (
            <div key={logo.src} style={{ textAlign: "center" }}>
              <div style={{ background: "var(--panel-2)", borderRadius: 10, padding: 20, marginBottom: 8 }}>
                <img src={logo.src} alt={logo.label} style={{ height: 56, maxWidth: 220, objectFit: "contain" }} />
              </div>
              <p style={{ fontSize: 11, color: "var(--dim)" }}>{logo.label}</p>
              <p style={{ fontFamily: "monospace", fontSize: 10, color: "var(--line-2)" }}>{logo.src}</p>
            </div>
          ))}
        </div>
      </Bloco>

      <p style={{ paddingTop: 24, fontSize: 12, color: "var(--dim)" }}>
        Template <span style={{ fontFamily: "monospace" }}>.tema-expand</span> em <span style={{ fontFamily: "monospace" }}>globals.css</span> · mesmo motor de cores da plataforma, aplicado ao verde/dourado da Expand.
      </p>
    </>
  );
}
