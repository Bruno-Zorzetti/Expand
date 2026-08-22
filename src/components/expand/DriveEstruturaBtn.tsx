"use client";
import { useState } from "react";

export default function DriveEstruturaBtn({ clienteId, jaExiste }: { clienteId: string; jaExiste: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ link?: string; erro?: string } | null>(null);

  async function criar() {
    if (!confirm("Criar a estrutura padrão de pastas no Google Drive para este cliente?")) return;
    setLoading(true);
    setResult(null);
    const res = await fetch(`/api/expand/clientes/${clienteId}/drive-estrutura`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (j.ok) {
      setResult({ link: j.link });
      // Forçar reload para atualizar o link salvo
      setTimeout(() => window.location.reload(), 1200);
    } else {
      setResult({ erro: j.error ?? "Erro ao criar estrutura" });
    }
  }

  if (jaExiste) {
    return (
      <div style={{ padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", fontSize: 12.5, color: "var(--green)" }}>
        ✓ Estrutura de pastas já criada. Os documentos estão nas subpastas correspondentes.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--panel-2)", border: "1px solid var(--line)", fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--txt)", display: "block", marginBottom: 6 }}>Estrutura padrão de pastas</strong>
        📁 <strong>Nome do Cliente — Expand</strong><br />
        &nbsp;&nbsp;└ 01 Documentos &nbsp;(contrato, distrato, modelos)<br />
        &nbsp;&nbsp;└ 02 Planilhas<br />
        &nbsp;&nbsp;└ 03 Apresentações<br />
        &nbsp;&nbsp;└ 04 Entregáveis<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└ Copy · Arte · Vídeo<br />
        &nbsp;&nbsp;└ 05 Recebidos
      </div>

      <button
        onClick={criar}
        disabled={loading}
        className="hx-btn hx-btn-primary"
        style={{ padding: "10px 18px", fontSize: 13, alignSelf: "flex-start" }}
      >
        {loading ? "Criando pastas…" : "Criar estrutura padrão no Drive"}
      </button>

      {result?.link && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", fontSize: 12.5, color: "var(--green)" }}>
          ✓ Estrutura criada! <a href={result.link} target="_blank" rel="noreferrer" style={{ color: "var(--green)", fontWeight: 700 }}>Abrir no Drive ↗</a>
        </div>
      )}
      {result?.erro && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", fontSize: 12.5, color: "var(--red)" }}>
          ✗ {result.erro}
        </div>
      )}
    </div>
  );
}
