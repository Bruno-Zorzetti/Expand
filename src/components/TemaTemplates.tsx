"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

type Preset = { nome: string; a: string; a2: string };
const PRESETS: Preset[] = [
  { nome: "Azul Hashes", a: "#2F80FF", a2: "#7A5CFF" },
  { nome: "Esmeralda", a: "#10B981", a2: "#06B6D4" },
  { nome: "Violeta", a: "#7A5CFF", a2: "#D946EF" },
  { nome: "Coral", a: "#FF7A59", a2: "#FFB25A" },
  { nome: "Rosa", a: "#FF5D8F", a2: "#A855F7" },
  { nome: "Lima", a: "#A3E635", a2: "#22D3EE" },
  { nome: "Âmbar", a: "#F59E0B", a2: "#EF4444" },
  { nome: "Grafite", a: "#64748B", a2: "#94A3B8" },
];

// superfícies fixas p/ os mini-previews (mostram os dois modos ao mesmo tempo)
const DARK = { bg: "#070A12", panel: "#131C30", txt: "#EAF0FA", mut: "#8B96AC" };
const LIGHT = { bg: "#EEF1F8", panel: "#FFFFFF", txt: "#0F1830", mut: "#55617A" };

function Mini({ s, a, a2, label }: { s: typeof DARK; a: string; a2: string; label: string }) {
  return (
    <div className="flex-1 rounded-lg p-2" style={{ background: s.bg }}>
      <p className="mb-1 text-[9px] font-bold uppercase" style={{ color: s.mut }}>{label}</p>
      <div className="rounded-md p-2" style={{ background: s.panel }}>
        <div className="h-1.5 w-8 rounded-full" style={{ background: `linear-gradient(90deg, ${a}, ${a2})` }} />
        <p className="mt-1.5 text-[10px] font-bold" style={{ color: s.txt }}>Aa título</p>
        <span className="mt-1.5 inline-block rounded px-2 py-0.5 text-[9px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${a}, ${a2})` }}>
          Botão
        </span>
      </div>
    </div>
  );
}

export default function TemaTemplates() {
  const supabase = createClient();
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [accent, setAccent] = useState(PRESETS[0].a);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    setMode((document.documentElement.getAttribute("data-theme") as "light" | "dark") || "dark");
    setAccent(localStorage.getItem("hx-accent") || PRESETS[0].a);
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar(next: Record<string, string>) {
    if (!uid) return;
    const { data: p } = await supabase.from("profiles").select("tema").eq("id", uid).single();
    await supabase.from("profiles").update({ tema: { ...((p?.tema as object) ?? {}), ...next } }).eq("id", uid);
  }
  function aplicarCor(pr: Preset) {
    document.documentElement.style.setProperty("--accent", pr.a);
    document.documentElement.style.setProperty("--accent-2", pr.a2);
    localStorage.setItem("hx-accent", pr.a);
    localStorage.setItem("hx-accent2", pr.a2);
    setAccent(pr.a);
    salvar({ accent: pr.a, accent2: pr.a2 });
  }
  function trocarModo(m: "light" | "dark") {
    document.documentElement.setAttribute("data-theme", m);
    localStorage.setItem("hx-theme", m);
    setMode(m);
    salvar({ modo: m });
  }
  function custom(a: string) {
    aplicarCor({ nome: "Custom", a, a2: a });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--mut)]">Ver e aplicar em:</span>
        <button onClick={() => trocarModo("dark")} className={`hx-btn px-3 py-1.5 text-sm ${mode === "dark" ? "hx-btn-primary" : "hx-btn-ghost"}`}>
          <Icon name="moon" size={14} /> Escuro
        </button>
        <button onClick={() => trocarModo("light")} className={`hx-btn px-3 py-1.5 text-sm ${mode === "light" ? "hx-btn-primary" : "hx-btn-ghost"}`}>
          <Icon name="sun" size={14} /> Claro
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PRESETS.map((pr) => {
          const on = pr.a.toLowerCase() === accent.toLowerCase();
          return (
            <div key={pr.nome} className="hx-glass p-3" style={on ? { borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)" } : undefined}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{pr.nome}</p>
                {on && <Icon name="check" size={15} className="text-[var(--green)]" />}
              </div>
              <div className="mt-2 flex gap-1.5">
                <Mini s={LIGHT} a={pr.a} a2={pr.a2} label="Claro" />
                <Mini s={DARK} a={pr.a} a2={pr.a2} label="Escuro" />
              </div>
              <button onClick={() => aplicarCor(pr)} className="hx-btn hx-btn-ghost mt-2 w-full justify-center py-1.5 text-xs">
                Aplicar
              </button>
            </div>
          );
        })}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-[var(--mut)]">
        <span className="h-5 w-5 rounded-full" style={{ background: `linear-gradient(135deg, ${accent}, ${accent})` }} />
        Cor personalizada
        <input type="color" value={accent} onChange={(e) => custom(e.target.value)} className="h-6 w-10 cursor-pointer bg-transparent" />
        {uid ? <span className="text-xs text-[var(--dim)]">salvo no seu perfil</span> : <span className="text-xs text-[var(--dim)]">salvo neste navegador</span>}
      </label>
    </div>
  );
}
