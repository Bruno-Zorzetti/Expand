"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import SlideView from "./SlideView";
import type { Slide } from "@/lib/expand-slides";

export default function SlidesPresent({ slides, voltar }: { slides: Slide[]; voltar: string }) {
  const [i, setI] = useState(0);
  const [scale, setScale] = useState(0.5);
  const n = slides.length || 1;

  const fit = useCallback(() => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080)), []);
  useEffect(() => { fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit); }, [fit]);

  const go = useCallback((d: number) => setI((k) => Math.max(0, Math.min(n - 1, k + d))), [n]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(e.key)) { e.preventDefault(); go(1); }
      else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === "Home") setI(0); else if (e.key === "End") setI(n - 1);
      else if (e.key.toLowerCase() === "f") toggleFs();
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [go, n]);

  function toggleFs() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  const pad = (x: number) => String(x).padStart(2, "0");
  const cur = slides[i];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#05070a", display: "grid", placeItems: "center", zIndex: 100 }}
      onClick={(e) => { if (!(e.target as HTMLElement).closest(".ctrl")) go(1); }}>
      {cur ? <div style={{ width: 1920 * scale, height: 1080 * scale, overflow: "hidden" }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 1920, height: 1080 }}><SlideView slide={cur} /></div>
      </div> : null}

      <div className="ctrl" style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: 54, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, background: "linear-gradient(180deg,transparent,rgba(0,0,0,.5))", color: "#F4E8D4" }}>
        <Link href={voltar} style={{ position: "absolute", left: 16, color: "#7C8C7F", fontSize: 13, textDecoration: "none" }}>← Sair</Link>
        <button onClick={() => go(-1)} style={btn}>‹</button>
        <span style={{ fontSize: 13, color: "#7C8C7F", fontVariantNumeric: "tabular-nums" }}>{pad(i + 1)} / {pad(n)}</span>
        <button onClick={() => go(1)} style={btn}>›</button>
        <button onClick={toggleFs} style={{ ...btn, position: "absolute", right: 16 }}>⛶ Tela cheia</button>
      </div>
    </div>
  );
}
const btn: React.CSSProperties = { background: "rgba(255,255,255,.06)", border: "1px solid #1d4034", color: "#F4E8D4", borderRadius: 8, padding: "6px 14px", fontSize: 15, cursor: "pointer", fontFamily: "inherit" };
