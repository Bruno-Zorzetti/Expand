import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FASES } from "@/lib/expand-esteira";
import { faseDoCliente, type EtapaRow } from "@/lib/expand-tarefas";
import { TRACK } from "@/lib/expand-gov";

export const dynamic = "force-dynamic";

type Arq = { id: string; etapa_id: string; nome: string; url: string | null; tipo: string | null; status: string | null; criado_em: string | null };

// Histórico navegável: o cliente percorre as 10 etapas da jornada e vê tudo
// que já foi produzido e entregue em cada uma.
export default async function Historico({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  const { id } = await params;
  const { e } = await searchParams;
  const supabase = await createClient();

  const { data: cli } = await supabase.from("expand_cliente_publico").select("nome, maturidade").eq("id", id).single();
  const { data: etData } = await supabase.from("expand_etapas").select("*").eq("cliente_id", id).order("ordem");
  const etapas = ((etData ?? []) as EtapaRow[]).filter((x) => x.visivel_cliente);

  let faseAtual: number;
  const run = etapas.filter((x) => x.status === "run").map((x) => x.fase);
  faseAtual = run.length ? Math.min(...run) : etapas.length && etapas.every((x) => x.status === "done") ? 15 : faseDoCliente(cli?.maturidade ?? null);

  // etapa selecionada (1..10) — por padrão a que está em andamento
  const idxAtual = Math.max(0, TRACK.findIndex((s, i) => faseAtual > (i ? TRACK[i - 1].ate : 0) && faseAtual <= s.ate));
  const sel = Math.min(TRACK.length, Math.max(1, parseInt(e ?? String(idxAtual + 1), 10) || idxAtual + 1));
  const passo = TRACK[sel - 1];
  const de = sel > 1 ? TRACK[sel - 2].ate : 0;
  const ate = passo.ate;

  const daEtapa = etapas.filter((x) => x.fase > de && x.fase <= ate);
  const ids = daEtapa.map((x) => x.id);
  let arquivos: Arq[] = [];
  if (ids.length) {
    const { data: aData } = await supabase.from("expand_arquivos").select("id, etapa_id, nome, url, tipo, status, criado_em").in("etapa_id", ids).order("criado_em");
    arquivos = (aData ?? []) as Arq[];
  }
  const porEtapa = new Map<string, Arq[]>();
  for (const a of arquivos) { const arr = porEtapa.get(a.etapa_id) ?? []; arr.push(a); porEtapa.set(a.etapa_id, arr); }

  const feitas = daEtapa.filter((x) => x.status === "done").length;
  const fasesNome = FASES.filter((f) => f.id > de && f.id <= ate).map((f) => f.nome).join(" · ");
  const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }) : "");

  const ST: Record<string, { l: string; c: string; i: string }> = {
    done: { l: "entregue", c: "var(--green)", i: "✓" },
    run: { l: "em produção", c: "var(--warn)", i: "◐" },
    idle: { l: "a fazer", c: "var(--dim)", i: "○" },
    block: { l: "bloqueado", c: "var(--red)", i: "!" },
  };

  return (
    <>
      <div className="ex-hero">
        <div className="eb">Histórico da jornada</div>
        <h2>Tudo que já fizemos por você</h2>
        <p>Clique em cada etapa para ver o que foi produzido e entregue ao longo do contrato.</p>
      </div>

      {/* Trilha clicável 1 → 10 */}
      <div className="ex-track" style={{ marginBottom: 20 }}>
        {TRACK.map((s, i) => {
          const st = faseAtual > s.ate ? "done" : faseAtual > (i ? TRACK[i - 1].ate : 0) ? "now" : "";
          const on = i + 1 === sel;
          return (
            <Link key={s.l} href={`/portal/${id}/historico?e=${i + 1}`} scroll={false} className={`ex-st ${st}`}
              style={{ textDecoration: "none", color: "inherit", outline: on ? "2px solid var(--accent)" : "none", outlineOffset: 3, borderRadius: 10 }}>
              <i>{st === "done" ? "✓" : i + 1}</i>
              <div className="l" style={{ color: on ? "var(--accent)" : undefined, fontWeight: on ? 700 : undefined }}>{s.l}</div>
            </Link>
          );
        })}
      </div>

      <div className="hx-glass" style={{ borderRadius: 14, padding: "16px 18px", marginBottom: 16, borderLeft: "4px solid var(--accent)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", fontWeight: 700 }}>Etapa {sel} de {TRACK.length}</span>
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{passo.l}</h3>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--mut)" }}>{feitas} de {daEtapa.length} {daEtapa.length === 1 ? "entrega concluída" : "entregas concluídas"}</span>
        </div>
        {fasesNome ? <p style={{ fontSize: 12.5, color: "var(--mut)", margin: "6px 0 0", lineHeight: 1.5 }}>{fasesNome}</p> : null}
      </div>

      {daEtapa.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {daEtapa.map((x) => {
            const st = ST[x.status ?? "idle"] ?? ST.idle;
            const arqs = porEtapa.get(x.id) ?? [];
            return (
              <div key={x.id} className="hx-glass" style={{ borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${st.c}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${st.c} 15%, transparent)`, color: st.c, fontSize: 15, flexShrink: 0 }}>{st.i}</div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{x.titulo}</div>
                    <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{st.l}{x.concluida_em ? ` · ${dt(x.concluida_em)}` : ""}{arqs.length ? ` · ${arqs.length} ${arqs.length > 1 ? "materiais" : "material"}` : ""}</div>
                  </div>
                </div>
                {arqs.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                    {arqs.map((a) => a.url ? (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="hx-btn hx-btn-ghost" style={{ padding: "6px 12px", fontSize: 12, textDecoration: "none" }}>
                        {a.tipo === "link" ? "🔗" : "📄"} {a.nome} {a.status === "aprovado" ? <span style={{ color: "var(--green)", marginLeft: 4 }}>✓</span> : null}
                      </a>
                    ) : (
                      <span key={a.id} style={{ fontSize: 12, color: "var(--mut)", padding: "6px 10px" }}>{a.nome}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="hx-glass" style={{ borderRadius: 12, padding: "28px 24px", textAlign: "center" }}>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>Esta etapa ainda não começou.</p>
          <p style={{ color: "var(--mut)", fontSize: 13 }}>Quando chegarmos aqui, tudo que for produzido aparece nesta página.</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, gap: 10 }}>
        {sel > 1 ? <Link href={`/portal/${id}/historico?e=${sel - 1}`} scroll={false} className="hx-btn hx-btn-ghost" style={{ textDecoration: "none" }}>← {TRACK[sel - 2].l}</Link> : <span />}
        {sel < TRACK.length ? <Link href={`/portal/${id}/historico?e=${sel + 1}`} scroll={false} className="hx-btn hx-btn-ghost" style={{ textDecoration: "none" }}>{TRACK[sel].l} →</Link> : <span />}
      </div>
    </>
  );
}
