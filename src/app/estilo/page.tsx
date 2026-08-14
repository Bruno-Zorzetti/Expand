import Link from "next/link";
import Icon from "@/components/Icon";
import ThemeControls from "@/components/ThemeControls";
import TemaTemplates from "@/components/TemaTemplates";

const ICON_COR = ["#2F80FF", "#7A5CFF", "#31D0AA", "#FF7A59", "#FFC24B", "#FF5D8F", "#22D3EE", "#A3E635", "#F59E0B", "#5AA0FF"];

const CORES = {
  Superfícies: [
    { n: "bg", v: "#070A12" },
    { n: "panel", v: "#0F1626" },
    { n: "panel-2", v: "#131C30" },
    { n: "line", v: "#1E2740" },
    { n: "line-2", v: "#28324C" },
  ],
  Texto: [
    { n: "txt", v: "#EAF0FA" },
    { n: "mut", v: "#8B96AC" },
    { n: "dim", v: "#63708C" },
  ],
  "Acento (troca por cliente)": [
    { n: "accent", v: "#2F80FF" },
    { n: "accent-2", v: "#7A5CFF" },
  ],
  Status: [
    { n: "green", v: "#31D0AA" },
    { n: "warn", v: "#FFC24B" },
    { n: "red", v: "#FF6B6B" },
    { n: "teal", v: "#2FD3AE" },
  ],
};

const ICONES = [
  "user", "users", "cpu", "pin", "target", "play", "chart", "share", "pen",
  "bolt", "code", "compass", "sun", "moon", "check", "checkCircle", "alert",
  "star", "arrowRight", "briefcase",
];
const GLOW = [
  { i: "target", c: "#7A5CFF" },
  { i: "compass", c: "#2F80FF" },
  { i: "bolt", c: "#31D0AA" },
  { i: "play", c: "#FF7A59" },
  { i: "star", c: "#FFC24B" },
  { i: "share", c: "#FF5D8F" },
];

function Donut({ pct, label, sub, warm }: { pct: number; label: string; sub: string; warm?: boolean }) {
  const size = 140, sw = 12, r = size / 2 - sw, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  const gid = warm ? "gw" : "gc";
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-32 w-32">
      <defs>
        <linearGradient id="gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="var(--accent-2)" /></linearGradient>
        <linearGradient id="gw" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFB25A" /><stop offset="100%" stopColor="#FF7A59" /></linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ filter: "drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 45%, transparent))" }} />
      <text x="50%" y="47%" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--txt)">{label}</text>
      <text x="50%" y="62%" textAnchor="middle" fontSize="9" fill="var(--dim)">{sub}</text>
    </svg>
  );
}

