"use client";

import { useState, useRef, useTransition } from "react";

const PERGUNTAS_TRIMESTRAL = [
  "Como você está se sentindo com o trabalho nos últimos meses, de 1 a 10?",
  "O que te gerou mais energia e satisfação nesse período?",
  "Onde você sentiu mais dificuldade ou frustração?",
  "Você sente que está crescendo profissionalmente aqui? O que ajudaria?",
  "Tem algo que a liderança poderia fazer diferente para te apoiar melhor?",
  "Como está o equilíbrio entre trabalho e vida pessoal?",
  "Há algum projeto ou responsabilidade que você gostaria de assumir?",
  "O que mais te preocupa nos próximos meses?",
];
const PERGUNTAS_DEBRIEFING = [
  "Como foi a experiência geral desse projeto pra você?",
  "O que correu bem e pode ser repetido?",
  "O que travou mais o projeto e por quê?",
  "Como foi a comunicação interna e com o cliente?",
  "O que você faria diferente se começasse hoje?",
  "O que esse projeto te ensinou?",
  "Tem algo que ficou sem espaço pra falar durante o projeto?",
];
const PERGUNTAS_DEMANDA = [
  "O que te motivou a pedir essa conversa?",
  "O que está acontecendo e como você está se sentindo com isso?",
  "O que você esperava/precisa que mude?",
  "Como posso ajudar você nesse momento?",
];

type Sessao = {
  id: string; tipo: string; membro_id: string; cliente_id: string | null;
  data_agendada: string | null; data_realizado: string | null; status: string;
  observacoes: string | null;
  combinados: { texto: string; responsavel: string; prazo: string }[] | null;
  sinais: { nivel: string; texto: string }[] | null;
  humor: string | null; carga: string | null;
  criado_em: string; criado_por: string | null;
};
type Resposta = { id: string; pergunta: string; resposta: string; criado_em: string };
type Membro = { id: string; nome: string; cargo: string | null; foto_url: string | null; cor: string | null } | null;
type Cliente = { id: string; nome: string } | null;

const TIPO_LABEL: Record<string, string> = {
  trimestral: "Pulso trimestral",
  debriefing: "Debriefing de projeto",
  demanda:    "Sob demanda",
};
const STATUS_COR: Record<string, string> = {
  agendado: "var(--warn)", realizado: "var(--green)", cancelado: "var(--dim)",
};
const HUMOR_OPT = ["alto", "medio", "baixo"];
const CARGA_OPT = ["tranquilo", "adequado", "sobrecarregado"];
const NIVEL_OPT = [
  { v: "ok",      label: "OK",      cor: "var(--green)" },
  { v: "atencao", label: "Atenção", cor: "var(--warn)" },
  { v: "critico", label: "Crítico", cor: "var(--red)" },
];

function fmtDt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const inp: React.CSSProperties = {
  background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
  color: "var(--txt)", padding: "7px 10px", fontSize: 12.5,
  fontFamily: "inherit", width: "100%", outline: "none", resize: "vertical",
};
const sel: React.CSSProperties = { ...inp, resize: undefined };

interface Props {
  sessao: Sessao;
  respostas: Resposta[];
  membro: Membro;
  cliente: Cliente;
  salvarResposta: (fd: FormData) => Promise<void>;
  salvarConclusao: (fd: FormData) => Promise<void>;
  excluirResposta: (fd: FormData) => Promise<void>;
}

