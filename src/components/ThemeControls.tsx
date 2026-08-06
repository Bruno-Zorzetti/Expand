"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";

const PRESETS: { nome: string; a: string; a2: string }[] = [
  { nome: "Azul Hashes", a: "#2F80FF", a2: "#7A5CFF" },
  { nome: "Esmeralda", a: "#10B981", a2: "#06B6D4" },
  { nome: "Violeta", a: "#7A5CFF", a2: "#D946EF" },
  { nome: "Coral", a: "#FF7A59", a2: "#FFB25A" },
  { nome: "Rosa", a: "#FF5D8F", a2: "#A855F7" },
  { nome: "Grafite", a: "#64748B", a2: "#94A3B8" },
];

function apply(mode?: "light" | "dark", a?: string, a2?: string) {
  const el = document.documentElement;
  if (mode) el.setAttribute("data-theme", mode);
  if (a) el.style.setProperty("--accent", a);
  if (a2) el.style.setProperty("--accent-2", a2);
}

export default function ThemeControls({ variant = "full" }: { variant?: "toggle" | "full" }) {
  const supabase = createClient();
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [accent, setAccent] = useState(PRESETS[0].a);
  const [accent2, setAccent2] = useState(PRESETS[0].a2);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const el = document.documentElement;
    const m = (el.getAttribute("data-theme") as "light" | "dark") || "dark";
    setMode(m);
    setAccent(localStorage.getItem("hx-accent") || PRESETS[0].a);
    setAccent2(localStorage.getItem("hx-accent2") || PRESETS[0].a2);
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      // sincroniza a partir do perfil se o navegador ainda não tem preferência
      supabase.from("profiles").select("tema").eq("id", u.id).single().then(({ data: p }) => {
        const t = (p?.tema ?? {}) as { modo?: "light" | "dark"; accent?: string; accent2?: string };
        if (!localStorage.getItem("hx-theme") && t.modo) {
          persistLocal("theme", t.modo);
          setMode(t.modo);
        }
        if (!localStorage.getItem("hx-accent") && t.accent) {
          persistLocal("accent", t.accent);
          setAccent(t.accent);
          if (t.accent2) {
            persistLocal("accent2", t.accent2);
            setAccent2(t.accent2);
          }
        }
        apply(t.modo, t.accent, t.accent2);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistLocal(k: "theme" | "accent" | "accent2", v: string) {
    localStorage.setItem(`hx-${k}`, v);
  }
  async function salvarPerfil(next: { modo?: string; accent?: string; accent2?: string }) {
    if (!userId) return;
    const { data: p } = await supabase.from("profiles").select("tema").eq("id", userId).single();
    const tema = { ...((p?.tema as object) ?? {}), ...next };
    await supabase.from("profiles").update({ tema }).eq("id", userId);
  }

  function trocarModo(m: "light" | "dark") {
    setMode(m);
    apply(m);
    persistLocal("theme", m);
    salvarPerfil({ modo: m });
  }
  function trocarCor(a: string, a2: string) {
    setAccent(a);
    setAccent2(a2);
    apply(undefined, a, a2);
    persistLocal("accent", a);
    persistLocal("accent2", a2);
    salvarPerfil({ accent: a, accent2: a2 });
  }

  const ToggleBtn = (
    <button
      onClick={() => trocarModo(mode === "dark" ? "light" : "dark")}
      className="hx-glass flex items-center gap-2 px-3 py-2 text-sm font-semibold"
      title="Alternar claro/escuro"
      aria-label="Alternar tema claro e escuro"
    >
      <Icon name={mode === "dark" ? "moon" : "sun"} size={16} />
      <span className="text-[var(--mut)]">{mode === "dark" ? "Escuro" : "Claro"}</span>
    </button>
  );

  if (variant === "toggle") return ToggleBtn;

  return (
    <div className="hx-glass p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="hx-eyebrow">Personalizar</p>
          <p className="font-bold text-[var(--txt)]">Aparência do meu painel</p>
        </div>
        {ToggleBtn}
      </div>

      <p className="mt-4 mb-2 text-sm text-[var(--mut)]">Cor do painel</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const on = p.a.toLowerCase() === accent.toLowerCase();
          return (
            <button
              key={p.nome}
              onClick={() => trocarCor(p.a, p.a2)}
              title={p.nome}
              className={`h-9 w-9 rounded-full border-2 ${on ? "scale-110" : "border-transparent"}`}
              style={{
                background: `linear-gradient(135deg, ${p.a}, ${p.a2})`,
                borderColor: on ? "var(--txt)" : "transparent",
              }}
              aria-label={`Cor ${p.nome}`}
            />
          );
        })}
        <label
          className="flex h-9 items-center gap-2 rounded-full border border-[var(--line-2)] px-3 text-xs text-[var(--mut)]"
          title="Cor personalizada"
        >
          <span
            className="h-4 w-4 rounded-full"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent2})` }}
          />
          Custom
          <input
            type="color"
            value={accent}
            onChange={(e) => trocarCor(e.target.value, accent2)}
            className="h-4 w-6 cursor-pointer bg-transparent"
          />
        </label>
      </div>
      {userId ? (
        <p className="mt-3 text-xs text-[var(--dim)]">Salvo no seu perfil — vale em qualquer dispositivo.</p>
      ) : (
        <p className="mt-3 text-xs text-[var(--dim)]">Salvo neste navegador. Entre para sincronizar entre dispositivos.</p>
      )}
    </div>
  );
}
