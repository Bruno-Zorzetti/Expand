import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAcesso } from "@/lib/expand-acesso";
import { getPessoa } from "@/lib/expand-user";

export const dynamic = "force-dynamic";

type S1x1 = {
  id: string; tipo: string; membro_id: string; cliente_id: string | null;
  data_agendada: string | null; data_realizado: string | null; status: string;
  observacoes: string | null; sinais: { nivel: string; texto: string }[] | null;
  humor: string | null; carga: string | null; criado_em: string; criado_por: string | null;
};

const TIPO_LABEL: Record<string, string> = {
  trimestral: "Pulso trimestral",
  debriefing: "Debriefing de projeto",
  demanda:    "Sob demanda",
};
const TIPO_COR: Record<string, string> = {
  trimestral: "var(--accent)",
  debriefing: "var(--green)",
  demanda:    "var(--warn)",
};
const STATUS_LABEL: Record<string, string> = {
  agendado:  "Agendado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};
const STATUS_COR: Record<string, string> = {
  agendado:  "var(--warn)",
  realizado: "var(--green)",
  cancelado: "var(--dim)",
};
const HUMOR_LABEL: Record<string, string> = {
  alto:  "Humor alto",
  medio: "Humor médio",
  baixo: "Humor baixo",
};
const CARGA_LABEL: Record<string, string> = {
  tranquilo:       "Carga tranquila",
  adequado:        "Carga adequada",
  sobrecarregado:  "Sobrecarregado",
};

async function agendar(fd: FormData) {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return;
  const { pessoa } = await getPessoa();
  const adminSb = createAdminClient();
  if (!adminSb) return;
  await adminSb.from("expand_1x1").insert({
    tipo:          String(fd.get("tipo") ?? "trimestral"),
    membro_id:     String(fd.get("membro_id")),
    cliente_id:    fd.get("cliente_id") ? String(fd.get("cliente_id")) : null,
    data_agendada: fd.get("data_agendada") ? new Date(String(fd.get("data_agendada"))).toISOString() : null,
    status:        "agendado",
    criado_por:    pessoa.id,
  });
  revalidatePath("/expand/1x1");
}

async function cancelar(fd: FormData) {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return;
  const adminSb = createAdminClient();
  if (!adminSb) return;
  await adminSb.from("expand_1x1").update({ status: "cancelado" }).eq("id", String(fd.get("id")));
  revalidatePath("/expand/1x1");
}

function fmtDt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function OnexOnePage() {
  const { userId } = await getAcesso();
  if (!userId) return null;

  const sb = await createClient();

  const [{ data: sessoesRaw }, { data: perfisRaw }, { data: clientesRaw }] = await Promise.all([
    sb.from("expand_1x1").select("*").order("data_agendada", { ascending: false }).limit(100),
    sb.from("expand_perfis").select("id, nome, cargo, cor, foto_url, tipo").eq("tipo", "humano").order("nome"),
    sb.from("expand_clientes").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  const sessoes = (sessoesRaw ?? []) as S1x1[];
  const perfis  = (perfisRaw ?? []) as { id: string; nome: string; cargo: string | null; cor: string | null; foto_url: string | null }[];
  const clientes = (clientesRaw ?? []) as { id: string; nome: string }[];

  const perfilMap = Object.fromEntries(perfis.map(p => [p.id, p]));

  const agendadas  = sessoes.filter(s => s.status === "agendado");
  const realizadas = sessoes.filter(s => s.status === "realizado");
  const canceladas = sessoes.filter(s => s.status === "cancelado");

  const totalRealizados = realizadas.length;
  const ultimoTrimestral = realizadas.findLast(s => s.tipo === "trimestral");
  const pendentes = agendadas.length;

  const inp: React.CSSProperties = {
    background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
    color: "var(--txt)", padding: "7px 10px", fontSize: 12.5,
    fontFamily: "inherit", width: "100%", outline: "none",
  };

  return (
    <>
      <p className="hx-eyebrow">Cultura & Equipe</p>
      <h1 className="ex-h1">1x1 com o <span className="hx-accent-text">Humberto</span></h1>
      <p className="ex-sub">
        O Humberto é o mediador neutro de 1x1 e debriefings da equipe Expand. Cada sessão extrai aprendizado real
        sem expor quem falou — os insights chegam à liderança como padrões, não como nomes.
      </p>

      {/* KPIs */}
      <div className="ex-kpis" style={{ marginBottom: 24 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Realizados</div><div className="val hx-accent-text">{totalRealizados}</div><div className="foot">No ciclo</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Agendados</div><div className="val" style={{ color: "var(--warn)" }}>{pendentes}</div><div className="foot">Pendentes</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Último pulso trimestral</div><div className="val" style={{ fontSize: 14 }}>{ultimoTrimestral ? fmtData(ultimoTrimestral.data_realizado ?? ultimoTrimestral.data_agendada) : "—"}</div><div className="foot">Referência</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Membros sem 1x1 recente</div><div className="val" style={{ color: perfis.length - new Set(realizadas.map(s => s.membro_id)).size > 0 ? "var(--warn)" : "var(--green)" }}>{Math.max(0, perfis.length - new Set(realizadas.map(s => s.membro_id)).size)}</div><div className="foot">Sem sessão</div></div>
      </div>

      {/* Agendar novo */}
      <details className="hx-glass" style={{ borderRadius: 14, padding: "14px 18px", marginBottom: 24 }}>
        <summary style={{ fontSize: 13.5, fontWeight: 700, cursor: "pointer", color: "var(--accent)", userSelect: "none" }}>
          + Agendar nova sessão
        </summary>
        <form action={agendar} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 4 }}>Tipo</div>
              <select name="tipo" style={inp}>
                <option value="trimestral">Pulso trimestral</option>
                <option value="debriefing">Debriefing de projeto</option>
                <option value="demanda">Sob demanda</option>
              </select>
            </label>
            <label>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 4 }}>Membro</div>
              <select name="membro_id" required style={inp}>
                <option value="">Selecionar…</option>
                {perfis.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}{p.cargo ? ` · ${p.cargo}` : ""}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 4 }}>Data/hora</div>
              <input type="datetime-local" name="data_agendada" style={inp} />
            </label>
            <label>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 4 }}>Projeto (debriefing)</div>
              <select name="cliente_id" style={inp}>
                <option value="">Nenhum</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "color-mix(in srgb,var(--accent) 8%,transparent)", border: "1px solid color-mix(in srgb,var(--accent) 20%,transparent)", fontSize: 12.5, color: "var(--dim)", lineHeight: 1.6 }}>
            <b style={{ color: "var(--txt)" }}>Como funciona:</b> Após agendar, abra a sessão e o Humberto conduz o 1x1 via chat — você registra as perguntas e respostas diretamente na plataforma ou após a conversa. Tudo fica disponível para a liderança como padrões, nunca como nomes.
          </div>
          <button type="submit" className="hx-btn hx-btn-primary" style={{ alignSelf: "flex-start", padding: "8px 20px" }}>
            Agendar sessão
          </button>
        </form>
      </details>

      {/* Sessões agendadas */}
      {agendadas.length > 0 && (
        <>
          <div className="ex-grph"><span className="gt">Sessões agendadas</span><span className="gc">{agendadas.length}</span><span className="gl" /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {agendadas.map(s => {
              const p = perfilMap[s.membro_id];
              const cor = TIPO_COR[s.tipo] ?? "var(--accent)";
              return (
                <div key={s.id} style={{ borderRadius: 12, background: "var(--panel)", border: "1px solid var(--line)", borderLeft: `3px solid ${cor}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                  {p?.foto_url
                    ? <img src={p.foto_url} alt="" width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 40, height: 40, borderRadius: "50%", background: `color-mix(in srgb,${p?.cor ?? cor} 18%,transparent)`, color: p?.cor ?? cor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{p?.nome?.[0] ?? "?"}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--txt)" }}>{p?.nome ?? s.membro_id}</div>
                    <div style={{ fontSize: 11.5, color: "var(--dim)", display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                      <span style={{ color: cor, fontWeight: 600 }}>{TIPO_LABEL[s.tipo]}</span>
                      {s.data_agendada && <span>{fmtDt(s.data_agendada)}</span>}
                      {s.cliente_id && <span>Projeto: {clientes.find(c => c.id === s.cliente_id)?.nome ?? s.cliente_id}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <Link href={`/expand/1x1/${s.id}`} className="hx-btn hx-btn-primary" style={{ textDecoration: "none", padding: "6px 14px", fontSize: 12 }}>
                      Conduzir →
                    </Link>
                    <form action={cancelar}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="hx-btn" style={{ padding: "6px 12px", fontSize: 12, color: "var(--dim)" }}>
                        Cancelar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Sessões realizadas */}
      {realizadas.length > 0 && (
        <>
          <div className="ex-grph"><span className="gt">Histórico</span><span className="gc">{realizadas.length}</span><span className="gl" /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {realizadas.slice(0, 20).map(s => {
              const p = perfilMap[s.membro_id];
              const cor = TIPO_COR[s.tipo] ?? "var(--accent)";
              const sinaislst = s.sinais ?? [];
              const criticos = sinaislst.filter(x => x.nivel === "critico");
              const atencao = sinaislst.filter(x => x.nivel === "atencao");
              return (
                <div key={s.id} style={{ borderRadius: 12, background: "var(--panel)", border: "1px solid var(--line)", borderLeft: `3px solid ${cor}`, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {p?.foto_url
                    ? <img src={p.foto_url} alt="" width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 36, borderRadius: "50%", background: `color-mix(in srgb,${p?.cor ?? cor} 18%,transparent)`, color: p?.cor ?? cor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{p?.nome?.[0] ?? "?"}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", marginBottom: 2 }}>
                      {p?.nome ?? s.membro_id}
                      {s.humor && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 400, color: "var(--dim)" }}>{HUMOR_LABEL[s.humor]}</span>}
                      {s.carga && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 400, color: s.carga === "sobrecarregado" ? "var(--red)" : "var(--dim)" }}>{CARGA_LABEL[s.carga]}</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--dim)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ color: cor, fontWeight: 600 }}>{TIPO_LABEL[s.tipo]}</span>
                      {s.data_realizado && <span>{fmtDt(s.data_realizado)}</span>}
                    </div>
                    {criticos.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--red)" }}>
                        {criticos.map((x, i) => <span key={i}>⚠ {x.texto} </span>)}
                      </div>
                    )}
                    {atencao.length > 0 && (
                      <div style={{ marginTop: 2, fontSize: 11.5, color: "var(--warn)" }}>
                        {atencao.map((x, i) => <span key={i}>· {x.texto} </span>)}
                      </div>
                    )}
                    {s.observacoes && <p style={{ fontSize: 12, color: "var(--mut)", marginTop: 6, lineHeight: 1.5 }}>{s.observacoes.slice(0, 180)}{s.observacoes.length > 180 ? "…" : ""}</p>}
                  </div>
                  <Link href={`/expand/1x1/${s.id}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", flexShrink: 0, fontWeight: 600 }}>Ver →</Link>
                </div>
              );
            })}
          </div>
        </>
      )}

      {sessoes.length === 0 && (
        <div className="hx-glass" style={{ padding: "40px 32px", borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--txt)", marginBottom: 6 }}>Nenhuma sessão ainda</p>
          <p style={{ fontSize: 13, color: "var(--mut)" }}>Agende o primeiro 1x1 do ciclo acima. O Humberto conduz — você registra os insights.</p>
        </div>
      )}

      {/* Guia rápido */}
      <details className="hx-glass" style={{ borderRadius: 14, padding: "14px 18px", marginTop: 8 }}>
        <summary style={{ fontSize: 13, fontWeight: 700, cursor: "pointer", color: "var(--dim)", userSelect: "none" }}>
          Como o Humberto conduz o 1x1
        </summary>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { n: "1", t: "Segurança primeiro", d: "O Humberto deixa claro o objetivo e o combinado de sigilo antes de começar. O conteúdo vira aprendizado agregado, sem nome colado." },
            { n: "2", t: "Perguntas abertas", d: '"Como foi pra você esse projeto?" rende mais que "deu tudo certo?". Deixe o silêncio trabalhar — não preencha as pausas.' },
            { n: "3", t: "Escuta ativa", d: 'Ele espelha e resume o que ouviu ("então o que te travou foi a aprovação demorar, é isso?") para confirmar e aprofundar.' },
            { n: "4", t: "Do fato ao sentimento", d: "Pergunta o que aconteceu, como a pessoa se sentiu, e o que concretamente ajudaria. Emoção mostra onde dói; fato mostra o que ajustar." },
            { n: "5", t: "Combinados no final", d: "Todo 1x1 termina com sinais de atenção, o que foi aprendido e um ou dois combinados claros para o próximo ciclo." },
          ].map(item => (
            <div key={item.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "color-mix(in srgb,var(--accent) 18%,transparent)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0, marginTop: 1 }}>{item.n}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--txt)", marginBottom: 2 }}>{item.t}</div>
                <div style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.5 }}>{item.d}</div>
              </div>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
