import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import PerfilAvatar from "@/components/expand/PerfilAvatar";
import AgenteChat from "@/components/expand/AgenteChat";
import type { Perfil } from "@/lib/expand-perfis";
import { montarDisc, type DiscKey } from "@/lib/expand-disc";
import { montarArquetipo, type ArqKey } from "@/lib/expand-arquetipo";
import { metricasPessoa, heatmap, type EtapaProd } from "@/lib/expand-produtividade";
import Heatmap from "@/components/expand/Heatmap";
import { marcarFolga, removerFolga } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

type Avaliacao = { id: string; data: string; nota: number | null; periodo: string | null; avaliador: string | null; destaques: string | null; a_melhorar: string | null };
type Feedback = { id: string; data: string; superior: string | null; humor: string | null; destaques: string | null; atencao: string | null; acordos: string | null; objetivo: string | null; origem: string | null; mediador: string | null; status: string | null };
const ORIGEM_1X1: Record<string, string> = { "trimestral": "Pulso trimestral", "fim-de-projeto": "Fim de projeto (debriefing)", "solicitado": "Solicitado pelo gestor" };

const fmtDia = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "");
const fmtData = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "");
const fmtCurto = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "");

async function addAvaliacao(formData: FormData) {
  "use server";
  const id = String(formData.get("perfil_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const nota = formData.get("nota") ? Number(formData.get("nota")) : null;
  await supabase.from("expand_avaliacoes").insert({
    perfil_id: id, nota,
    periodo: String(formData.get("periodo") ?? "").trim() || null,
    avaliador: String(formData.get("avaliador") ?? "").trim() || null,
    destaques: String(formData.get("destaques") ?? "").trim() || null,
    a_melhorar: String(formData.get("a_melhorar") ?? "").trim() || null,
    data: String(formData.get("data") ?? "") || undefined,
  });
  const { data: all } = await supabase.from("expand_avaliacoes").select("nota").eq("perfil_id", id);
  const notas = (all ?? []).map((a) => a.nota as number | null).filter((n): n is number => n != null);
  const avg = notas.length ? Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 10) / 10 : null;
  await supabase.from("expand_perfis").update({ nota: avg }).eq("id", id);
  revalidatePath(`/expand/equipe/${id}`);
}

async function addFeedback(formData: FormData) {
  "use server";
  const id = String(formData.get("perfil_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("expand_1x1").insert({
    perfil_id: id,
    superior: String(formData.get("superior") ?? "").trim() || null,
    humor: String(formData.get("humor") ?? "").trim() || null,
    destaques: String(formData.get("destaques") ?? "").trim() || null,
    atencao: String(formData.get("atencao") ?? "").trim() || null,
    acordos: String(formData.get("acordos") ?? "").trim() || null,
    objetivo: String(formData.get("objetivo") ?? "").trim() || null,
    origem: String(formData.get("origem") ?? "").trim() || null,
    mediador: String(formData.get("mediador") ?? "").trim() || null,
    status: String(formData.get("status") ?? "realizado").trim() || "realizado",
    data: String(formData.get("data") ?? "") || undefined,
  });
  revalidatePath(`/expand/equipe/${id}`);
}

function Radar({ eixos, cor }: { eixos: { l: string; v: number }[]; cor: string }) {
  const N = eixos.length, cx = 108, cy = 104, R = 74;
  const pt = (i: number, r: number) => { const a = (-90 + (i * 360) / N) * (Math.PI / 180); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const poly = eixos.map((e, i) => pt(i, R * Math.max(0.08, Math.min(1, e.v))).join(",")).join(" ");
  return (
    <svg viewBox="0 0 216 208" style={{ width: "100%", maxWidth: 240, margin: "0 auto", display: "block" }}>
      {[0.33, 0.66, 1].map((rr, k) => <polygon key={k} points={eixos.map((_, i) => pt(i, R * rr).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth={1} />)}
      {eixos.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} />; })}
      <polygon points={poly} fill={`color-mix(in srgb, ${cor} 26%, transparent)`} stroke={cor} strokeWidth={2} />
      {eixos.map((e, i) => { const [x, y] = pt(i, R + 14); return <text key={i} x={x} y={y} fill="var(--mut)" fontSize={8.5} textAnchor="middle" dominantBaseline="middle">{e.l}</text>; })}
    </svg>
  );
}

function Barras({ dados, cor }: { dados: { v: number; l: string }[]; cor: string }) {
  if (!dados.length) return <p style={{ fontSize: 12, color: "var(--dim)" }}>Sem avaliações para plotar ainda.</p>;
  const W = 300, H = 96, n = dados.length, step = (W - 16) / n, bw = Math.min(30, step - 8);
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} style={{ width: "100%", display: "block" }}>
      <line x1={8} y1={H} x2={W - 4} y2={H} stroke="var(--line)" strokeWidth={1} />
      {dados.map((d, i) => {
        const h = (Math.max(0, Math.min(10, d.v)) / 10) * (H - 8), x = 8 + i * step + (step - bw) / 2;
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={bw} height={h} rx={4} fill={`color-mix(in srgb, ${cor} 78%, transparent)`} />
            <text x={x + bw / 2} y={H - h - 4} fill="var(--mut)" fontSize={9} textAnchor="middle">{d.v}</text>
            <text x={x + bw / 2} y={H + 13} fill="var(--dim)" fontSize={8} textAnchor="middle">{d.l}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Sec({ titulo, extra, children }: { titulo: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="ex-panel hx-glass" style={{ padding: 0 }}>
      <div style={{ padding: "14px 17px 0", display: "flex", alignItems: "center", gap: 8 }}><p className="ex-sl" style={{ margin: 0 }}>{titulo}</p>{extra ? <span style={{ marginLeft: "auto" }}>{extra}</span> : null}</div>
      <div style={{ padding: "12px 17px 16px" }}>{children}</div>
    </div>
  );
}
function Chips({ arr }: { arr: string[] | null }) {
  if (!arr || !arr.length) return null;
  return <div className="ex-skills">{arr.map((s, i) => <span key={i} className="ex-skill">{s}</span>)}</div>;
}
const fld: React.CSSProperties = { width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 9px", fontSize: 12.5, outline: "none", fontFamily: "inherit" };
const lb: React.CSSProperties = { display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 };

export default async function PerfilPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;
  const tab = t ?? "visao";
  const supabase = await createClient();
  const { data } = await supabase.from("expand_perfis").select("*").eq("id", id).single();
  if (!data) notFound();
  const p = data as Perfil;
  const ehAgente = p.tipo === "agente";
  const cor = p.cor ?? "var(--accent)";

  const { data: { user } } = await supabase.auth.getUser();
  let podeEditar = false, podeAvaliar = false;
  if (user) {
    const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
    const membro = me?.expand_membro as string | null;
    const admin = me?.role === "admin";
    podeEditar = admin || membro === id;
    podeAvaliar = admin || (!!p.superior && membro === p.superior);
  }

  const { data: avData } = await supabase.from("expand_avaliacoes").select("*").eq("perfil_id", id).order("data", { ascending: false });
  const { data: fbData } = await supabase.from("expand_1x1").select("*").eq("perfil_id", id).order("data", { ascending: false });
  const avaliacoes = (avData ?? []) as Avaliacao[];
  const feedbacks = (fbData ?? []) as Feedback[];

  // Arquivos do conhecimento/RAG (nós com arquivo no Storage) → aba Arquivos.
  const { data: arqData } = await supabase.from("expand_conhecimento")
    .select("id, titulo, tipo, fonte, arquivo_path, arquivo_nome, criado_em")
    .eq("agente_id", id).not("arquivo_path", "is", null).order("criado_em", { ascending: false });
  type Arq = { id: string; titulo: string | null; tipo: string | null; fonte: string | null; arquivo_path: string; arquivo_nome: string | null };
  const arquivos = (arqData ?? []) as Arq[];
  const assinado: Record<string, string> = {};
  await Promise.all(arquivos.map(async (a) => {
    const { data: s } = await supabase.storage.from("expand-entregaveis").createSignedUrl(a.arquivo_path, 3600);
    if (s?.signedUrl) assinado[a.id] = s.signedUrl;
  }));
  const comport = p.disc ? montarDisc(p.disc as Record<DiscKey, number>) : null;
  const arq = p.arquetipo ? montarArquetipo(p.arquetipo as Record<ArqKey, number>) : null;

  // Produtividade — só para humanos (o trabalho por-tarefa é deles). Deriva das etapas.
  let prod: ReturnType<typeof metricasPessoa> | null = null;
  let heat: ReturnType<typeof heatmap> | null = null;
  if (!ehAgente) {
    const { data: etProd } = await supabase.from("expand_etapas")
      .select("responsavel, responsavel_atual, status, area, sla, duracao_min, data_prevista, concluida_em, bloqueado");
    const rows = (etProd ?? []) as EtapaProd[];
    prod = metricasPessoa(p.nome, rows);
    heat = heatmap(p.nome, rows);
  }

  // Disponibilidade: feriados de referência (futuros) + folgas da pessoa (humanos)
  type Feriado = { id: string; data: string; nome: string; escopo: string };
  type Folga = { id: string; data: string; motivo: string | null };
  let feriados: Feriado[] = [], folgas: Folga[] = [];
  if (!ehAgente) {
    const hojeISO = new Date().toISOString().slice(0, 10);
    const { data: fer } = await supabase.from("expand_feriados").select("id, data, nome, escopo").gte("data", hojeISO).order("data").limit(12);
    feriados = (fer ?? []) as Feriado[];
    const { data: fol } = await supabase.from("expand_perfil_folga").select("id, data, motivo").eq("perfil_id", id).gte("data", hojeISO).order("data");
    folgas = (fol ?? []) as Folga[];
  }
  const folgaSet = new Set(folgas.map((f) => f.data));
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const icsUrl = p.ics_token ? `${site}/api/calendario/${p.ics_token}.ics` : null;
  const instaUrl = p.instagram ? (p.instagram.startsWith("http") ? p.instagram : `https://instagram.com/${p.instagram.replace(/^@/, "")}`) : null;

  const skillsTotal = (p.hard?.length ?? 0) + (p.soft?.length ?? 0) + (p.ferramentas?.length ?? 0) + (p.linguagens?.length ?? 0);
  const whats = p.telefone ? p.telefone.replace(/\D/g, "") : null;
  const falarHref = ehAgente ? `/expand/equipe/${id}?t=chat` : whats ? `https://wa.me/${whats}` : p.email ? `mailto:${p.email}` : `/expand/equipe/${id}?t=chat`;
  const falarLabel = ehAgente ? `💬 Conversar com ${p.nome}` : `💬 Falar com ${p.nome}`;
  const falarExterno = !ehAgente && (!!whats || !!p.email);

  const TABS: { k: string; l: string }[] = [
    { k: "visao", l: "Visão geral" },
    { k: "skills", l: "Skills & trajetória" },
    { k: "metodologia", l: "Metodologia" },
    { k: "processos", l: "Processos" },
    { k: "arquivos", l: `Arquivos${arquivos.length ? ` (${arquivos.length})` : ""}` },
    { k: "avaliacoes", l: `Avaliações${avaliacoes.length ? ` (${avaliacoes.length})` : ""}` },
    { k: "feedback", l: `1x1${feedbacks.length ? ` (${feedbacks.length})` : ""}` },
    { k: "chat", l: ehAgente ? "Conversar" : "Assistente" },
  ];

  return (
    <>
      <Link href="/expand/equipe" className="ex-back">← Voltar ao time</Link>

      {/* HERO */}
      <div className="ex-panel hx-glass" style={{ padding: 0, marginBottom: 14, overflow: "hidden" }}>
        <div style={{ height: 76, background: `linear-gradient(120deg, color-mix(in srgb, ${cor} 34%, transparent), transparent 70%)` }} />
        <div style={{ display: "flex", gap: 18, padding: "0 22px 18px", marginTop: -46, flexWrap: "wrap" }}>
          <div style={{ border: "4px solid var(--panel)", borderRadius: 20, flexShrink: 0 }}><PerfilAvatar p={p} size={110} radius={16} /></div>
          <div style={{ flex: 1, minWidth: 240, paddingTop: 52 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "var(--serif)", fontSize: 25, fontWeight: 600 }}>{p.nome}</h1>
              <span className="ex-pill" style={{ background: `color-mix(in srgb, ${cor} 16%, transparent)`, color: cor }}><i className="ex-dot" />{ehAgente ? "Agente de IA" : "Humano"}</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href={`/expand/equipe/${id}/conhecimento`} className="hx-btn hx-btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>{ehAgente ? "Conhecimento & RAG" : "Base de conhecimento"}</Link>
                {podeEditar ? <Link href={`/expand/equipe/${id}/editar`} className="hx-btn hx-btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>Editar</Link> : null}
              </div>
            </div>
            <p style={{ color: "var(--accent)", fontSize: 13.5, fontWeight: 600, marginTop: 3 }}>{p.cargo}{p.area ? ` · ${p.area}` : ""}</p>
            {p.bio ? <p style={{ color: "var(--mut)", fontSize: 13.5, marginTop: 10, lineHeight: 1.6, maxWidth: 720 }}>{p.bio}</p> : null}
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 14 }}>
              {p.aniversario ? <div className="ex-fact"><span className="fi">🎂</span> <span>Aniversário <b>{fmtDia(p.aniversario)}</b></span></div> : null}
              {p.pais ? <div className="ex-fact"><span className="fi">📍</span> <b>{p.pais}</b></div> : null}
              {p.idade ? <div className="ex-fact"><span className="fi">⏳</span> <b>{p.idade} anos</b></div> : null}
              {p.email ? <div className="ex-fact"><span className="fi">✉</span> <b>{p.email}</b></div> : null}
              {p.telefone ? <a className="ex-fact" href={`https://wa.me/${p.telefone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><span className="fi">💬</span> <b>WhatsApp</b></a> : null}
              {instaUrl ? <a className="ex-fact" href={instaUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><span className="fi">📸</span> <b>Instagram</b></a> : null}
              {p.linkedin ? <a className="ex-fact" href={p.linkedin} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}><span className="fi" style={{ fontSize: 10, fontWeight: 800 }}>in</span> <b>LinkedIn</b></a> : null}
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="ex-chips" style={{ marginBottom: 16 }}>
        {TABS.map((x) => <Link key={x.k} href={`/expand/equipe/${id}?t=${x.k}`} className={`ex-chip2${tab === x.k ? " on" : ""}`}>{x.l}</Link>)}
      </div>

      {/* ---------- VISÃO GERAL ---------- */}
      {tab === "visao" ? (
        <>
          <div className="ex-kpis" style={{ marginBottom: 16 }}>
            <div className="ex-kpi hx-glass"><div className="lab">Nota geral</div><div className="val hx-accent-text">{p.nota ?? "—"}</div><div className="foot">Média das avaliações</div></div>
            <div className="ex-kpi hx-glass"><div className="lab">Trabalhos</div><div className="val">{p.trabalhos ?? 0}</div><div className="foot">Entregas realizadas</div></div>
            <div className="ex-kpi hx-glass"><div className="lab">Skills mapeadas</div><div className="val">{skillsTotal}</div><div className="foot">Hard + soft + ferramentas</div></div>
            <div className="ex-kpi hx-glass"><div className="lab">1x1</div><div className="val">{feedbacks.length}</div><div className="foot">Registros com o superior</div></div>
          </div>
          {/* PERFIL COMPORTAMENTAL — DISC + Temperamentos */}
          <div className="ex-panel hx-glass" style={{ padding: 0, marginBottom: 16 }}>
            <div className="ph"><span className="pt">Perfil comportamental</span><span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>DISC + Arquétipo (Henrique)</span></div>
            <div className="pb">
              {comport ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 11.5, fontWeight: 700, textAlign: "center", color: "var(--mut)", marginBottom: 2 }}>DISC · <span style={{ color: cor }}>{comport.discSegmento}</span></p>
                      <Radar cor={cor} eixos={[{ l: "D", v: comport.disc.D / 15 }, { l: "I", v: comport.disc.I / 15 }, { l: "S", v: comport.disc.S / 15 }, { l: "C", v: comport.disc.C / 15 }]} />
                      <p style={{ fontSize: 12, textAlign: "center", marginTop: 2, fontWeight: 600 }}>{comport.discNome}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11.5, fontWeight: 700, textAlign: "center", color: "var(--mut)", marginBottom: 8 }}>Arquétipo {arq ? <>· <span style={{ color: "var(--accent-2)" }}>{arq.dominanteNome}</span></> : null}</p>
                      {arq ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {arq.top.slice(0, 5).map((a) => (
                            <div key={a.k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, color: "var(--mut)", width: 80, flexShrink: 0 }}>{a.nome}</span>
                              <div style={{ flex: 1, height: 7, borderRadius: 4, background: "var(--panel-2)", overflow: "hidden" }}><div style={{ height: "100%", width: `${(a.v / 5) * 100}%`, background: a.cor, borderRadius: 4 }} /></div>
                              <span style={{ fontSize: 10, color: "var(--dim)", width: 26, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{a.v.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p style={{ fontSize: 11.5, color: "var(--dim)", textAlign: "center" }}>Sem teste de arquétipo ainda.</p>}
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid var(--line)", marginTop: 10, paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55 }}><b style={{ color: cor }}>DISC:</b> {comport.discDesc}</p>
                    {arq ? <><p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55 }}><b style={{ color: "var(--accent-2)" }}>Arquétipo ({arq.segmento}):</b> {arq.desc}</p>
                    <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55, borderLeft: "2px solid var(--green)", paddingLeft: 9 }}><b style={{ color: "var(--green)" }}>Como lidar nas tarefas:</b> {arq.comoLidar}</p></> : null}
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
                      <Link href={`/expand/equipe/${id}/comportamental`} className="hx-btn hx-btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>Relatório completo / PDF ↗</Link>
                      {podeEditar ? <Link href={`/expand/equipe/${id}/diagnostico`} style={{ color: "var(--accent)", fontSize: 12 }}>refazer diagnóstico</Link> : null}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "18px 0" }}>
                  <p style={{ fontSize: 13, color: "var(--mut)", marginBottom: 12 }}>Ainda sem diagnóstico comportamental de {p.nome}.</p>
                  {podeEditar ? <Link href={`/expand/equipe/${id}/diagnostico`} className="hx-btn hx-btn-primary">{ehAgente ? "Preencher (IA) / iniciar" : "Preencher diagnóstico"}</Link> : <span style={{ fontSize: 12, color: "var(--dim)" }}>Aguardando {p.nome} preencher.</span>}
                </div>
              )}
            </div>
          </div>

          {/* PRODUTIVIDADE — heatmap + eficiência por área (humanos) */}
          {prod && heat ? (
            <div className="ex-panel hx-glass" style={{ padding: 0, marginBottom: 16 }}>
              <div className="ph"><span className="pt">Produtividade</span><span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>últimas 14 semanas · alimenta o squad do PMO</span></div>
              <div className="pb">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, marginBottom: 14 }}>
                  <div className="ex-kpi hx-glass" style={{ background: "var(--panel-2)" }}><div className="lab">Concluídas</div><div className="val hx-accent-text" style={{ fontSize: 22 }}>{prod.concluidas}</div><div className="foot">no histórico</div></div>
                  <div className="ex-kpi hx-glass" style={{ background: "var(--panel-2)" }}><div className="lab">Em aberto</div><div className="val" style={{ fontSize: 22 }}>{prod.abertas}</div><div className="foot">{prod.bloqueadas} bloqueada(s)</div></div>
                  <div className="ex-kpi hx-glass" style={{ background: "var(--panel-2)" }}><div className="lab">No prazo</div><div className="val" style={{ fontSize: 22, color: prod.taxaPrazo == null ? "var(--dim)" : prod.taxaPrazo >= 0.7 ? "var(--green)" : "var(--warn)" }}>{prod.taxaPrazo == null ? "—" : `${Math.round(prod.taxaPrazo * 100)}%`}</div><div className="foot">{prod.comTempo ? `de ${prod.comTempo} c/ tempo` : "sem tempo ainda"}</div></div>
                  <div className="ex-kpi hx-glass" style={{ background: "var(--panel-2)" }}><div className="lab">Eficiência</div><div className="val" style={{ fontSize: 22, color: cor }}>{prod.eficiencia}</div><div className="foot">índice p/ o squad</div></div>
                </div>
                <div style={{ marginBottom: heat.total ? 6 : 0 }}><Heatmap cols={heat.cols} max={heat.max} cor={cor} /></div>
                {heat.total === 0 ? <p style={{ fontSize: 11, color: "var(--dim)", marginBottom: 6 }}>O heatmap vai preencher conforme as tarefas forem concluídas com data (contador ao vivo).</p> : null}
                {prod.porArea.length ? (
                  <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Eficiência por área — onde rende mais</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {prod.porArea.slice(0, 6).map((a) => (
                        <div key={a.area} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 12, color: "var(--mut)", width: 130, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.area}</span>
                          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--panel-2)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${a.taxa != null ? Math.round(a.taxa * 100) : Math.min(100, a.concluidas * 8)}%`, background: cor, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 11, color: "var(--dim)", width: 84, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{a.concluidas} feita(s){a.taxa != null ? ` · ${Math.round(a.taxa * 100)}%` : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="ex-panel hx-glass" style={{ padding: 0 }}>
            <div className="ph"><span className="pt">Evolução das notas</span></div>
            <div className="pb">
              <Barras cor={cor} dados={[...avaliacoes].reverse().slice(-8).map((a) => ({ v: a.nota ?? 0, l: a.periodo?.slice(0, 6) ?? fmtCurto(a.data) }))} />
            </div>
          </div>
          {/* DISPONIBILIDADE — feriados & folgas (opcional; cada PJ escolhe) */}
          {!ehAgente ? (
            <div className="ex-panel hx-glass" style={{ padding: 0, marginTop: 16 }}>
              <div className="ph"><span className="pt">🗓️ Disponibilidade — feriados & folgas</span><span style={{ marginLeft: "auto", fontSize: 11, color: "var(--dim)" }}>opcional · o PMO evita alocar nesses dias</span></div>
              <div className="pb">
                <p style={{ fontSize: 11.5, color: "var(--mut)", lineHeight: 1.5, marginBottom: 10 }}>Como PJ, você escolhe quais feriados observa. Marque os que vai tirar (e dias pessoais) — o PMO não agenda tarefas para você nesses dias.</p>
                {feriados.length ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Próximos feriados</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {feriados.map((f) => {
                        const marcado = folgaSet.has(f.data);
                        return podeEditar ? (
                          <form key={f.id} action={marcarFolga}>
                            <input type="hidden" name="perfilId" value={id} /><input type="hidden" name="data" value={f.data} /><input type="hidden" name="motivo" value={f.nome} />
                            <button type="submit" disabled={marcado} title={marcado ? "já marcado" : "marcar folga"} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, border: `1px solid ${marcado ? "var(--green)" : "var(--line-2)"}`, background: marcado ? "color-mix(in srgb, var(--green) 12%, transparent)" : "var(--panel-2)", color: marcado ? "var(--green)" : "var(--mut)", cursor: marcado ? "default" : "pointer", fontSize: 11.5, fontFamily: "inherit" }}>
                              {marcado ? "✓" : "+"} {new Date(f.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} {f.nome}{f.escopo === "facultativo" ? " (fac.)" : f.escopo === "local" ? " (local)" : ""}
                            </button>
                          </form>
                        ) : (
                          <span key={f.id} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--panel-2)", color: marcado ? "var(--green)" : "var(--dim)", fontSize: 11.5 }}>{marcado ? "✓ " : ""}{new Date(f.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} {f.nome}</span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {folgas.length ? (
                  <div style={{ marginBottom: podeEditar ? 12 : 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Minhas folgas</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {folgas.map((f) => (
                        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--mut)" }}>
                          <span style={{ color: "var(--accent)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{new Date(f.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                          <span>{f.motivo ?? "folga"}</span>
                          {podeEditar ? <form action={removerFolga} style={{ marginLeft: "auto" }}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="perfilId" value={id} /><button type="submit" className="ex-arqbtn no" style={{ padding: "2px 8px", fontSize: 10.5 }}>remover</button></form> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {podeEditar ? (
                  <form action={marcarFolga} style={{ display: "flex", gap: 6, alignItems: "end", flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                    <input type="hidden" name="perfilId" value={id} />
                    <label><span style={lb}>Adicionar dia pessoal</span><input type="date" name="data" required style={fld} /></label>
                    <label style={{ flex: 1, minWidth: 120 }}><span style={lb}>Motivo</span><input name="motivo" placeholder="ex.: viagem, feriado local" style={fld} /></label>
                    <button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "7px 12px", fontSize: 12 }}>Adicionar</button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : null}

          {p.tipo !== "agente" ? (
            <div className="ex-panel hx-glass" style={{ padding: 0, marginTop: 16 }}>
              <div className="ph"><span className="pt">📅 Conectar meu calendário</span></div>
              <div className="pb">
                <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 8, lineHeight: 1.5 }}>Copie o link e adicione no Google/Apple Calendar (Adicionar por URL). Suas tarefas agendadas passam a aparecer na sua agenda, atualizando sozinho.</p>
                {icsUrl ? <><code style={{ display: "block", fontSize: 11, color: "var(--accent)", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "8px 10px", wordBreak: "break-all" }}>{icsUrl}</code>{!site ? <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 6 }}>A URL fica completa (com o domínio) após a publicação da plataforma. O Google OAuth de duas vias entra nessa fase.</p> : null}</> : <span style={{ fontSize: 12, color: "var(--dim)" }}>Link indisponível.</span>}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ---------- SKILLS & TRAJETÓRIA ---------- */}
      {tab === "skills" ? (
        <div className="ex-two">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {p.hard?.length ? <Sec titulo="Hard skills — habilidades"><Chips arr={p.hard} /></Sec> : null}
            {p.soft?.length ? <Sec titulo="Soft skills"><Chips arr={p.soft} /></Sec> : null}
            {p.ferramentas?.length ? <Sec titulo="Ferramentas"><Chips arr={p.ferramentas} /></Sec> : null}
            {p.linguagens?.length ? <Sec titulo="Linguagens"><Chips arr={p.linguagens} /></Sec> : null}
            {p.interesses?.length ? <Sec titulo="Gostos & interesses"><Chips arr={p.interesses} /></Sec> : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {p.experiencia?.length ? (
              <Sec titulo="Experiência">{p.experiencia.map((e, i) => (
                <div key={i} className="ex-exp">
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}><span className="eo">{e.org}</span>{e.periodo ? <span className="ep">{e.periodo}</span> : null}</div>
                  {e.cargo ? <div style={{ fontSize: 12, color: "var(--mut)", fontWeight: 600 }}>{e.cargo}</div> : null}
                  {e.desc ? <div className="ec">{e.desc}</div> : null}
                </div>))}
              </Sec>
            ) : null}
            {p.formacao?.length ? (
              <Sec titulo="Formação">{p.formacao.map((f, i) => (
                <div key={i} className="ex-exp">
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}><span className="eo">{f.inst}</span>{f.ano ? <span className="ep">{f.ano}</span> : null}</div>
                  {f.curso ? <div className="ec">{f.curso}</div> : null}
                </div>))}
              </Sec>
            ) : null}
            {p.portfolio_url ? <Sec titulo="Portfólio"><a href={p.portfolio_url} target="_blank" rel="noreferrer" className="ex-skill" style={{ color: "var(--accent)" }}>{p.portfolio_label ?? p.portfolio_url}</a></Sec> : null}
            {ehAgente && p.prompt ? <Sec titulo="O que penso / instrução"><div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.prompt}</div></Sec> : null}
          </div>
        </div>
      ) : null}

      {/* ---------- METODOLOGIA ---------- */}
      {tab === "metodologia" ? (
        <Sec titulo="Metodologia" extra={podeEditar ? <Link href={`/expand/equipe/${id}/editar`} style={{ fontSize: 11.5, color: "var(--accent)" }}>editar</Link> : null}>
          {p.metodologia ? (
            <div style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{p.metodologia}</div>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>
              Ainda sem metodologia registrada para {p.nome}.{ehAgente ? " Descreva aqui o método/framework que este agente segue — o que o torna consistente e vendável." : ""} {podeEditar ? <Link href={`/expand/equipe/${id}/editar`} style={{ color: "var(--accent)" }}>preencher</Link> : null}
            </p>
          )}
        </Sec>
      ) : null}

      {/* ---------- PROCESSOS ---------- */}
      {tab === "processos" ? (
        <Sec titulo="Processos" extra={podeEditar ? <Link href={`/expand/equipe/${id}/editar`} style={{ fontSize: 11.5, color: "var(--accent)" }}>editar</Link> : null}>
          {p.processos?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {p.processos.map((pr, i) => (
                <div key={i}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: `color-mix(in srgb, ${cor} 18%, transparent)`, color: cor, fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center", flexShrink: 0 }}>{i + 1}</span>
                    {pr.t}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingLeft: 30 }}>
                    {pr.passos.map((s, j) => (
                      <div key={j} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5 }}>
                        <span style={{ color: cor, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{i + 1}.{j + 1}</span> {s}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>
              Ainda sem processos mapeados para {p.nome}. Liste os passos que {ehAgente ? "este agente" : "esta pessoa"} executa — vira o roteiro replicável do trabalho. {podeEditar ? <Link href={`/expand/equipe/${id}/editar`} style={{ color: "var(--accent)" }}>preencher</Link> : null}
            </p>
          )}
        </Sec>
      ) : null}

      {/* ---------- ARQUIVOS ---------- */}
      {tab === "arquivos" ? (
        <Sec titulo="Arquivos" extra={<Link href={`/expand/equipe/${id}/conhecimento`} style={{ fontSize: 11.5, color: "var(--accent)" }}>{ehAgente ? "gerenciar RAG →" : "gerenciar →"}</Link>}>
          <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55, marginBottom: 12 }}>Materiais e referências {ehAgente ? "que alimentam a base de conhecimento (RAG) deste agente" : "da base de conhecimento"}. Anexe novos pela página de {ehAgente ? "Conhecimento & RAG" : "conhecimento"}.</p>
          {arquivos.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {arquivos.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{/\.pdf$/i.test(a.arquivo_nome ?? "") ? "📕" : /\.(xlsx|csv|numbers)$/i.test(a.arquivo_nome ?? "") ? "📊" : /\.(pptx?|key)$/i.test(a.arquivo_nome ?? "") ? "📽️" : /\.(png|jpe?g|webp|gif)$/i.test(a.arquivo_nome ?? "") ? "🖼️" : "📄"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.8, fontWeight: 600, color: "var(--txt)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.titulo ?? a.arquivo_nome}</div>
                    <div style={{ fontSize: 11, color: "var(--dim)" }}>{a.tipo ?? "arquivo"}{a.fonte ? ` · ${a.fonte}` : ""}</div>
                  </div>
                  {assinado[a.id] ? <a href={assinado[a.id]} target="_blank" rel="noreferrer" className="hx-btn hx-btn-ghost" style={{ padding: "5px 11px", fontSize: 11.5, flexShrink: 0 }}>Abrir ↗</a> : <span style={{ fontSize: 11, color: "var(--dim)", flexShrink: 0 }}>indisponível</span>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--dim)" }}>Nenhum arquivo anexado ainda. <Link href={`/expand/equipe/${id}/conhecimento`} style={{ color: "var(--accent)" }}>Anexar material</Link>.</p>
          )}
        </Sec>
      ) : null}

      {/* ---------- AVALIAÇÕES ---------- */}
      {tab === "avaliacoes" ? (
        <Sec titulo="Notas de avaliação" extra={<span style={{ fontSize: 11.5, color: "var(--dim)" }}>{avaliacoes.length} registro(s)</span>}>
          {avaliacoes.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {avaliacoes.map((a) => (
                <div key={a.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div className="ex-evn">{a.nota ?? "—"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{a.periodo ?? "Avaliação"} <span style={{ color: "var(--dim)", fontWeight: 400, fontSize: 11 }}>· {fmtData(a.data)}{a.avaliador ? ` · por ${a.avaliador}` : ""}</span></div>
                    {a.destaques ? <div style={{ fontSize: 12.2, color: "var(--mut)", marginTop: 3, lineHeight: 1.5 }}><b style={{ color: "var(--green)" }}>Destaques:</b> {a.destaques}</div> : null}
                    {a.a_melhorar ? <div style={{ fontSize: 12.2, color: "var(--mut)", marginTop: 2, lineHeight: 1.5 }}><b style={{ color: "var(--warn)" }}>A melhorar:</b> {a.a_melhorar}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ fontSize: 12.5, color: "var(--dim)" }}>Nenhuma avaliação registrada ainda.</p>}
          {podeAvaliar ? (
            <details style={{ marginTop: 14 }}>
              <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>+ Registrar avaliação</summary>
              <form action={addAvaliacao} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: 10, marginTop: 10 }}>
                <input type="hidden" name="perfil_id" value={id} />
                <label><span style={lb}>Nota</span><input name="nota" type="number" step="0.1" min="0" max="10" style={fld} /></label>
                <label><span style={lb}>Período</span><input name="periodo" placeholder="ex.: Ago/2026" style={fld} /></label>
                <label><span style={lb}>Avaliador</span><input name="avaliador" style={fld} /></label>
                <label style={{ gridColumn: "1 / -1" }}><span style={lb}>Destaques</span><input name="destaques" style={fld} /></label>
                <label style={{ gridColumn: "1 / -1" }}><span style={lb}>A melhorar</span><input name="a_melhorar" style={fld} /></label>
                <div><button className="hx-btn hx-btn-primary" type="submit">Salvar avaliação</button></div>
              </form>
            </details>
          ) : null}
        </Sec>
      ) : null}

      {/* ---------- 1x1 ---------- */}
      {tab === "feedback" ? (
        <Sec titulo="Feedback 1x1" extra={<span style={{ fontSize: 11.5, color: "var(--dim)" }}>mediação: Humberto</span>}>
          <p style={{ fontSize: 12, color: "var(--mut)", lineHeight: 1.55, marginBottom: 12 }}>Os 1x1 são mediados pelo <b>Humberto</b> — feedback honesto e anônimo — no fim de cada projeto, no pulso trimestral ou quando o gestor pede. Cada encontro tem um <b>objetivo</b> claro pra pessoa saber pra que foi chamada.</p>
          {feedbacks.length ? (
            <div className="ex-tl" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {feedbacks.map((f) => {
                const agendado = f.status === "agendado";
                return (
                  <div key={f.id} style={{ position: "relative" }}>
                    <span className="tldot" style={agendado ? { background: "var(--warn)" } : undefined} />
                    <div style={{ fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {fmtData(f.data)}
                      {agendado ? <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--warn) 16%, transparent)", color: "var(--warn)" }}>Agendado</span> : null}
                      {f.origem ? <span style={{ color: "var(--dim)", fontWeight: 400 }}>{ORIGEM_1X1[f.origem] ?? f.origem}</span> : null}
                      {f.mediador ? <span style={{ color: "var(--dim)", fontWeight: 400 }}>· mediador {f.mediador}</span> : null}
                      {f.humor ? <span className="ex-pill" style={{ background: "var(--panel-2)", color: "var(--mut)" }}>{f.humor}</span> : null}
                    </div>
                    {f.objetivo ? <div style={{ fontSize: 12.5, color: "var(--txt)", marginTop: 4, lineHeight: 1.5, borderLeft: "2px solid var(--accent)", paddingLeft: 9 }}><b style={{ color: "var(--accent)" }}>Objetivo:</b> {f.objetivo}</div> : null}
                    {f.destaques ? <div style={{ fontSize: 12.2, color: "var(--mut)", marginTop: 4, lineHeight: 1.5 }}><b style={{ color: "var(--green)" }}>Destaques:</b> {f.destaques}</div> : null}
                    {f.atencao ? <div style={{ fontSize: 12.2, color: "var(--mut)", marginTop: 2, lineHeight: 1.5 }}><b style={{ color: "var(--warn)" }}>Atenção:</b> {f.atencao}</div> : null}
                    {f.acordos ? <div style={{ fontSize: 12.2, color: "var(--mut)", marginTop: 2, lineHeight: 1.5 }}><b style={{ color: "var(--accent)" }}>Combinados:</b> {f.acordos}</div> : null}
                  </div>
                );
              })}
            </div>
          ) : <p style={{ fontSize: 12.5, color: "var(--dim)" }}>Nenhum 1x1 registrado ou agendado ainda.</p>}
          {podeAvaliar ? (
            <details style={{ marginTop: 14 }}>
              <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>+ Agendar / registrar 1x1</summary>
              <form action={addFeedback} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <input type="hidden" name="perfil_id" value={id} />
                <label><span style={lb}>Status</span><select name="status" defaultValue="agendado" style={fld}><option value="agendado">Agendar (futuro)</option><option value="realizado">Já realizado</option></select></label>
                <label><span style={lb}>Data</span><input name="data" type="date" style={fld} /></label>
                <label style={{ gridColumn: "1 / -1" }}><span style={lb}>Objetivo do 1x1 (a pessoa vê isso)</span><input name="objetivo" placeholder="ex.: Entender como foi o projeto X e o que melhorar" style={fld} /></label>
                <label><span style={lb}>Origem</span><select name="origem" defaultValue="fim-de-projeto" style={fld}><option value="fim-de-projeto">Fim de projeto (debriefing)</option><option value="trimestral">Pulso trimestral</option><option value="solicitado">Solicitado pelo gestor</option></select></label>
                <label><span style={lb}>Mediador</span><input name="mediador" defaultValue="Humberto" style={fld} /></label>
                <label><span style={lb}>Como está (humor)</span><input name="humor" placeholder="ex.: Motivado, Sobrecarregado…" style={fld} /></label>
                <label><span style={lb}>Superior presente</span><input name="superior" style={fld} /></label>
                <label style={{ gridColumn: "1 / -1" }}><span style={lb}>Destaques</span><input name="destaques" style={fld} /></label>
                <label style={{ gridColumn: "1 / -1" }}><span style={lb}>Pontos de atenção</span><input name="atencao" style={fld} /></label>
                <label style={{ gridColumn: "1 / -1" }}><span style={lb}>Combinados / próximos passos</span><input name="acordos" style={fld} /></label>
                <div><button className="hx-btn hx-btn-primary" type="submit">Salvar</button></div>
              </form>
            </details>
          ) : null}
        </Sec>
      ) : null}

      {/* ---------- CHAT / ASSISTENTE ---------- */}
      {tab === "chat" ? (
        <>
          {!ehAgente ? <p className="ex-sub" style={{ marginTop: -4 }}>Este é o <b>assistente de IA de {p.nome}</b> — ajuda com as atividades dela usando o RAG e o trabalho atual. Para falar com a pessoa, use o botão flutuante.</p> : null}
          <AgenteChat id={p.id} nome={p.nome} cor={cor} tipo={p.tipo} memoriaHref={`/expand/equipe/${p.id}/conhecimento`} />
        </>
      ) : null}

      {/* FLOATING — falar com a pessoa (humano) ou conversar (agente) */}
      <a href={falarHref} {...(falarExterno ? { target: "_blank", rel: "noreferrer" } : {})}
        style={{ position: "fixed", right: 24, bottom: 92, zIndex: 40, display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 30, background: cor, color: "#0A1512", fontWeight: 800, fontSize: 13, textDecoration: "none", boxShadow: `0 8px 26px color-mix(in srgb, ${cor} 40%, transparent)` }}>
        {falarLabel}
      </a>
    </>
  );
}