export default function SessaoHub({ sessao, respostas, membro, cliente, salvarResposta, salvarConclusao, excluirResposta }: Props) {
  const perguntas = sessao.tipo === "debriefing"
    ? PERGUNTAS_DEBRIEFING
    : sessao.tipo === "demanda"
    ? PERGUNTAS_DEMANDA
    : PERGUNTAS_TRIMESTRAL;

  const [tab, setTab] = useState<"perguntas" | "combinados" | "sinais" | "encerrar">("perguntas");
  const [perguntaSel, setPerguntaSel] = useState<string>(perguntas[0]);
  const [respostaInput, setRespostaInput] = useState("");
  const [pending, startTransition] = useTransition();

  // Combinados state
  const [combinados, setCombinados] = useState<{ texto: string; responsavel: string; prazo: string }[]>(
    sessao.combinados ?? []
  );
  const [novoTxt, setNovoTxt] = useState("");
  const [novoResp, setNovoResp] = useState("");
  const [novoPrazo, setNovoPrazo] = useState("");

  // Sinais state
  const [sinais, setSinais] = useState<{ nivel: string; texto: string }[]>(
    sessao.sinais ?? []
  );
  const [novoSinalNivel, setNovoSinalNivel] = useState("atencao");
  const [novoSinalTxt, setNovoSinalTxt] = useState("");

  // Encerrar
  const [humor, setHumor] = useState(sessao.humor ?? "");
  const [carga, setCarga] = useState(sessao.carga ?? "");
  const [observacoes, setObservacoes] = useState(sessao.observacoes ?? "");

  const realizado = sessao.status === "realizado";

  function addCombinado() {
    if (!novoTxt.trim()) return;
    setCombinados(c => [...c, { texto: novoTxt.trim(), responsavel: novoResp.trim(), prazo: novoPrazo.trim() }]);
    setNovoTxt(""); setNovoResp(""); setNovoPrazo("");
  }
  function removeCombinado(i: number) { setCombinados(c => c.filter((_, j) => j !== i)); }

  function addSinal() {
    if (!novoSinalTxt.trim()) return;
    setSinais(s => [...s, { nivel: novoSinalNivel, texto: novoSinalTxt.trim() }]);
    setNovoSinalTxt("");
  }
  function removeSinal(i: number) { setSinais(s => s.filter((_, j) => j !== i)); }

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "perguntas",  label: "Roteiro" },
    { id: "combinados", label: `Combinados (${combinados.length})` },
    { id: "sinais",     label: `Sinais (${sinais.length})` },
    { id: "encerrar",   label: "Encerrar" },
  ];

  const cor = membro?.cor ?? "var(--accent)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header membro */}
      <div className="hx-glass" style={{ borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        {membro?.foto_url
          ? <img src={membro.foto_url} alt="" width={56} height={56} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 56, height: 56, borderRadius: "50%", background: `color-mix(in srgb,${cor} 18%,transparent)`, color: cor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
              {membro?.nome?.[0] ?? "?"}
            </div>
        }
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--txt)" }}>{membro?.nome ?? sessao.membro_id}</div>
          {membro?.cargo && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 2 }}>{membro.cargo}</div>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: TIPO_LABEL[sessao.tipo] ? "var(--accent)" : "var(--dim)" }}>
              {TIPO_LABEL[sessao.tipo] ?? sessao.tipo}
            </span>
            {cliente && <span style={{ fontSize: 11.5, color: "var(--mut)" }}>Projeto: {cliente.nome}</span>}
            <span style={{ fontSize: 11.5, fontWeight: 600, color: STATUS_COR[sessao.status] }}>
              {sessao.status.charAt(0).toUpperCase() + sessao.status.slice(1)}
            </span>
            {sessao.data_agendada && <span style={{ fontSize: 11.5, color: "var(--mut)" }}>Agendado: {fmtDt(sessao.data_agendada)}</span>}
            {sessao.data_realizado && <span style={{ fontSize: 11.5, color: "var(--green)" }}>Realizado: {fmtDt(sessao.data_realizado)}</span>}
          </div>
        </div>
        <div style={{ fontSize: 28 }}>{realizado ? "✅" : "🤝"}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 16px", fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? "var(--accent)" : "var(--dim)",
              borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              fontFamily: "inherit", transition: "all .15s",
            }}>{t.label}</button>
        ))}
      </div>

      {/* Roteiro */}
      {tab === "perguntas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!realizado && (
            <div className="hx-glass" style={{ borderRadius: 14, padding: "16px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 10 }}>Nova resposta</div>
              <form action={async (fd) => {
                startTransition(async () => { await salvarResposta(fd); });
                setRespostaInput("");
              }}>
                <input type="hidden" name="sessao_id" value={sessao.id} />
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>Pergunta</div>
                  <select name="pergunta" value={perguntaSel} onChange={e => setPerguntaSel(e.target.value)} style={{ ...sel }}>
                    {perguntas.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="__custom">Pergunta livre…</option>
                  </select>
                  {perguntaSel === "__custom" && (
                    <input type="text" name="pergunta" placeholder="Digite a pergunta…" style={{ ...inp, marginTop: 6 }} />
                  )}
                  {perguntaSel !== "__custom" && <input type="hidden" name="pergunta" value={perguntaSel} />}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>Resposta (anônima — sem identificar quem disse)</div>
                  <textarea name="resposta" rows={3} placeholder="Registre o que foi dito…" value={respostaInput}
                    onChange={e => setRespostaInput(e.target.value)} style={{ ...inp, minHeight: 70 }} />
                </div>
                <button type="submit" disabled={pending || !respostaInput.trim()} className="hx-btn hx-btn-primary"
                  style={{ padding: "7px 18px", fontSize: 12.5 }}>
                  {pending ? "Salvando…" : "Registrar resposta"}
                </button>
              </form>
            </div>
          )}

          {respostas.length === 0 && (
            <div style={{ textAlign: "center", padding: "28px", color: "var(--mut)", fontSize: 13 }}>
              Nenhuma resposta registrada ainda. Use o formulário acima para documentar o 1x1.
            </div>
          )}

          {respostas.map((r, i) => (
            <div key={r.id} className="hx-glass" style={{ borderRadius: 12, padding: "14px 18px", position: "relative" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--accent)", marginBottom: 6 }}>
                P{i + 1}
              </div>
              <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--dim)", marginBottom: 8, lineHeight: 1.5 }}>
                {r.pergunta}
              </div>
              <div style={{ fontSize: 13.5, color: "var(--txt)", lineHeight: 1.6, background: "color-mix(in srgb,var(--accent) 5%,transparent)", borderRadius: 8, padding: "10px 12px" }}>
                {r.resposta}
              </div>
              {!realizado && (
                <form action={excluirResposta} style={{ position: "absolute", top: 12, right: 14 }}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="sessao_id" value={sessao.id} />
                  <button type="submit" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--dim)" }} title="Excluir">✕</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Combinados */}
      {tab === "combinados" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12.5, color: "var(--mut)", margin: 0 }}>
            Combinados são acordos concretos que saem do 1x1 — o que vai ser feito, por quem e até quando.
          </p>
          {!realizado && (
            <div className="hx-glass" style={{ borderRadius: 14, padding: "14px 18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--mut)", marginBottom: 3 }}>Combinado</div>
                  <input placeholder="O que foi acordado?" value={novoTxt} onChange={e => setNovoTxt(e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--mut)", marginBottom: 3 }}>Responsável</div>
                  <input placeholder="Quem?" value={novoResp} onChange={e => setNovoResp(e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--mut)", marginBottom: 3 }}>Prazo</div>
                  <input placeholder="Até quando?" value={novoPrazo} onChange={e => setNovoPrazo(e.target.value)} style={inp} />
                </div>
              </div>
              <button onClick={addCombinado} className="hx-btn hx-btn-primary" style={{ padding: "6px 16px", fontSize: 12 }}>+ Adicionar</button>
            </div>
          )}
          {combinados.length === 0 && <div style={{ color: "var(--mut)", fontSize: 13, textAlign: "center", padding: 20 }}>Nenhum combinado ainda.</div>}
          {combinados.map((c, i) => (
            <div key={i} style={{ borderRadius: 10, background: "var(--panel)", border: "1px solid var(--line)", borderLeft: "3px solid var(--accent)", padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, color: "var(--txt)", fontWeight: 600, marginBottom: 4 }}>{c.texto}</div>
                <div style={{ fontSize: 12, color: "var(--dim)", display: "flex", gap: 10 }}>
                  {c.responsavel && <span>👤 {c.responsavel}</span>}
                  {c.prazo && <span>📅 {c.prazo}</span>}
                </div>
              </div>
              {!realizado && (
                <button onClick={() => removeCombinado(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dim)", fontSize: 14 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sinais */}
      {tab === "sinais" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 12.5, color: "var(--mut)", margin: 0 }}>
            Sinais são padrões detectados na escuta — sem identificar quem falou. A liderança usa isso para ver o que está acontecendo na equipe em nível de padrão.
          </p>
          {!realizado && (
            <div className="hx-glass" style={{ borderRadius: 14, padding: "14px 18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "end", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--mut)", marginBottom: 3 }}>Nível</div>
                  <select value={novoSinalNivel} onChange={e => setNovoSinalNivel(e.target.value)} style={{ ...sel, width: "auto" }}>
                    {NIVEL_OPT.map(n => <option key={n.v} value={n.v}>{n.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--mut)", marginBottom: 3 }}>Sinal</div>
                  <input placeholder="Descreva o padrão observado (sem nome)…" value={novoSinalTxt}
                    onChange={e => setNovoSinalTxt(e.target.value)} style={inp} />
                </div>
              </div>
              <button onClick={addSinal} className="hx-btn hx-btn-primary" style={{ padding: "6px 16px", fontSize: 12 }}>+ Adicionar sinal</button>
            </div>
          )}
          {sinais.length === 0 && <div style={{ color: "var(--mut)", fontSize: 13, textAlign: "center", padding: 20 }}>Nenhum sinal registrado ainda.</div>}
          {sinais.map((s, i) => {
            const n = NIVEL_OPT.find(x => x.v === s.nivel);
            return (
              <div key={i} style={{ borderRadius: 10, background: "var(--panel)", border: "1px solid var(--line)", borderLeft: `3px solid ${n?.cor ?? "var(--dim)"}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: n?.cor ?? "var(--dim)", flexShrink: 0, minWidth: 54 }}>{n?.label}</span>
                <span style={{ fontSize: 13, color: "var(--txt)", flex: 1 }}>{s.texto}</span>
                {!realizado && (
                  <button onClick={() => removeSinal(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--dim)", fontSize: 14, flexShrink: 0 }}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Encerrar */}
      {tab === "encerrar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {realizado ? (
            <div style={{ padding: "32px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", marginBottom: 4 }}>Sessão concluída</p>
              <p style={{ fontSize: 13, color: "var(--mut)" }}>Realizado em {fmtDt(sessao.data_realizado)}</p>
              {sessao.humor && <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 8 }}>Humor: <b style={{ color: "var(--txt)" }}>{sessao.humor}</b> · Carga: <b style={{ color: "var(--txt)" }}>{sessao.carga}</b></p>}
              {sessao.observacoes && <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 8, lineHeight: 1.5, maxWidth: 480, margin: "8px auto 0" }}>{sessao.observacoes}</p>}
            </div>
          ) : (
            <div className="hx-glass" style={{ borderRadius: 14, padding: "18px 22px" }}>
              <p style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 16 }}>
                Preencha o resumo e encerre a sessão. Isso não pode ser desfeito — a sessão passa para "realizado".
              </p>
              <form action={async (fd) => {
                fd.append("combinados", JSON.stringify(combinados));
                fd.append("sinais", JSON.stringify(sinais));
                startTransition(async () => { await salvarConclusao(fd); });
              }}>
                <input type="hidden" name="sessao_id" value={sessao.id} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <label>
                    <div style={{ fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>Humor da pessoa</div>
                    <select name="humor" value={humor} onChange={e => setHumor(e.target.value)} style={sel}>
                      <option value="">Selecionar…</option>
                      {HUMOR_OPT.map(h => <option key={h} value={h}>{h.charAt(0).toUpperCase() + h.slice(1)}</option>)}
                    </select>
                  </label>
                  <label>
                    <div style={{ fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>Carga de trabalho percebida</div>
                    <select name="carga" value={carga} onChange={e => setCarga(e.target.value)} style={sel}>
                      <option value="">Selecionar…</option>
                      {CARGA_OPT.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </label>
                </div>
                <label>
                  <div style={{ fontSize: 11, color: "var(--mut)", marginBottom: 4 }}>Observações da sessão (visível para a liderança)</div>
                  <textarea name="observacoes" rows={4} value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    placeholder="Síntese da conversa — pontos principais, padrões detectados, tom geral…"
                    style={{ ...inp, minHeight: 90, marginBottom: 14 }} />
                </label>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb,var(--warn) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--warn) 25%,transparent)", fontSize: 12.5, color: "var(--dim)", marginBottom: 14, lineHeight: 1.5 }}>
                  <b style={{ color: "var(--txt)" }}>Antes de encerrar:</b> verifique que os combinados e sinais foram registrados nas abas ao lado. Após encerrar, não é possível adicionar novos.
                </div>
                <button type="submit" disabled={pending} className="hx-btn hx-btn-primary" style={{ padding: "8px 20px" }}>
                  {pending ? "Salvando…" : "Encerrar sessão"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