function LineGlow() {
  const pts = [8, 20, 14, 34, 26, 46, 38, 58, 50, 44, 62], W = 320, H = 80, step = W / (pts.length - 1);
  const y = (v: number) => H - 8 - (v / 66) * (H - 20);
  const d = pts.map((v, i) => `${i ? "L" : "M"} ${i * step} ${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs><linearGradient id="lf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill="url(#lf)" />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 5px color-mix(in srgb, var(--accent) 60%, transparent))" }} />
    </svg>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] py-10">
      <p className="hx-eyebrow mb-5">{titulo}</p>
      {children}
    </section>
  );
}

export default function EstiloPage() {
  return (
    <main className="hx-ambient min-h-screen text-[var(--txt)]">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="font-extrabold tracking-wide">EXPAND</span>
          <div className="flex items-center gap-3">
            <ThemeControls variant="toggle" />
            <Link href="/" className="text-sm text-[var(--mut)] hover:text-[var(--txt)]">Início</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-16">
        {/* Capa */}
        <div className="py-14">
          <p className="hx-eyebrow">Brand guideline · Design System</p>
          <h1 className="mt-3 text-6xl font-black leading-[0.95] tracking-tight sm:text-8xl">
            Style<br /><span className="hx-accent-text">Guide</span>
          </h1>
          <p className="mt-5 max-w-xl text-[var(--mut)]">
            O sistema visual da Hashes: dark premium, cards de vidro, acento em gradiente e brilho.
            Sofisticado e amigável — e adaptável à cor de cada cliente.
          </p>
        </div>

        {/* Templates de cores */}
        <Bloco titulo="Templates de cores (pré-configurados)">
          <p className="mb-4 text-sm text-[var(--mut)]">
            Escolha um template e veja como fica no claro e no escuro. Aplica na hora e salva no seu perfil —
            é o que o cliente usa pra personalizar a área dele.
          </p>
          <TemaTemplates />
        </Bloco>

        {/* Cores */}
        <Bloco titulo="Paleta de cores">
          <div className="space-y-6">
            {Object.entries(CORES).map(([grupo, cores]) => (
              <div key={grupo}>
                <p className="mb-2 text-sm font-semibold text-[var(--mut)]">{grupo}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {cores.map((c) => (
                    <div key={c.n} className="hx-glass p-3">
                      <div className="h-14 w-full rounded-lg" style={{ background: c.v }} />
                      <p className="mt-2 text-xs font-semibold">{c.n}</p>
                      <p className="font-mono text-[10px] text-[var(--dim)]">{c.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Bloco>

        {/* Tipografia */}
        <Bloco titulo="Tipografia">
          <div className="hx-glass space-y-3 p-6">
            <p className="hx-eyebrow">Eyebrow · mono uppercase</p>
            <p className="text-5xl font-black tracking-tight">H1 · Título display</p>
            <p className="text-3xl font-extrabold">H2 · Seção</p>
            <p className="text-xl font-bold">H3 · Subtítulo</p>
            <p className="text-[var(--txt)]">Corpo — legível, com respiro e boa hierarquia.</p>
            <p className="text-sm text-[var(--mut)]">Secundário — apoio.</p>
            <p className="text-xs text-[var(--dim)]">Terciário — legendas e metadados.</p>
          </div>
        </Bloco>

        {/* Botões */}
        <Bloco titulo="Botões & tags">
          <div className="hx-glass flex flex-wrap items-center gap-3 p-6">
            <button className="hx-btn hx-btn-primary">Ação primária</button>
            <button className="hx-btn hx-btn-ghost">Secundária</button>
            <button className="hx-btn hx-warm text-[#2b1405]"><Icon name="play" size={14} /> Aquecida</button>
            <span className="rounded-md bg-[#31D0AA]/15 px-2 py-1 text-xs font-bold text-[#31D0AA]">+12 pts</span>
            <span className="rounded-md bg-[#5AA0FF]/15 px-2 py-1 text-xs font-bold text-[#5AA0FF]">Google</span>
            <span className="rounded-md bg-[#8B96AC]/15 px-2 py-1 text-xs font-bold text-[#8B96AC]">Mercado</span>
          </div>
        </Bloco>

        {/* Ícones */}
        <Bloco titulo="Ícones">
          <p className="mb-3 text-sm text-[var(--mut)]">Coloridos (cada ícone com sua cor + brilho) — melhora o reconhecimento rápido:</p>
          <div className="hx-glass grid grid-cols-5 gap-4 p-6 sm:grid-cols-10">
            {ICONES.map((n, i) => (
              <div key={n} className="flex flex-col items-center gap-1">
                <Icon name={n} size={24} className="hx-icon-glow" style={{ color: ICON_COR[i % ICON_COR.length] }} />
                <span className="text-[9px] text-[var(--dim)]">{n}</span>
              </div>
            ))}
          </div>
          <p className="mb-3 mt-6 text-sm text-[var(--mut)]">Glow (tile em gradiente com brilho) — para destaques e agentes:</p>
          <div className="hx-glass flex flex-wrap gap-4 p-6">
            {GLOW.map((g) => (
              <span key={g.i} className="hx-icon-tile h-14 w-14" style={{ ["--accent" as string]: g.c, ["--accent-2" as string]: g.c }}>
                <Icon name={g.i} size={26} className="hx-icon-glow" />
              </span>
            ))}
          </div>
        </Bloco>

        {/* Componentes */}
        <Bloco titulo="Componentes">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="hx-glass hx-glass-hover flex flex-col items-center p-6">
              <p className="mb-2 self-start text-sm font-semibold">Progresso</p>
              <Donut pct={78} label="78%" sub="ótimo" />
            </div>
            <div className="hx-glass p-6 md:col-span-2">
              <p className="mb-2 text-sm font-semibold">Gráfico com glow</p>
              <LineGlow />
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                {[["128", "Riscos"], ["64", "Achados"], ["42", "Ações"]].map(([v, l]) => (
                  <div key={l}><p className="text-2xl font-extrabold">{v}</p><p className="text-xs text-[var(--mut)]">{l}</p></div>
                ))}
              </div>
            </div>
            <div className="hx-glass p-6">
              <p className="mb-3 text-sm font-semibold">Campos & chips</p>
              <input placeholder="Input de texto" className="w-full rounded-lg border border-[var(--line-2)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="hx-accent rounded-full px-3 py-1 text-xs font-bold text-white">Selecionado</span>
                <span className="rounded-full border border-[var(--line-2)] px-3 py-1 text-xs">Opção</span>
                <span className="rounded-full border border-[var(--line-2)] px-3 py-1 text-xs">Opção</span>
              </div>
            </div>
            <div className="hx-glass p-6 md:col-span-2">
              <p className="mb-3 text-sm font-semibold">Lista de tarefas</p>
              <ul className="space-y-2 text-sm">
                {[["Pesquisa", "#31D0AA"], ["Design", "#31D0AA"], ["Protótipo", "#FFC24B"], ["Testes", "#8B96AC"]].map(([t, c]) => (
                  <li key={t} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{t}</span>
                    <Icon name="check" size={14} style={{ color: c }} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Bloco>

        {/* Entregáveis */}
        <Bloco titulo="Entregáveis (formatos que o cliente configura)">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Thumbnail */}
            <div className="hx-glass overflow-hidden p-0">
              <div className="relative flex aspect-video items-center justify-center" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
                <span className="text-lg font-black text-white">TÍTULO IMPACTANTE</span>
                <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white"><Icon name="play" size={16} /></span>
              </div>
              <p className="p-3 text-sm font-semibold">Thumbnail / capa YouTube</p>
            </div>
            {/* Capa de ebook */}
            <div className="hx-glass p-4">
              <div className="mx-auto flex aspect-[3/4] w-28 flex-col justify-between rounded-lg p-3" style={{ background: "linear-gradient(160deg, var(--panel-2), var(--bg))", border: "1px solid var(--line)" }}>
                <span className="hx-eyebrow">Ebook</span>
                <span className="text-sm font-black leading-tight">Autoridade em 7 passos</span>
                <span className="h-1 w-10 rounded-full hx-accent" />
              </div>
              <p className="mt-3 text-center text-sm font-semibold">Capa de ebook / livro</p>
            </div>
            {/* Planilha */}
            <div className="hx-glass p-4">
              <div className="overflow-hidden rounded-lg border border-[var(--line)]">
                {["Nome · Telefone · E-mail", "Cliente A · (65)9… · a@…", "Cliente B · (65)9… · b@…", "Cliente C · (65)9… · c@…"].map((r, i) => (
                  <div key={i} className={`px-2 py-1.5 text-[11px] ${i === 0 ? "hx-accent font-bold text-white" : "text-[var(--mut)]"}`} style={i !== 0 ? { background: i % 2 ? "var(--panel-2)" : "var(--panel)" } : undefined}>{r}</div>
                ))}
              </div>
              <p className="mt-3 text-sm font-semibold">Planilha de leads (CSV)</p>
            </div>
            {/* PDF / relatório */}
            <div className="hx-glass p-4">
              <div className="rounded-lg bg-white p-3 text-slate-800">
                <p className="text-[10px] font-black">EXPAND · Relatório</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: "#2F80FF" }}>52</span>
                  <div className="flex-1"><div className="h-1 w-full rounded bg-slate-200" /><div className="mt-1 h-1 w-2/3 rounded bg-slate-200" /></div>
                </div>
                <div className="mt-2 space-y-1"><div className="h-1 w-full rounded bg-slate-100" /><div className="h-1 w-5/6 rounded bg-slate-100" /></div>
              </div>
              <p className="mt-3 text-sm font-semibold">PDF / relatório comercial</p>
            </div>
            {/* Post GMN */}
            <div className="hx-glass p-4">
              <div className="overflow-hidden rounded-lg bg-white text-slate-800">
                <div className="flex h-16 items-center justify-center text-white" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}><Icon name="pin" size={20} /></div>
                <div className="p-2"><p className="text-[11px] font-bold">Sua empresa</p><p className="text-[10px] text-slate-500">Novidade da semana…</p></div>
              </div>
              <p className="mt-3 text-sm font-semibold">Post do Google (GMN)</p>
            </div>
            {/* Config */}
            <div className="hx-glass flex flex-col justify-center p-4 text-center">
              <Icon name="checkCircle" size={26} className="mx-auto text-[var(--accent)]" />
              <p className="mt-2 text-sm font-semibold">O cliente escolhe como recebe</p>
              <p className="mt-1 text-xs text-[var(--mut)]">Formato, dimensões e entrega — na área dele.</p>
            </div>
          </div>
        </Bloco>

        <p className="pt-6 text-xs text-[var(--dim)]">
          Tokens e utilitários em <span className="font-mono">globals.css</span> · Ícones em{" "}
          <span className="font-mono">components/Icon.tsx</span> · Este guideline segue o tema e a cor de acento ativos.
        </p>
      </div>
    </main>
  );
}
