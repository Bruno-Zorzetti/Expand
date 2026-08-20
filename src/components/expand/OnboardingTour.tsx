"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STEPS = [
  {
    emoji: "⚡",
    titulo: "Bem-vindo à Expand",
    texto:
      "O motor de trabalho da agência. Aqui vive tudo: tarefas, clientes, comercial, financeiro e os agentes de IA — integrados numa plataforma só, sem planilha.",
  },
  {
    emoji: "📋",
    titulo: "Meu Dia",
    texto:
      "Sua central de operação diária. Veja todas as suas tarefas de hoje, organize por prioridade e dê play para entrar em modo foco. O heatmap registra cada sessão.",
  },
  {
    emoji: "🎯",
    titulo: "Foco & Música",
    texto:
      'O modo foco bloqueia distrações. Escolha uma playlist na sidebar, clique no ▶ ao lado de qualquer tarefa e mergulhe. O tempo é cronometrado e cada sessão aparece no heatmap.',
  },
  {
    emoji: "📁",
    titulo: "Clientes & Carteira",
    texto:
      "Cada cliente tem um dossiê com fases, etapas, aprovações, saúde da conta e histórico. O portal do cliente dá visibilidade em tempo real — sem e-mail, sem atualização manual.",
  },
  {
    emoji: "🤖",
    titulo: "Equipe & Agentes de IA",
    texto:
      "Conheça a equipe humana e os agentes. Cada agente tem personalidade, metodologia e memória própria. Converse diretamente com eles em qualquer perfil — eles lembram do contexto.",
  },
  {
    emoji: "🧠",
    titulo: "Diagnósticos comportamentais",
    texto:
      "Preencha os 3 diagnósticos — DISC, Arquétipo e Temperamentos. Leva ~10 minutos e ajuda os agentes a entender como você trabalha e se comunica melhor.",
  },
];

const OV: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9998,
  background: "rgba(4,10,8,0.88)", backdropFilter: "blur(10px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 20,
};

const CARD: React.CSSProperties = {
  background: "var(--panel-2)",
  border: "1px solid var(--line)",
  borderRadius: 24,
  padding: "36px 32px 28px",
  maxWidth: 440,
  width: "100%",
  boxShadow: "0 24px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(200,155,94,.08)",
  position: "relative",
};

export default function OnboardingTour({
  pessoaId,
  pessoaNome,
}: {
  pessoaId: string;
  pessoaNome: string;
}) {
  const key = `expand_ob3_${pessoaId}`;
  const [phase, setPhase] = useState<"idle" | "tour" | "bemvindo" | "done">("idle");
  const [step, setStep] = useState(0);
  const [vis, setVis] = useState(true);

  useEffect(() => {
    try {
      if (!localStorage.getItem(key)) setPhase("tour");
    } catch { /* noop */ }
  }, [key]);

  function goNext() {
    setVis(false);
    setTimeout(() => {
      if (step < STEPS.length - 1) {
        setStep((s) => s + 1);
      } else {
        setPhase("bemvindo");
      }
      setVis(true);
    }, 130);
  }

  function goPrev() {
    if (step === 0) return;
    setVis(false);
    setTimeout(() => { setStep((s) => s - 1); setVis(true); }, 130);
  }

  function close() {
    try { localStorage.setItem(key, "1"); } catch { /* noop */ }
    setPhase("done");
  }

  if (phase === "idle" || phase === "done") return null;

  const s = STEPS[step];
  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div style={OV}>
      {phase === "tour" && (
        <div style={CARD}>
          {/* Close */}
          <button
            onClick={close}
            style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--dim)", fontSize: 20, lineHeight: 1, padding: 4 }}
            aria-label="Fechar"
          >
            ×
          </button>

          {/* Step badge */}
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--accent)", marginBottom: 20 }}>
            Passo {step + 1} de {STEPS.length}
          </div>

          {/* Content */}
          <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(8px)", transition: "opacity .13s, transform .13s" }}>
            <div style={{ fontSize: 44, marginBottom: 16, lineHeight: 1 }}>{s.emoji}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--txt)", marginBottom: 12, lineHeight: 1.25, fontFamily: "var(--font-cinzel,serif)" }}>
              {s.titulo}
            </h2>
            <p style={{ fontSize: 14.5, color: "var(--dim)", lineHeight: 1.65, marginBottom: 28 }}>
              {s.texto}
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, borderRadius: 99, background: "var(--line)", marginBottom: 20, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 99, transition: "width .3s" }} />
          </div>

          {/* Dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setVis(false); setTimeout(() => { setStep(i); setVis(true); }, 130); }}
                style={{ width: i === step ? 20 : 8, height: 8, borderRadius: 99, background: i === step ? "var(--accent)" : "var(--line)", border: "none", cursor: "pointer", padding: 0, transition: "width .2s, background .2s" }}
                aria-label={`Ir para passo ${i + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button
              onClick={goPrev}
              disabled={step === 0}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: step === 0 ? "var(--dim)" : "var(--txt)", cursor: step === 0 ? "default" : "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}
            >
              Voltar
            </button>
            <button
              onClick={goNext}
              style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: "var(--accent)", color: "#08110E", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
            >
              {step < STEPS.length - 1 ? "Avançar →" : "Concluir tour →"}
            </button>
          </div>

          <button onClick={close} style={{ display: "block", margin: "14px auto 0", background: "none", border: "none", color: "var(--dim)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            pular tour
          </button>
        </div>
      )}

      {phase === "bemvindo" && (
        <div style={{ ...CARD, maxWidth: 480 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--txt)", marginBottom: 8, fontFamily: "var(--font-cinzel,serif)" }}>
              Boas-vindas, {pessoaNome.split(" ")[0]}!
            </h2>
            <p style={{ fontSize: 14, color: "var(--dim)", lineHeight: 1.6 }}>
              Você está dentro. Três passos para completar sua presença na plataforma:
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {[
              {
                n: "1",
                icon: "👤",
                titulo: "Preencher o perfil",
                sub: "Foto, bio, habilidades e contato",
                href: `/expand/equipe/${pessoaId}/editar`,
                cor: "var(--accent)",
              },
              {
                n: "2",
                icon: "📅",
                titulo: "Conectar o Google Calendar",
                sub: "Sincronize sua agenda para ver eventos no Meu Dia",
                href: `/expand/integracoes`,
                cor: "var(--green)",
              },
              {
                n: "3",
                icon: "🧠",
                titulo: "Fazer os diagnósticos",
                sub: "DISC, Arquétipo e Temperamentos — ~10 minutos",
                href: `/expand/equipe/${pessoaId}/diagnostico`,
                cor: "#7B8FE8",
              },
            ].map((item) => (
              <Link
                key={item.n}
                href={item.href}
                onClick={close}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 12,
                  background: "var(--bg)", border: "1px solid var(--line)",
                  textDecoration: "none", color: "inherit",
                  transition: "border-color .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = item.cor)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--line)")}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb,${item.cor} 15%,transparent)`, display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)" }}>{item.titulo}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 1 }}>{item.sub}</div>
                </div>
                <span style={{ color: item.cor, fontSize: 16 }}>→</span>
              </Link>
            ))}
          </div>

          <button
            onClick={close}
            style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--txt)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
          >
            Explorar o sistema primeiro
          </button>
        </div>
      )}
    </div>
  );
}
