"use client";
import { useRef, useState } from "react";

export default function LogoUpload({ clienteId, logoAtual }: { clienteId: string; logoAtual: string | null }) {
  const inp = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(logoAtual);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(logoAtual ?? "");

  async function handleFile(file: File) {
    if (!file) return;
    setLoading(true);
    setMsg(null);
    setPreview(URL.createObjectURL(file));
    const form = new FormData();
    form.append("logo", file);
    const res = await fetch(`/api/expand/clientes/${clienteId}/logo`, { method: "POST", body: form });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (j.url) { setPreview(j.url); setUrlInput(j.url); setMsg("Logo salva!"); }
    else setMsg(j.error ?? "Erro ao salvar logo");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {/* Preview */}
        <button
          type="button"
          onClick={() => inp.current?.click()}
          style={{
            width: 64, height: 64, borderRadius: 12, flexShrink: 0, cursor: "pointer",
            border: "1.5px dashed var(--line-2)", background: "var(--panel-2)",
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 0,
          }}
          title="Clique para enviar uma imagem"
        >
          {preview ? (
            <img src={preview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
          ) : (
            <span style={{ fontSize: 22, color: "var(--dim)" }}>↑</span>
          )}
        </button>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {/* URL manual (hidden input para o form de atualizarCliente) */}
          <input
            name="logo_url"
            value={urlInput}
            onChange={e => { setUrlInput(e.target.value); setPreview(e.target.value || null); }}
            placeholder="URL da logo ou clique no quadrado para fazer upload"
            style={{
              background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
              color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit", flex: 1, width: "100%",
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => inp.current?.click()}
              disabled={loading}
              className="hx-btn hx-btn-ghost"
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              {loading ? "Enviando…" : "Enviar arquivo"}
            </button>
            {msg && <span style={{ fontSize: 11.5, color: msg.includes("!") ? "var(--green)" : "var(--red)" }}>{msg}</span>}
          </div>
        </div>
      </div>

      <span style={{ fontSize: 10.5, color: "var(--dim)" }}>PNG, JPG ou SVG. Máximo 5MB. Upload salva diretamente — URL atualiza no campo acima.</span>

      {/* Input de arquivo oculto */}
      <input
        ref={inp}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
