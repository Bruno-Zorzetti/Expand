"use client";

import { useEffect } from "react";

// Reaplica as cores customizadas do tema Expand (salvas em localStorage) ao carregar a área.
export default function ExpandTemaInit() {
  useEffect(() => {
    try {
      const s = localStorage.getItem("expand-tema");
      if (!s) return;
      const m = JSON.parse(s) as Record<string, string>;
      const e = document.querySelector(".tema-expand") as HTMLElement | null;
      if (e) for (const k in m) e.style.setProperty(k, m[k]);
    } catch { /* noop */ }
  }, []);
  return null;
}
