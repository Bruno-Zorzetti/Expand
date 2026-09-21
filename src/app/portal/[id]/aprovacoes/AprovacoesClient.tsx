"use client";

import { useRef, useState, useTransition } from "react";
import { responderAprovacaoPortal } from "@/app/expand/actions";

type Etapa = {
  id: string;
  titulo: string;
  area: string | null;
  portal_status: string | null;
};

type Resposta = "aprovado" | "rejeitado" | "alteracoes";

const RESP: Record<Resposta, { label: string; cor: string }> = {
  aprovado:   { label: "Aprovado",               cor: "#22C55E" },
  rejeitado:  { label: "Rejeitado",              cor: "#EF4444" },
  alteracoes: { label: "Alterações solicitadas", cor: "#F97316" },
};

function EtapaCard({ etapa, clienteId }: { etapa: Etapa; clienteId: string }) {
  const [mode, setMode] = useState<"idle" | "form">("idle");
  const [escolhida, setEscolhida] = useState<Resposta | null>(null);
  const [feedback, setFeedback] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<Resposta | null>(null);
  const [pending, startTransition] = useTransition();
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { /* user denied mic */ }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  }

  function aprovar() {
    const fd = new FormData();
    fd.set("etapaId", etapa.id);
    fd.set("clienteId", clienteId);
    fd.set("resposta", "aprovado");
    startTransition(async () => { await responderAprovacaoPortal(fd); setEnviado("aprovado"); });
  }

  function abrirForm(r: Resposta) {
    setEscolhida(r);
    setMode("form");
  }

  function cancelar() {
    setMode("idle");
    setFeedback("");
    setAudioBlob(null);
    setAudioUrl(null);
    setRecording(false);
    setEscolhida(null);
  }

  function confirmar() {
    const fd = new FormData();
    fd.set("etapaId", etapa.id);
    fd.set("clienteId", clienteId);
    fd.set("resposta", escolhida!);
    fd.set("feedback", feedback);
    if (audioBlob) fd.set("audio", new File([audioBlob], "feedback.webm", { type: "audio/webm" }));
    startTransition(async () => { await responderAprovacaoPortal(fd); setEnviado(escolhida!); });
  }

  if (enviado) {
    const s = RESP[enviado];
    return (
      <div className="ex-arq">
        <div className="an"><div style={{ fontWeight: 600 }}>{etapa.titulo}</div><div className="am">Resposta enviada</div></div>
        <span className="ex-stat" style={{ background: `color-mix(in srgb,${s.cor} 15%,transparent)`, color: s.cor }}>{s.label}</span>
      </div>
    );
  }

  if (etapa.portal_status && etapa.portal_status !== "aguardando") {
    const s = RESP[etapa.portal_status as Resposta] ?? { label: etapa.portal_status, cor: "var(--dim)" };
    return (
      <div className="ex-arq">
        <div className="an"><div style={{ fontWeight: 600 }}>{etapa.titulo}</div></div>
        <span className="ex-stat" style={{ background: `color-mix(in srgb,${s.cor} 15%,transparent)`, color: s.cor }}>{s.label}</span>
      </div>
    );
  }

  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{etapa.titulo}</div>
      {etapa.area && (
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 10 }}>
          {etapa.area}
        </div>
      )}

      {mode === "idle" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="ex-arqbtn ok" disabled={pending} onClick={aprovar}>
            ✅ Aprovar
          </button>
          <button disabled={pending} onClick={() => abrirForm("alteracoes")}
            style={{ fontSize: 12.5, padding: "5px 14px", borderRadius: 20, cursor: "pointer", border: "1px solid color-mix(in srgb,#F97316 35%,transparent)", background: "color-mix(in srgb,#F97316 12%,transparent)", color: "#F97316", fontWeight: 600 }}>
            ↩ Solicitar alterações
          </button>
          <button className="ex-arqbtn no" disabled={pending} onClick={() => abrirForm("rejeitado")}>
            ❌ Rejeitar
          </button>
        </div>
      )}

      {mode === "form" && escolhida && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: RESP[escolhida].cor }}>
            {escolhida === "alteracoes" ? "O que deve ser alterado?" : "Por que está rejeitando?"}
          </div>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Descreva o que precisa mudar..."
            rows={3}
            style={{
              width: "100%", background: "var(--panel-2)",
              border: "1px solid var(--line)", borderRadius: 8,
              padding: "8px 10px", fontSize: 13, color: "var(--txt)",
              resize: "vertical", fontFamily: "inherit",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {!recording && !audioUrl && (
              <button onClick={startRecording}
                style={{ fontSize: 12, padding: "5px 12px", background: "color-mix(in srgb,var(--accent) 12%,transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb,var(--accent) 30%,transparent)", borderRadius: 20, cursor: "pointer" }}>
                🎙 Gravar áudio
              </button>
            )}
            {recording && (
              <button onClick={stopRecording}
                style={{ fontSize: 12, padding: "5px 12px", background: "color-mix(in srgb,#EF4444 12%,transparent)", color: "#EF4444", border: "1px solid color-mix(in srgb,#EF4444 30%,transparent)", borderRadius: 20, cursor: "pointer" }}>
                ⏹ Parar gravação
              </button>
            )}
            {audioUrl && (
              <>
                <audio controls src={audioUrl} style={{ height: 30, flex: 1, minWidth: 140 }} />
                <button onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                  style={{ fontSize: 11, padding: "3px 9px", background: "none", color: "var(--dim)", border: "1px solid var(--line)", borderRadius: 12, cursor: "pointer" }}>
                  ✕
                </button>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="ex-arqbtn ok" disabled={pending || (!feedback.trim() && !audioBlob)} onClick={confirmar}>
              {pending ? "Enviando..." : "Confirmar"}
            </button>
            <button onClick={cancelar}
              style={{ fontSize: 12.5, padding: "5px 14px", background: "none", color: "var(--dim)", border: "1px solid var(--line)", borderRadius: 20, cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AprovacoesClient({ etapas, clienteId }: { etapas: Etapa[]; clienteId: string }) {
  const pendentes = etapas.filter((e) => e.portal_status === "aguardando");
  const respondidas = etapas.filter((e) => e.portal_status && e.portal_status !== "aguardando");

  return (
    <>
      <div className="ex-panel hx-glass" style={{ marginTop: 16 }}>
        <div className="ph">
          <span className="pt">Tarefas aguardando seu aval</span>
          <span className="pc">{pendentes.length}</span>
        </div>
        {pendentes.length === 0 ? (
          <div className="pb">
            <span style={{ color: "var(--dim)", fontSize: 12 }}>Nenhuma tarefa aguardando aprovação.</span>
          </div>
        ) : (
          pendentes.map((e) => <EtapaCard key={e.id} etapa={e} clienteId={clienteId} />)
        )}
      </div>

      {respondidas.length > 0 && (
        <div className="ex-panel hx-glass" style={{ marginTop: 16 }}>
          <div className="ph">
            <span className="pt">Já respondidas</span>
            <span className="pc">{respondidas.length}</span>
          </div>
          {respondidas.map((e) => <EtapaCard key={e.id} etapa={e} clienteId={clienteId} />)}
        </div>
      )}
    </>
  );
}
