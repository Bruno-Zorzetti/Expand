"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────── */
type Profile = { id: string; email: string; role: string; fullName: string };
type Perfil = {
  id: string; nome: string | null; cargo: string | null; area: string | null;
  bio: string | null; foto_url: string | null; hero_url: string | null;
  ics_token: string | null; telefone: string | null; whatsapp: string | null;
  foto_prompt: string | null; hero_prompt: string | null; hero_prompt_cliente: string | null;
  folgas: string[] | null; cor: string | null;
} | null;
type Tarefa = {
  id: string; titulo: string; cliente_id: string; status: string;
  sla: string | null; data_prevista: string | null; area: string | null;
  concluida_em: string | null; iniciada_em: string | null; criado_em: string;
};
type ClienteInfo = { id: string; nome: string; status: string };
type Membro = { id: string; nome: string; cargo: string | null; tipo: string | null };

const STATUS_LABEL: Record<string, string> = {
  idle: "A fazer", run: "Em andamento", wait: "Em revisão", done: "Concluída", late: "Atrasada",
};
const STATUS_COR: Record<string, string> = {
  idle: "var(--dim)", run: "var(--accent)", wait: "var(--warn)", done: "var(--green)", late: "var(--red)",
};
const ROLE_LABEL: Record<string, string> = { admin: "Admin", equipe: "Equipe", cliente: "Cliente", pendente: "Pendente" };
const ROLE_COR: Record<string, string> = {
  admin: "var(--accent)", equipe: "var(--green)", cliente: "#86C0A6", pendente: "var(--warn)",
};

const TABS = [
  { id: "sobre",       label: "Sobre",        icon: "👤" },
  { id: "tarefas",     label: "Tarefas",       icon: "✅" },
  { id: "clientes",    label: "Clientes",      icon: "🏢" },
  { id: "graficos",    label: "Gráficos",      icon: "📊" },
  { id: "calendario",  label: "Calendário",    icon: "📅" },
  { id: "diagnosticos",label: "Diagnósticos",  icon: "🧠" },
  { id: "integracao",  label: "Integração",    icon: "⚙️"  },
] as const;
type TabId = typeof TABS[number]["id"];

/* ─── Helpers ────────────────────────────────────────── */
function ini(nome: string) { return nome.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); }
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function hoje() { return isoDate(new Date()); }
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }

/* ─── CSS bar chart ──────────────────────────────────── */
function BarChart({ data, color = "var(--accent)" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, width: "100%" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
            <div style={{
              width: "100%", height: `${Math.round((d.value / max) * 100)}%`, minHeight: d.value > 0 ? 4 : 0,
              background: color, borderRadius: "4px 4px 0 0",
              transition: "height .3s ease",
            }} title={`${d.value} tarefas`} />
          </div>
          <span style={{ fontSize: 9, color: "var(--dim)", textAlign: "center", lineHeight: 1.2 }}>{d.label}</span>
          {d.value > 0 && <span style={{ fontSize: 9, fontWeight: 700, color }}>{d.value}</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── Upload helper ──────────────────────────────────── */
async function uploadFile(file: File, tipo: "foto" | "hero"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("tipo", tipo);
  const r = await fetch("/api/perfil/upload", { method: "POST", body: fd });
  const j = await r.json();
  return j.url ?? "";
}

/* ─── PhotoField ─────────────────────────────────────── */
function PhotoField({
  label, value, onChange, tipo, prompt, placeholder,
}: {
  label: string; value: string; onChange: (url: string) => void;
  tipo: "foto" | "hero"; prompt: string; placeholder?: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genPrompt, setGenPrompt] = useState(prompt);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    const url = await uploadFile(f, tipo);
    setUploading(false);
    if (url) onChange(url);
    setShowModal(false);
  }

  async function handleGenerate() {
    if (!genPrompt.trim()) return;
    setGenerating(true);
    try {
      const r = await fetch("/api/perfil/gerar-foto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: genPrompt, tipo }),
      });
      const j = await r.json();
      if (j.url) { onChange(j.url); setShowModal(false); }
      else if (j.error) alert(j.error);
    } finally { setGenerating(false); }
  }

  return (
    <>
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 6 }}>{label}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          {tipo === "foto" ? (
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--panel-2)", border: "1px solid var(--line-2)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--dim)" }}>
              {value ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Sem foto"}
            </div>
          ) : (
            <div style={{ width: 160, height: 60, borderRadius: 10, background: "var(--panel-2)", border: "1px solid var(--line-2)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--dim)" }}>
              {value ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Sem imagem"}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? "https://..."} style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "6px 10px", fontSize: 12.5, outline: "none", fontFamily: "inherit", width: 240 }} />
            <button type="button" onClick={() => setShowModal(true)} style={{ background: "var(--panel-2)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              📷 Upload ou Gerar com IA
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line-2)", borderRadius: 16, width: "min(480px,90vw)", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--line-2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Atualizar {label.toLowerCase()}</span>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: "20px" }}>
              {/* Upload */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--dim)", marginBottom: 8 }}>Fazer upload</p>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: "100%", padding: "18px", borderRadius: 12, border: "2px dashed var(--line-2)", background: "var(--bg)", color: "var(--mut)", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
                  {uploading ? "Enviando…" : "📁 Clique para escolher uma imagem"}
                </button>
              </div>

              <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 18 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--dim)", marginBottom: 8 }}>Gerar com IA</p>
                <textarea
                  value={genPrompt}
                  onChange={e => setGenPrompt(e.target.value)}
                  placeholder="Descreva a imagem que deseja gerar… ex: foto profissional executivo, fundo neutro, iluminação natural"
                  rows={3}
                  style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 12.5, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5 }}
                />
                <p style={{ fontSize: 10.5, color: "var(--dim)", margin: "6px 0 12px", lineHeight: 1.5 }}>
                  {tipo === "foto"
                    ? "O prompt do seu perfil é preenchido automaticamente a partir da aba Integração. Edite aqui para esta geração."
                    : "Use a aba Integração para salvar o prompt padrão de hero background."}
                </p>
                <button type="button" onClick={handleGenerate} disabled={generating || !genPrompt.trim()} style={{ width: "100%", padding: "10px", borderRadius: 9, background: genPrompt.trim() ? "var(--accent)" : "var(--panel-2)", color: genPrompt.trim() ? "#fff" : "var(--dim)", border: "none", cursor: genPrompt.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
                  {generating ? "Gerando…" : "⚡ Gerar imagem com IA"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Main Component ─────────────────────────────────── */
export default function PerfilHub({
  profile, perfil, slug, tarefas, concluidas, clientesMap, membros,
  salvarPerfil, salvarPrompts, salvarFolgas,
}: {
  profile: Profile;
  perfil: Perfil;
  slug: string;
  tarefas: Tarefa[];
  concluidas: Array<{ id: string; concluida_em: string | null; criado_em: string; status: string }>;
  clientesMap: Record<string, ClienteInfo>;
  membros: Membro[];
  salvarPerfil: (fd: FormData) => Promise<void>;
  salvarPrompts: (fd: FormData) => Promise<void>;
  salvarFolgas: (folgas: string[]) => Promise<void>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("sobre");
  const [isPending, startTransition] = useTransition();

  // Sobre form state
  const [bio, setBio] = useState(perfil?.bio ?? "");
  const [fotoUrl, setFotoUrl] = useState(perfil?.foto_url ?? "");
  const [heroUrl, setHeroUrl] = useState(perfil?.hero_url ?? "");
  const [whatsapp, setWhatsapp] = useState(perfil?.whatsapp ?? perfil?.telefone ?? "");
  const [telefone, setTelefone] = useState(perfil?.telefone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Tarefas state
  const [tarefaFiltro, setTarefaFiltro] = useState<string>("ativas");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Calendário state
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [folgas, setFolgas] = useState<Set<string>>(new Set(perfil?.folgas ?? []));
  const [savingFolgas, setSavingFolgas] = useState(false);

  // Prompts state
  const [fotoPrompt, setFotoPrompt] = useState(perfil?.foto_prompt ?? "");
  const [heroPrompt, setHeroPrompt] = useState(perfil?.hero_prompt ?? "");
  const [heroPromptCliente, setHeroPromptCliente] = useState(perfil?.hero_prompt_cliente ?? "");
  const [savingPrompts, setSavingPrompts] = useState(false);

  const roleCor = ROLE_COR[profile.role] ?? "var(--dim)";
  const nome = perfil?.nome ?? profile.fullName ?? "Meu Perfil";

  /* ── Sobre: save ── */
  async function handleSalvar() {
    setSaving(true);
    const fd = new FormData();
    fd.set("bio", bio);
    fd.set("foto_url", fotoUrl);
    fd.set("hero_url", heroUrl);
    fd.set("whatsapp", whatsapp);
    fd.set("telefone", telefone || whatsapp);
    startTransition(() => {
      salvarPerfil(fd).then(() => {
        setSaved(true); setSaving(false);
        setTimeout(() => setSaved(false), 2000);
      });
    });
  }

  /* ── Prompts: save ── */
  async function handleSalvarPrompts() {
    setSavingPrompts(true);
    const fd = new FormData();
    fd.set("foto_prompt", fotoPrompt);
    fd.set("hero_prompt", heroPrompt);
    fd.set("hero_prompt_cliente", heroPromptCliente);
    startTransition(() => {
      salvarPrompts(fd).then(() => {
        setSavingPrompts(false);
      });
    });
  }

  /* ── Calendário: toggle folga ── */
  function toggleFolga(dateStr: string) {
    setFolgas(prev => {
      const n = new Set(prev);
      if (n.has(dateStr)) n.delete(dateStr); else n.add(dateStr);
      return n;
    });
  }
  async function handleSalvarFolgas() {
    setSavingFolgas(true);
    await salvarFolgas([...folgas]);
    setSavingFolgas(false);
  }

  /* ── Gráficos: compute ── */
  const hojeISO = hoje();
  // Últimos 7 dias
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return isoDate(d);
  });
  const byDay = Object.fromEntries(last7.map(d => [d, 0]));
  concluidas.forEach(t => { const d = (t.concluida_em ?? t.criado_em).slice(0, 10); if (d in byDay) byDay[d]++; });
  const chartDia = last7.map(d => ({ label: fmtDate(d), value: byDay[d] }));

  // Últimas 4 semanas
  const last4w = Array.from({ length: 4 }, (_, i) => {
    const end = new Date(); end.setDate(end.getDate() - i * 7);
    const start = new Date(end); start.setDate(end.getDate() - 6);
    return { label: `S${4 - i}`, start: isoDate(start), end: isoDate(end) };
  }).reverse();
  const chartSemana = last4w.map(w => ({
    label: w.label,
    value: concluidas.filter(t => {
      const d = (t.concluida_em ?? t.criado_em).slice(0, 10);
      return d >= w.start && d <= w.end;
    }).length,
  }));

  // Últimos 6 meses
  const last6m = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return { label: d.toLocaleDateString("pt-BR", { month: "short" }), year: d.getFullYear(), month: d.getMonth() };
  });
  const chartMes = last6m.map(m => ({
    label: m.label,
    value: concluidas.filter(t => {
      const d = new Date(t.concluida_em ?? t.criado_em);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length,
  }));

  // Distribuição de status
  const ativas = tarefas.filter(t => t.status !== "done");
  const statusDist = ["run", "idle", "wait"].map(s => ({
    label: STATUS_LABEL[s], cor: STATUS_COR[s],
    count: ativas.filter(t => t.status === s).length,
  }));

  /* ── Tarefas filtradas ── */
  const tarefasFiltradas = tarefas.filter(t => {
    if (tarefaFiltro === "ativas") return ["idle", "run", "wait"].includes(t.status);
    if (tarefaFiltro === "concluidas") return t.status === "done";
    return true;
  });

  /* ── Clientes com contagens ── */
  const clienteIds = [...new Set(tarefas.map(t => t.cliente_id).filter(Boolean))];
  const clientesComContagem = clienteIds.map(id => {
    const c = clientesMap[id];
    const tarefasCliente = tarefas.filter(t => t.cliente_id === id);
    const ativas = tarefasCliente.filter(t => t.status !== "done").length;
    const concluidas = tarefasCliente.filter(t => t.status === "done").length;
    return { id, nome: c?.nome ?? id, status: c?.status ?? "", ativas, concluidas, total: tarefasCliente.length };
  });

  /* ── Calendário: build month grid ── */
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const calDays: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < firstDay; i++) calDays.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calDays.push({ date, day: d });
  }
  const mesNome = new Date(calYear, calMonth, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  /* ── Chat DM ── */
  function iniciarChat() {
    router.push("/expand/chat");
  }

  const fld: React.CSSProperties = {
    background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
    color: "var(--txt)", padding: "7px 10px", fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%",
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <p className="hx-eyebrow">Meu Perfil</p>

      {/* ── Hero + Avatar ── */}
      <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 28, position: "relative", background: "var(--panel)" }}>
        {/* Hero background */}
        <div style={{ height: 160, background: heroUrl ? `url(${heroUrl}) center/cover no-repeat` : `linear-gradient(135deg, var(--accent), color-mix(in srgb,var(--accent) 40%,transparent))`, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.18)" }} />
        </div>
        {/* Avatar + info */}
        <div style={{ padding: "0 24px 20px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -36 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: `color-mix(in srgb,${roleCor} 18%,var(--panel))`, border: `3px solid var(--panel)`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,.3)" }}>
              {fotoUrl
                ? <img src={fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontWeight: 800, fontSize: 28, color: roleCor }}>{ini(nome)}</span>}
            </div>
            <div style={{ flex: 1, paddingTop: 40, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--txt)" }}>{nome}</h1>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `color-mix(in srgb,${roleCor} 15%,transparent)`, color: roleCor }}>{ROLE_LABEL[profile.role] ?? profile.role}</span>
              </div>
              {perfil?.cargo && <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--dim)" }}>{perfil.cargo}{perfil.area ? ` · ${perfil.area}` : ""}</p>}
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--mut)" }}>{profile.email}</p>
            </div>
            <button onClick={iniciarChat} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 9, background: "var(--accent)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-end", marginBottom: 2 }}>
              💬 Iniciar Chat
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--line)", marginBottom: 28, overflowX: "auto", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "9px 16px", fontSize: 12.5, fontWeight: tab === t.id ? 700 : 400,
            color: tab === t.id ? "var(--accent)" : "var(--dim)",
            background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "var(--accent)" : "transparent"}`,
            cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", marginBottom: -1,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════ TAB: SOBRE ══════════════════════════════ */}
      {tab === "sobre" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {!slug && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "color-mix(in srgb,var(--warn) 12%,transparent)", border: "1px solid var(--warn)", fontSize: 13, color: "var(--warn)" }}>
              Perfil não vinculado a um membro da equipe. Solicite ao admin em Acessos.
            </div>
          )}

          {/* Fotos */}
          <div style={{ padding: "20px", borderRadius: 14, background: "var(--panel)", border: "1px solid var(--line)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--dim)", marginBottom: 16 }}>Fotos</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <PhotoField label="Foto de perfil" value={fotoUrl} onChange={setFotoUrl} tipo="foto" prompt={perfil?.foto_prompt ?? ""} />
              <PhotoField label="Foto de fundo (hero)" value={heroUrl} onChange={setHeroUrl} tipo="hero" prompt={perfil?.hero_prompt ?? ""} />
            </div>
          </div>

          {/* Info pessoal */}
          <div style={{ padding: "20px", borderRadius: 14, background: "var(--panel)", border: "1px solid var(--line)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--dim)", marginBottom: 16 }}>Informações</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 4 }}>Bio</div>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Sobre você, especialidades, experiência…" rows={3} style={{ ...fld, resize: "vertical", lineHeight: 1.6 }} />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 4 }}>WhatsApp</div>
                  <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+5511999999999" type="tel" style={fld} />
                </label>
                <label>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 4 }}>Telefone</div>
                  <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="+5511999999999" type="tel" style={fld} />
                </label>
              </div>
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "var(--green)", textDecoration: "none", fontWeight: 600 }}>
                  → Abrir no WhatsApp
                </a>
              )}
            </div>
          </div>

          <button onClick={handleSalvar} disabled={saving || isPending} className="hx-btn hx-btn-primary" style={{ alignSelf: "flex-start", padding: "9px 22px" }}>
            {saved ? "✓ Salvo!" : saving || isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      )}

      {/* ══════════════════════════════ TAB: TAREFAS ══════════════════════════════ */}
      {tab === "tarefas" && (
        <div>
          {/* Filtros */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            {[["ativas", "Ativas"], ["concluidas", "Concluídas"], ["todas", "Todas"]].map(([v, l]) => (
              <button key={v} onClick={() => setTarefaFiltro(v)} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                background: tarefaFiltro === v ? "var(--accent)" : "var(--panel-2)",
                color: tarefaFiltro === v ? "#fff" : "var(--dim)", border: "none", fontFamily: "inherit",
              }}>{l} {v === "ativas" ? `(${tarefas.filter(t => t.status !== "done").length})` : v === "concluidas" ? `(${tarefas.filter(t => t.status === "done").length})` : `(${tarefas.length})`}</button>
            ))}
          </div>

          {tarefasFiltradas.length === 0
            ? <p style={{ fontSize: 13, color: "var(--mut)", fontStyle: "italic" }}>Nenhuma tarefa neste filtro.</p>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tarefasFiltradas.map(t => {
                  const cor = STATUS_COR[t.status] ?? "var(--dim)";
                  const isExpanded = expandedTask === t.id;
                  const nomeCliente = clientesMap[t.cliente_id]?.nome ?? t.cliente_id;
                  return (
                    <div key={t.id} style={{ borderRadius: 10, background: "var(--panel)", border: "1px solid var(--line)", borderLeft: `3px solid ${cor}`, overflow: "hidden" }}>
                      {/* Header clicável */}
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer" }}
                        onClick={() => setExpandedTask(isExpanded ? null : t.id)}
                      >
                        <span style={{ fontSize: 11, color: cor, fontWeight: 700, flexShrink: 0 }}>{STATUS_LABEL[t.status] ?? t.status}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.titulo}</span>
                        <span style={{ fontSize: 11, color: "var(--dim)", flexShrink: 0 }}>{nomeCliente}</span>
                        <span style={{ fontSize: 13, color: "var(--dim)", flexShrink: 0, transition: "transform .15s", transform: isExpanded ? "rotate(180deg)" : "none" }}>⌄</span>
                      </div>
                      {/* Detalhe expandido */}
                      {isExpanded && (
                        <div style={{ padding: "0 14px 12px", borderTop: "1px solid var(--line-2)" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10, marginBottom: 12 }}>
                            {t.area && <span style={{ fontSize: 11, color: "var(--dim)" }}>Área: <b style={{ color: "var(--txt)" }}>{t.area}</b></span>}
                            {t.sla  && <span style={{ fontSize: 11, color: "var(--dim)" }}>SLA: <b style={{ color: "var(--txt)" }}>{t.sla}</b></span>}
                            {t.data_prevista && <span style={{ fontSize: 11, color: "var(--dim)" }}>Prevista: <b style={{ color: "var(--txt)" }}>{fmtDate(t.data_prevista)}</b></span>}
                            {t.iniciada_em && <span style={{ fontSize: 11, color: "var(--dim)" }}>Iniciada: <b style={{ color: "var(--txt)" }}>{fmtDate(t.iniciada_em)}</b></span>}
                            {t.concluida_em && <span style={{ fontSize: 11, color: "var(--green)" }}>Concluída: <b>{fmtDate(t.concluida_em)}</b></span>}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Link href={`/expand/etapa/${t.id}`} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7, background: "var(--accent)", color: "#fff", textDecoration: "none", fontWeight: 600 }}>
                              Abrir tarefa →
                            </Link>
                            <Link href={`/expand/clientes/${t.cliente_id}`} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7, background: "var(--panel-2)", border: "1px solid var(--line-2)", color: "var(--txt)", textDecoration: "none" }}>
                              Cliente
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          }
          <Link href="/expand/v2" style={{ display: "inline-block", marginTop: 14, fontSize: 12.5, color: "var(--accent)", textDecoration: "none" }}>Ver no Meu Dia →</Link>
        </div>
      )}

      {/* ══════════════════════════════ TAB: CLIENTES ══════════════════════════════ */}
      {tab === "clientes" && (
        <div>
          {clientesComContagem.length === 0
            ? <p style={{ fontSize: 13, color: "var(--mut)", fontStyle: "italic" }}>Nenhum cliente com tarefas registradas.</p>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {clientesComContagem.sort((a, b) => b.ativas - a.ativas).map(c => (
                  <div key={c.id} style={{ padding: "14px 18px", borderRadius: 12, background: "var(--panel)", border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", marginBottom: 4 }}>{c.nome}</div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11.5, color: "var(--accent)" }}>{c.ativas} ativas</span>
                        <span style={{ fontSize: 11.5, color: "var(--green)" }}>{c.concluidas} concluídas</span>
                        <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{c.total} total</span>
                      </div>
                    </div>
                    {/* Mini progress */}
                    <div style={{ width: 80, flexShrink: 0 }}>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--line-2)", overflow: "hidden" }}>
                        <div style={{ width: `${c.total ? Math.round(c.concluidas / c.total * 100) : 0}%`, height: "100%", background: "var(--green)", borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--dim)", textAlign: "right", marginTop: 3 }}>{c.total ? Math.round(c.concluidas / c.total * 100) : 0}%</div>
                    </div>
                    <Link href={`/expand/clientes/${c.id}`} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, background: "var(--panel-2)", border: "1px solid var(--line-2)", color: "var(--accent)", textDecoration: "none", fontWeight: 600, flexShrink: 0 }}>
                      Ver dossiê →
                    </Link>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ══════════════════════════════ TAB: GRÁFICOS ══════════════════════════════ */}
      {tab === "graficos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {[
              { label: "Hoje", value: byDay[hojeISO] ?? 0, cor: "var(--accent)" },
              { label: "Últimos 7 dias", value: chartDia.reduce((a, d) => a + d.value, 0), cor: "var(--green)" },
              { label: "Ativas", value: ativas.length, cor: "var(--warn)" },
              { label: "Clientes ativos", value: clientesComContagem.filter(c => c.ativas > 0).length, cor: "var(--dim)" },
            ].map(k => (
              <div key={k.label} style={{ padding: "16px 18px", borderRadius: 12, background: "var(--panel)", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: k.cor }}>{k.value}</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={{ padding: "18px 20px", borderRadius: 14, background: "var(--panel)", border: "1px solid var(--line)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--dim)", marginBottom: 14 }}>Últimos 7 dias</p>
              <BarChart data={chartDia} color="var(--accent)" />
            </div>
            <div style={{ padding: "18px 20px", borderRadius: 14, background: "var(--panel)", border: "1px solid var(--line)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--dim)", marginBottom: 14 }}>Por semana (4 sem.)</p>
              <BarChart data={chartSemana} color="var(--green)" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div style={{ padding: "18px 20px", borderRadius: 14, background: "var(--panel)", border: "1px solid var(--line)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--dim)", marginBottom: 14 }}>Por mês (6 meses)</p>
              <BarChart data={chartMes} color="var(--accent)" />
            </div>
            <div style={{ padding: "18px 20px", borderRadius: 14, background: "var(--panel)", border: "1px solid var(--line)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--dim)", marginBottom: 14 }}>Status das ativas</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {statusDist.map(s => (
                  <div key={s.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: s.cor, fontWeight: 600 }}>{s.label}</span>
                      <span style={{ color: "var(--dim)" }}>{s.count}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "var(--line-2)", overflow: "hidden" }}>
                      <div style={{ width: `${ativas.length ? Math.round(s.count / ativas.length * 100) : 0}%`, height: "100%", background: s.cor, borderRadius: 4, transition: "width .3s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════ TAB: CALENDÁRIO ══════════════════════════════ */}
      {tab === "calendario" && (
        <div>
          <div style={{ padding: "20px", borderRadius: 14, background: "var(--panel)", border: "1px solid var(--line)" }}>
            {/* Nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <button onClick={() => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); }} style={{ background: "var(--panel-2)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", color: "var(--txt)", fontFamily: "inherit" }}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", textTransform: "capitalize" }}>{mesNome}</span>
              <button onClick={() => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); }} style={{ background: "var(--panel-2)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", color: "var(--txt)", fontFamily: "inherit" }}>›</button>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--dim)" }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "color-mix(in srgb,var(--green) 20%,transparent)", border: "1px solid var(--green)" }} /> Disponível
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--dim)" }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "color-mix(in srgb,var(--red) 20%,transparent)", border: "1px solid var(--red)" }} /> Folga/indisponível
              </div>
            </div>

            {/* Weekday headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 4 }}>
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--dim)", padding: "4px 0" }}>{d}</div>
              ))}
            </div>

            {/* Days */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
              {calDays.map((d, i) => {
                if (!d.date) return <div key={`empty-${i}`} />;
                const isFolga = folgas.has(d.date);
                const isHoje = d.date === hojeISO;
                return (
                  <button
                    key={d.date}
                    onClick={() => toggleFolga(d.date!)}
                    title={isFolga ? "Marcar como disponível" : "Marcar como folga"}
                    style={{
                      padding: "8px 4px", borderRadius: 8, border: isHoje ? "2px solid var(--accent)" : "1px solid transparent",
                      background: isFolga ? "color-mix(in srgb,var(--red) 20%,transparent)" : "var(--panel-2)",
                      color: isFolga ? "var(--red)" : isHoje ? "var(--accent)" : "var(--txt)",
                      cursor: "pointer", fontSize: 12.5, fontWeight: isHoje ? 800 : 400, fontFamily: "inherit", textAlign: "center",
                    }}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center" }}>
              <button onClick={handleSalvarFolgas} disabled={savingFolgas} className="hx-btn hx-btn-primary" style={{ padding: "7px 18px", fontSize: 12.5 }}>
                {savingFolgas ? "Salvando…" : "Salvar disponibilidade"}
              </button>
              <span style={{ fontSize: 12, color: "var(--dim)" }}>{folgas.size} dia(s) marcado(s) como folga</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════ TAB: DIAGNÓSTICOS ══════════════════════════════ */}
      {tab === "diagnosticos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6 }}>
            Complete seus diagnósticos de perfil comportamental. Eles ajudam a equipe e os agentes de IA a entender como trabalhar melhor com você.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {[
              { label: "DISC", desc: "Perfil comportamental — como você age, comunica e decide", href: `/expand/equipe/${slug}/diagnostico/disc`, icon: "🧩" },
              { label: "Arquétipo", desc: "Seu arquétipo de marca e personalidade no ambiente profissional", href: `/expand/equipe/${slug}/diagnostico/arquetipo`, icon: "🔮" },
              { label: "Temperamento", desc: "Colérico, sanguíneo, melancólico ou fleumático — como você reage", href: `/expand/equipe/${slug}/diagnostico/temperamento`, icon: "🌡️" },
              { label: "Comportamental", desc: "Análise de valores, motivadores e perfil energético", href: `/expand/equipe/${slug}/comportamental`, icon: "⚡" },
            ].map(d => (
              <Link key={d.label} href={slug ? d.href : "/expand/perfil"} style={{ padding: "18px 20px", borderRadius: 14, background: "var(--panel)", border: "1px solid var(--line)", textDecoration: "none", display: "block" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{d.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", marginBottom: 5 }}>{d.label}</div>
                <div style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.5 }}>{d.desc}</div>
                {slug && <div style={{ marginTop: 12, fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>Fazer diagnóstico →</div>}
              </Link>
            ))}
          </div>
          {!slug && (
            <p style={{ fontSize: 12.5, color: "var(--warn)" }}>Perfil não vinculado — os links de diagnóstico ficam ativos após o vínculo.</p>
          )}
        </div>
      )}

      {/* ══════════════════════════════ TAB: INTEGRAÇÃO ══════════════════════════════ */}
      {tab === "integracao" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <p style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6 }}>
            Configure os prompts padrão para geração de imagens com IA. Eles são usados quando você clica em "Gerar com IA" nas fotos de perfil e hero.
          </p>

          <div style={{ padding: "20px", borderRadius: 14, background: "var(--panel)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--accent)", letterSpacing: ".06em", marginBottom: 6 }}>Foto de perfil — colaborador</div>
              <p style={{ fontSize: 12, color: "var(--dim)", marginBottom: 8, lineHeight: 1.5 }}>
                Prompt para tornar a foto de perfil mais profissional. Use {"{{nome}}"} para incluir o nome da pessoa. O sistema vai manter as características físicas e apenas ajustar iluminação, enquadramento e qualidade.
              </p>
              <textarea
                value={fotoPrompt}
                onChange={e => setFotoPrompt(e.target.value)}
                placeholder="ex: Professional headshot, business attire, neutral background, studio lighting, high quality, corporate look. Person: {{nome}}"
                rows={4}
                style={{ ...fld, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--accent)", letterSpacing: ".06em", marginBottom: 6 }}>Hero background — perfil do colaborador</div>
              <p style={{ fontSize: 12, color: "var(--dim)", marginBottom: 8, lineHeight: 1.5 }}>
                Prompt para gerar a imagem de fundo da hero section no perfil de cada membro da equipe.
              </p>
              <textarea
                value={heroPrompt}
                onChange={e => setHeroPrompt(e.target.value)}
                placeholder="ex: Abstract professional background, dark green and gold gradient, soft geometric patterns, high resolution, modern corporate design"
                rows={4}
                style={{ ...fld, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--dim)", letterSpacing: ".06em", marginBottom: 6 }}>Hero background — perfil do cliente</div>
              <p style={{ fontSize: 12, color: "var(--dim)", marginBottom: 8, lineHeight: 1.5 }}>
                Prompt para gerar a imagem de fundo da hero section nos dossiês de clientes. Use {"{{cliente}}"} para incluir o nome da empresa.
              </p>
              <textarea
                value={heroPromptCliente}
                onChange={e => setHeroPromptCliente(e.target.value)}
                placeholder="ex: Professional business background for {{cliente}}, corporate colors, subtle brand elements, modern and clean design"
                rows={4}
                style={{ ...fld, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>

            <div style={{ padding: "12px 16px", borderRadius: 10, background: "color-mix(in srgb,var(--dim) 8%,transparent)", border: "1px solid var(--line-2)" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--txt)", marginBottom: 4 }}>APIs de geração de imagem suportadas</p>
              <p style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.6, margin: 0 }}>
                Configure <code>REPLICATE_API_TOKEN</code> no seu <code>.env.local</code> para habilitar a geração via Stable Diffusion (Replicate).
                Também aceita <code>OPENAI_API_KEY</code> para DALL-E 3. A rota detecta automaticamente qual está disponível.
              </p>
            </div>

            <button onClick={handleSalvarPrompts} disabled={savingPrompts} className="hx-btn hx-btn-primary" style={{ alignSelf: "flex-start", padding: "8px 20px" }}>
              {savingPrompts ? "Salvando…" : "Salvar prompts"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Re-export PhotoField for external use */
export { PhotoField };
