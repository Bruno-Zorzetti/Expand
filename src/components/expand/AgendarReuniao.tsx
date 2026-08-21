"use client";
import { useState } from "react";

const fld = {
  background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
  color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit",
} as const;

type Reuniao = {
  id: string;
  titulo: string;
  data_hora: string;
  duracao_min: number;
  meet_link: string | null;
  enviado_grupo: boolean;
  transcricao: string | null;
  criado_em: string;
};

function CardReuniao({ r, clienteId }: { r: Reuniao; clienteId: string }) {
  const [showTrans, setShowTrans] = useState(false);
  const [trans, setTrans] = useState(r.transcricao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const dt = new Date(r.data_hora);
  const passada = dt < new Date();
  const fmt = dt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  async function salvarTranscricao() {
    setSalvando(true);
    const fd = new FormData();
    fd.append("reuniaoId", r.id);
    fd.append("transcricao", trans);
    await fetch(`/api/expand/reunioes/${r.id}/transcricao`, { method: "POST", body: fd });
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  return (
    <div className="hx-glass" style={{ borderRadius: 12, padding: "13px 16px", borderLeft: `3px solid ${passada ? "var(--dim)" : "var(--accent)"}` }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.titulo}</div>
          <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>
            {fmt} · {r.duracao_min} min
            {r.enviado_grupo && <span style={{ color: "var(--green)", marginLeft: 8 }}>✓ enviado no grupo</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {r.meet_link && (
            <a href={r.meet_link} target="_blank" rel="noreferrer" className="hx-btn hx-btn-primary" style={{ padding: "6px 12px", fontSize: 12, textDecoration: "none" }}>
              Meet ↗
            </a>
          )}
          {passada && (
            <button
              type="button"
              onClick={() => setShowTrans(!showTrans)}
              className="hx-btn hx-btn-ghost"
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              {r.transcricao ? "Ver transcrição" : "Adicionar transcrição"}
            </button>
          )}
        </div>
      </div>

      {showTrans && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <textarea
            value={trans}
            onChange={(e) => setTrans(e.target.value)}
            rows={8}
            placeholder="Cole aqui a transcrição da reunião…"
            style={{ ...fld, width: "100%", resize: "vertical" }}
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={salvarTranscricao}
              disabled={salvando}
              className="hx-btn hx-btn-primary"
              style={{ padding: "7px 14px", fontSize: 12 }}
            >
              {salvando ? "Salvando…" : "Salvar transcrição"}
            </button>
            {salvo && <span style={{ fontSize: 11.5, color: "var(--green)" }}>✓ Salvo!</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgendarReuniao({
  clienteId,
  reunioes,
  temGrupo,
}: {
  clienteId: string;
  reunioes: Reuniao[];
  temGrupo: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ meetLink?: string; erro?: string } | null>(null);
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("10:00");
  const [duracao, setDuracao] = useState("60");
  const [enviarGrupo, setEnviarGrupo] = useState(temGrupo);

  async function agendar() {
    if (!titulo || !data) return;
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/expand/reunioes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId, titulo, dataHora: `${data}T${hora}:00`, duracaoMin: Number(duracao), enviarGrupo }),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (j.ok) {
      setResult({ meetLink: j.meetLink });
      setTitulo(""); setData("");
      setTimeout(() => window.location.reload(), 1400);
    } else {
      setResult({ erro: j.error ?? "Erro ao agendar reunião" });
    }
  }

  const prox = reunioes.filter(r => new Date(r.data_hora) >= new Date());
  const past = reunioes.filter(r => new Date(r.data_hora) < new Date());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Form */}
      <div className="hx-glass" style={{ borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Agendar reunião com Google Meet</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 160px 120px", gap: 10, marginBottom: 10 }}>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título da reunião…" style={fld} />
          <input type="date" value={data} onChange={e => setData(e.target.value)} style={fld} />
          <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={fld} />
          <select value={duracao} onChange={e => setDuracao(e.target.value)} style={fld}>
            <option value="30">30 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
            <option value="120">120 min</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {temGrupo && (
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, cursor: "pointer" }}>
              <input type="checkbox" checked={enviarGrupo} onChange={e => setEnviarGrupo(e.target.checked)} />
              Enviar link no grupo do WhatsApp
            </label>
          )}
          <button
            type="button"
            onClick={agendar}
            disabled={loading || !titulo || !data}
            className="hx-btn hx-btn-primary"
            style={{ padding: "9px 18px", fontSize: 12.5 }}
          >
            {loading ? "Agendando…" : "🗓 Agendar com Google Meet"}
          </button>
        </div>

        {result?.meetLink && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", fontSize: 12.5, color: "var(--green)" }}>
            ✓ Reunião criada! <a href={result.meetLink} target="_blank" rel="noreferrer" style={{ color: "var(--green)", fontWeight: 700 }}>Abrir Meet ↗</a>
          </div>
        )}
        {result?.erro && (
          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", fontSize: 12.5, color: "var(--red)" }}>
            ✗ {result.erro}
          </div>
        )}
      </div>

      {/* Próximas */}
      {prox.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent)", marginBottom: 8 }}>Próximas ({prox.length})</div>
          {prox.map(r => <CardReuniao key={r.id} r={r} clienteId={clienteId} />)}
        </div>
      )}

      {/* Passadas */}
      {past.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 8 }}>Realizadas ({past.length})</div>
          {past.map(r => <CardReuniao key={r.id} r={r} clienteId={clienteId} />)}
        </div>
      )}

      {reunioes.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--dim)", fontSize: 12.5 }}>
          Nenhuma reunião agendada ainda.
        </div>
      )}
    </div>
  );
}
