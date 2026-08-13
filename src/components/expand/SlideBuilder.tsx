"use client";

import { useRef, useState, useTransition } from "react";
import { gerarApresentacao } from "@/app/expand/apresentacoes/actions";

const TEMPLATES = [
  { id: "moderno-claro", nome: "Moderno Claro", desc: "Branco limpo, tipografia bold", cor: "#0070f3" },
  { id: "expand-ouro", nome: "Expand Ouro", desc: "Verde escuro + dourado, premium", cor: "#C89B5E" },
  { id: "hashes-azul", nome: "Hashes Azul", desc: "Dark tech, glassmorphism", cor: "#2f80ff" },
  { id: "calendario", nome: "Calendário", desc: "Cronogramas e timelines visuais", cor: "#31d0aa" },
];

const QTD_OPTIONS = [
  { v: 5, l: "5 slides (resumo)" },
  { v: 8, l: "8 slides (padrão)" },
  { v: 12, l: "12 slides (completo)" },
  { v: 18, l: "18 slides (aprofundado)" },
];

export default function SlideBuilder() {
  const [template, setTemplate] = useState("moderno-claro");
  const [qtd, setQtd] = useState(8);
  const [idioma, setIdioma] = useState("pt");
  const [conteudo, setConteudo] = useState("");
  const [fileName, setFileName] = useState("");
  const [html, setHtml] = useState("");
  const [erro, setErro] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    if (f.name.endsWith(".docx")) {
      setErro("Arquivo .docx detectado. Por favor exporte como .txt ou cole o conteúdo diretamente.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setConteudo(String(ev.target?.result ?? ""));
      setErro("");
    };
    reader.readAsText(f, "utf-8");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conteudo.trim()) { setErro("Insira ou carregue o conteúdo primeiro."); return; }
    setErro("");
    setHtml("");
    const fd = new FormData();
    fd.set("conteudo", conteudo);
    fd.set("template", template);
    fd.set("qtd", String(qtd));
    fd.set("idioma", idioma);
    startTransition(async () => {
      const r = await gerarApresentacao(fd);
      if (r.error) { setErro(r.error); return; }
      setHtml(r.html ?? "");
    });
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "apresentacao.html";
    a.click();
  };

  const tpl = TEMPLATES.find(t => t.id === template) ?? TEMPLATES[0];

  return (
    <div>
      {/* Formulário */}
      {!html && (
        <form onSubmit={handleSubmit}>
          {/* Templates */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", marginBottom: 10 }}>Template visual</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
              {TEMPLATES.map(t => (
                <button key={t.id} type="button" onClick={() => setTemplate(t.id)}
                  style={{
                    padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                    border: `2px solid ${template === t.id ? t.cor : "var(--line-2)"}`,
                    background: template === t.id ? `color-mix(in srgb, ${t.cor} 10%, transparent)` : "var(--panel-2)",
                    textAlign: "left", fontFamily: "inherit", transition: ".15s",
                  }}>
                  <div style={{ width: 24, height: 6, borderRadius: 3, background: t.cor, marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", marginBottom: 3 }}>{t.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--mut)" }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo */}
          <div className="hx-glass" style={{ borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", marginBottom: 10 }}>Conteúdo da apresentação</div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="hx-btn" style={{ fontSize: 13, gap: 6, padding: "8px 14px" }}>
                ↑ Carregar arquivo
              </button>
              <input ref={fileRef} type="file" accept=".txt,.md,.csv" onChange={handleFile} style={{ display: "none" }} />
              {fileName && <span style={{ fontSize: 12, color: "var(--green)", alignSelf: "center" }}>✓ {fileName}</span>}
              <span style={{ fontSize: 12, color: "var(--dim)", alignSelf: "center" }}>.txt · .md · .csv</span>
            </div>

            <textarea
              value={conteudo}
              onChange={e => setConteudo(e.target.value)}
              placeholder="Cole aqui o conteúdo da apresentação — texto de um roteiro, tópicos, bullets, transcrição, notas de reunião...

Para arquivos Word (.docx): abra no Word → Arquivo → Salvar como → Texto sem formatação, depois carregue o .txt aqui."
              style={{
                width: "100%", minHeight: 220, resize: "vertical",
                background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 10,
                color: "var(--txt)", padding: "12px 14px", fontSize: 13,
                fontFamily: "inherit", lineHeight: 1.6,
              }}
            />
            <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6 }}>
              {conteudo.trim().split(/\s+/).filter(Boolean).length} palavras
            </div>
          </div>

          {/* Opções */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            <div className="hx-glass" style={{ borderRadius: 12, padding: "12px 14px", flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", marginBottom: 8 }}>Quantidade de slides</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {QTD_OPTIONS.map(o => (
                  <button key={o.v} type="button" onClick={() => setQtd(o.v)}
                    style={{
                      padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                      fontFamily: "inherit", fontWeight: qtd === o.v ? 700 : 500,
                      border: qtd === o.v ? "none" : "1px solid var(--line-2)",
                      background: qtd === o.v ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "transparent",
                      color: qtd === o.v ? "#fff" : "var(--mut)",
                    }}>{o.l}</button>
                ))}
              </div>
            </div>

            <div className="hx-glass" style={{ borderRadius: 12, padding: "12px 14px", minWidth: 180 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--dim)", marginBottom: 8 }}>Idioma</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ v: "pt", l: "🇧🇷 Português" }, { v: "en", l: "🇺🇸 English" }].map(o => (
                  <button key={o.v} type="button" onClick={() => setIdioma(o.v)}
                    style={{
                      padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                      fontFamily: "inherit", fontWeight: idioma === o.v ? 700 : 500,
                      border: idioma === o.v ? "none" : "1px solid var(--line-2)",
                      background: idioma === o.v ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "transparent",
                      color: idioma === o.v ? "#fff" : "var(--mut)",
                    }}>{o.l}</button>
                ))}
              </div>
            </div>
          </div>

          {erro && (
            <div style={{ background: "color-mix(in srgb, var(--warn) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--warn)", marginBottom: 14 }}>
              {erro}
            </div>
          )}

          <button type="submit" disabled={pending || !conteudo.trim()} className="hx-btn hx-btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, gap: 10, opacity: (!pending && conteudo.trim()) ? 1 : 0.5 }}>
            {pending ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                Gerando apresentação com IA...
              </>
            ) : (
              <>✦ Gerar apresentação · {tpl.nome}</>
            )}
          </button>
          {pending && (
            <p style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", marginTop: 8 }}>
              Pode levar 15–30 segundos dependendo do tamanho do conteúdo.
            </p>
          )}
        </form>
      )}

      {/* Resultado */}
      {html && (
        <div>
          {/* Barra de ações */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => { setHtml(""); setErro(""); }} className="hx-btn" style={{ gap: 6, fontSize: 13 }}>
              ← Gerar outro
            </button>
            <button onClick={handleDownload} className="hx-btn hx-btn-primary" style={{ gap: 6, fontSize: 13 }}>
              ↓ Baixar .html
            </button>
            <button onClick={() => setFullscreen(f => !f)} className="hx-btn" style={{ gap: 6, fontSize: 13 }}>
              {fullscreen ? "⊠ Sair da tela cheia" : "⊡ Tela cheia"}
            </button>
            <span style={{ fontSize: 12, color: "var(--dim)", marginLeft: "auto" }}>
              Use as setas ← → ou clique nas setas da apresentação para navegar
            </span>
          </div>

          {/* Preview em iframe */}
          <div style={{
            position: fullscreen ? "fixed" : "relative",
            inset: fullscreen ? 0 : undefined,
            zIndex: fullscreen ? 9999 : undefined,
            width: fullscreen ? "100vw" : "100%",
            height: fullscreen ? "100vh" : "62vw",
            maxHeight: fullscreen ? "100vh" : 680,
            borderRadius: fullscreen ? 0 : 14,
            overflow: "hidden",
            border: fullscreen ? "none" : "1px solid var(--line-2)",
            background: "#000",
          }}>
            {fullscreen && (
              <button onClick={() => setFullscreen(false)}
                style={{ position: "absolute", top: 16, right: 16, zIndex: 10000, padding: "6px 12px", borderRadius: 8, background: "rgba(0,0,0,.7)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                ✕ Fechar
              </button>
            )}
            <iframe
              ref={iframeRef}
              srcDoc={html}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Apresentação gerada"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>

          <p style={{ fontSize: 12, color: "var(--dim)", marginTop: 10 }}>
            A apresentação foi gerada com IA. Revise o conteúdo antes de apresentar. O arquivo .html funciona offline em qualquer navegador.
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
