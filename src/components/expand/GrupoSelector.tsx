"use client";
import { useState, useRef } from "react";

type Grupo = { jid: string; nome: string };

const fld = {
  background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
  color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit",
  width: "100%",
} as const;

export default function GrupoSelector({
  grupos,
  clienteId,
  jidAtual,
  linkAtual,
}: {
  grupos: Grupo[];
  clienteId: string;
  jidAtual: string | null;
  linkAtual: string | null;
}) {
  const [busca, setBusca] = useState("");
  const [jid, setJid] = useState(jidAtual ?? "");
  const [link, setLink] = useState(linkAtual ?? "");
  const [carregandoLink, setCarregandoLink] = useState(false);

  const filtrados = busca.trim()
    ? grupos.filter((g) => g.nome.toLowerCase().includes(busca.toLowerCase()))
    : grupos;

  async function aoSelecionarGrupo(novoJid: string) {
    setJid(novoJid);
    if (!novoJid) { setLink(""); return; }
    setCarregandoLink(true);
    try {
      const res = await fetch(`/api/expand/clientes/grupo-link?jid=${encodeURIComponent(novoJid)}`);
      const j = await res.json().catch(() => ({}));
      if (j.link) setLink(j.link);
    } finally {
      setCarregandoLink(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {grupos.length > 5 && (
        <input
          type="search"
          placeholder="Buscar grupo por nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={fld}
        />
      )}

      {/* JID hidden input para o form de salvarGrupoCliente */}
      <input type="hidden" name="jid" value={jid} />

      <select
        value={jid}
        onChange={(e) => aoSelecionarGrupo(e.target.value)}
        style={fld}
      >
        <option value="">— sem grupo —</option>
        {filtrados.map((g) => (
          <option key={g.jid} value={g.jid}>{g.nome}</option>
        ))}
      </select>

      {jid && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10.5, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>
            Link de convite{carregandoLink ? " (buscando…)" : ""}
          </label>
          <input
            name="whatsapp_grupo_link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://chat.whatsapp.com/…"
            style={fld}
          />
        </div>
      )}
    </div>
  );
}
