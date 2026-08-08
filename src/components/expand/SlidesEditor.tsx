"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SlideView from "./SlideView";
import { LAYOUTS, novoSlide, type Deck, type Slide, type SlideLayout } from "@/lib/expand-slides";

// Slide escalado para caber numa largura w.
function Frame({ slide, w }: { slide: Slide; w: number }) {
  const scale = w / 1920;
  return (
    <div style={{ width: w, height: w * 1080 / 1920, overflow: "hidden", position: "relative", borderRadius: 8, border: "1px solid var(--line)" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 1920, height: 1080 }}><SlideView slide={slide} /></div>
    </div>
  );
}

const lab: React.CSSProperties = { display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 };
const fld: React.CSSProperties = { width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "8px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" };

export default function SlidesEditor({ deck, salvar }: { deck: Deck; salvar: (fd: FormData) => Promise<void> }) {
  const [titulo, setTitulo] = useState(deck.titulo);
  const [publico, setPublico] = useState(deck.publico);
  const [slides, setSlides] = useState<Slide[]>(deck.slides.length ? deck.slides : [novoSlide("capa")]);
  const [sel, setSel] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pw, setPw] = useState(760);
  const prevRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = prevRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setPw(el.clientWidth));
    ro.observe(el); setPw(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const cur = slides[sel];
  const mut = (patch: Partial<Slide>) => { setSlides((a) => a.map((s, i) => i === sel ? { ...s, ...patch } : s)); setDirty(true); };
  const addSlide = (layout: SlideLayout) => { const n = novoSlide(layout); setSlides((a) => { const c = [...a]; c.splice(sel + 1, 0, n); return c; }); setSel(sel + 1); setAddOpen(false); setDirty(true); };
  const del = (i: number) => { if (slides.length <= 1) return; setSlides((a) => a.filter((_, k) => k !== i)); setSel(Math.max(0, Math.min(sel, slides.length - 2))); setDirty(true); };
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= slides.length) return; setSlides((a) => { const c = [...a]; [c[i], c[j]] = [c[j], c[i]]; return c; }); setSel(j); setDirty(true); };
  const setItem = (idx: number, v: string) => mut({ itens: (cur.itens ?? []).map((it, k) => k === idx ? v : it) });
  const addItem = () => mut({ itens: [...(cur.itens ?? []), "Novo ponto"] });
  const delItem = (idx: number) => mut({ itens: (cur.itens ?? []).filter((_, k) => k !== idx) });

  async function salvarAgora() {
    setSaving(true);
    const fd = new FormData();
    fd.set("id", deck.id); fd.set("titulo", titulo); fd.set("publico", String(publico)); fd.set("slides", JSON.stringify(slides));
    await salvar(fd);
    setSaving(false); setDirty(false);
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); salvarAgora(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }); // eslint-disable-line

  const has = (f: keyof Slide) => cur[f] !== undefined;

  return (
    <>
      {/* topo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Link href="/expand/apresentacoes" className="ex-back" style={{ marginBottom: 0 }}>← Apresentações</Link>
        <input value={titulo} onChange={(e) => { setTitulo(e.target.value); setDirty(true); }} style={{ ...fld, width: "auto", flex: 1, minWidth: 200, fontWeight: 700 }} />
        <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--mut)" }}><input type="checkbox" checked={publico} onChange={(e) => { setPublico(e.target.checked); setDirty(true); }} /> Público (cliente vê)</label>
        <Link href={`/expand/apresentacoes/${deck.id}/ver`} className="hx-btn hx-btn-ghost" style={{ padding: "8px 14px", fontSize: 12.5 }}>▶ Apresentar</Link>
        <button onClick={salvarAgora} disabled={saving} className="hx-btn hx-btn-primary" style={{ padding: "8px 16px", fontSize: 12.5, opacity: saving ? 0.6 : 1 }}>{saving ? "Salvando…" : dirty ? "Salvar" : "Salvo ✓"}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 16, alignItems: "start" }}>
        {/* lista de slides */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {slides.map((s, i) => (
            <div key={s.id} onClick={() => setSel(i)} style={{ cursor: "pointer", borderRadius: 10, padding: 4, border: i === sel ? "2px solid var(--accent)" : "2px solid transparent", background: i === sel ? "color-mix(in srgb,var(--accent) 10%,transparent)" : "transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: "var(--dim)", width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                <Frame slide={s} w={150} />
              </div>
              {i === sel ? (
                <div style={{ display: "flex", gap: 4, marginTop: 4, paddingLeft: 20 }}>
                  <button onClick={(e) => { e.stopPropagation(); move(i, -1); }} className="ex-arqbtn" style={{ padding: "2px 7px", fontSize: 11 }}>↑</button>
                  <button onClick={(e) => { e.stopPropagation(); move(i, 1); }} className="ex-arqbtn" style={{ padding: "2px 7px", fontSize: 11 }}>↓</button>
                  <button onClick={(e) => { e.stopPropagation(); del(i); }} className="ex-arqbtn no" style={{ padding: "2px 7px", fontSize: 11 }}>✕</button>
                </div>
              ) : null}
            </div>
          ))}
          <div style={{ position: "relative" }}>
            <button onClick={() => setAddOpen((v) => !v)} className="hx-btn hx-btn-ghost" style={{ width: "100%", padding: "8px", fontSize: 12.5 }}>＋ Adicionar slide</button>
            {addOpen ? (
              <div className="hx-glass" style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, zIndex: 20, borderRadius: 10, padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                {LAYOUTS.map((l) => (
                  <button key={l.k} onClick={() => addSlide(l.k)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "var(--txt)", borderRadius: 7, fontFamily: "inherit" }}>
                    <span style={{ color: "var(--accent)", fontSize: 15, width: 18, textAlign: "center" }}>{l.icon}</span>
                    <span><span style={{ fontSize: 12.5, fontWeight: 700 }}>{l.l}</span><span style={{ fontSize: 10.5, color: "var(--dim)", display: "block" }}>{l.d}</span></span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* preview + edição */}
        <div>
          <div ref={prevRef} style={{ width: "100%", marginBottom: 16 }}>
            {cur ? <div style={{ boxShadow: "0 12px 40px -12px rgba(0,0,0,.6)" }}><Frame slide={cur} w={pw} /></div> : null}
          </div>
          {cur ? (
            <div className="ex-panel hx-glass" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>Editar slide · {LAYOUTS.find((l) => l.k === cur.layout)?.l}</div>
              <div style={{ display: "grid", gap: 12 }}>
                {has("eyebrow") ? <label><span style={lab}>Eyebrow (rótulo pequeno)</span><input value={cur.eyebrow ?? ""} onChange={(e) => mut({ eyebrow: e.target.value })} style={fld} /></label> : null}
                {has("numero") ? <label><span style={lab}>Número em destaque</span><input value={cur.numero ?? ""} onChange={(e) => mut({ numero: e.target.value })} style={fld} /></label> : null}
                {has("titulo") ? <label><span style={lab}>{cur.layout === "citacao" ? "Frase" : "Título"}</span><textarea value={cur.titulo ?? ""} onChange={(e) => mut({ titulo: e.target.value })} rows={cur.layout === "capa" || cur.layout === "citacao" ? 2 : 1} style={{ ...fld, resize: "vertical" }} /></label> : null}
                {has("subtitulo") ? <label><span style={lab}>Subtítulo</span><textarea value={cur.subtitulo ?? ""} onChange={(e) => mut({ subtitulo: e.target.value })} rows={2} style={{ ...fld, resize: "vertical" }} /></label> : null}
                {has("corpo") ? <label><span style={lab}>Texto / parágrafo</span><textarea value={cur.corpo ?? ""} onChange={(e) => mut({ corpo: e.target.value })} rows={3} style={{ ...fld, resize: "vertical" }} /></label> : null}
                {has("autor") ? <label><span style={lab}>Autor / fonte</span><input value={cur.autor ?? ""} onChange={(e) => mut({ autor: e.target.value })} style={fld} /></label> : null}
                {cur.layout === "topicos" ? (
                  <div>
                    <span style={lab}>Tópicos</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(cur.itens ?? []).map((it, idx) => (
                        <div key={idx} style={{ display: "flex", gap: 6 }}>
                          <input value={it} onChange={(e) => setItem(idx, e.target.value)} style={fld} />
                          <button onClick={() => delItem(idx)} className="ex-arqbtn no" style={{ padding: "0 10px", flexShrink: 0 }}>✕</button>
                        </div>
                      ))}
                      <button onClick={addItem} className="hx-btn hx-btn-ghost" style={{ padding: "6px", fontSize: 12, alignSelf: "flex-start" }}>＋ Tópico</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
