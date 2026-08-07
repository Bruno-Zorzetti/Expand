import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LogRow = { id: string; cliente_id: string | null; etapa_id: string | null; tipo: string; autor: string | null; detalhe: string | null; criado_em: string };

const TIPO_COR: Record<string, string> = {
  upload: "var(--accent)", link: "var(--accent)", aprovacao: "var(--green)", ajuste: "var(--warn)",
  iniciar: "var(--accent)", concluir: "var(--green)", transferir: "var(--accent-2)", chamado: "var(--warn)",
  bloqueio: "var(--red)", edicao: "var(--dim)", remocao: "var(--red)",
};
const TIPOS = ["upload", "link", "aprovacao", "ajuste", "iniciar", "concluir", "transferir", "chamado", "bloqueio", "edicao", "remocao"];

export default async function LogSistema({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("expand_log").select("*").order("criado_em", { ascending: false }).limit(250);
  if (sp.t) q = q.eq("tipo", sp.t);
  const { data } = await q;
  const logs = (data ?? []) as LogRow[];
  const { data: cData } = await supabase.from("expand_clientes").select("id, nome");
  const cliMap = new Map((cData ?? []).map((c) => [c.id as string, c.nome as string]));

  const hoje = logs.filter((l) => new Date(l.criado_em).toDateString() === new Date().toDateString()).length;

  return (
    <>
      <p className="hx-eyebrow">Sistema · auditoria</p>
      <h1 className="ex-h1">Log de <span className="hx-accent-text">atividades</span></h1>
      <p className="ex-sub">Tudo o que acontece na operação, para acompanhar e melhorar processos. Cada upload, aprovação, início, conclusão, transferência, chamado e bloqueio fica registrado aqui.</p>

      <div className="ex-kpis" style={{ marginBottom: 14 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Registros</div><div className="val hx-accent-text">{logs.length}</div><div className="foot">Últimos eventos</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Hoje</div><div className="val">{hoje}</div><div className="foot">Ações no dia</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Pessoas ativas</div><div className="val">{new Set(logs.map((l) => l.autor).filter(Boolean)).size}</div><div className="foot">Autores no período</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Contas tocadas</div><div className="val">{new Set(logs.map((l) => l.cliente_id).filter(Boolean)).size}</div><div className="foot">Clientes com atividade</div></div>
      </div>

      <div className="ex-chips" style={{ marginBottom: 16 }}>
        <Link href="/expand/log" className={`ex-chip2${!sp.t ? " on" : ""}`}>Tudo</Link>
        {TIPOS.map((t) => <Link key={t} href={`/expand/log?t=${t}`} className={`ex-chip2${sp.t === t ? " on" : ""}`}>{t}</Link>)}
      </div>

      <div className="ex-panel hx-glass">
        <div className="pb" style={{ paddingTop: 14 }}>
          {logs.length ? logs.map((l) => (
            <div key={l.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span className="ex-pill" style={{ background: `color-mix(in srgb, ${TIPO_COR[l.tipo] ?? "var(--dim)"} 15%, transparent)`, color: TIPO_COR[l.tipo] ?? "var(--dim)", minWidth: 78, textAlign: "center" }}>{l.tipo}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.8 }}>{l.detalhe}{l.etapa_id ? <Link href={`/expand/etapa/${l.etapa_id}`} style={{ color: "var(--accent)", marginLeft: 8, fontSize: 11 }}>ver tarefa ↗</Link> : null}</div>
                <div style={{ fontSize: 10.5, color: "var(--dim)" }}>{new Date(l.criado_em).toLocaleString("pt-BR")}{l.autor ? ` · ${l.autor}` : ""}{l.cliente_id && cliMap.get(l.cliente_id) ? ` · ${cliMap.get(l.cliente_id)}` : ""}</div>
              </div>
            </div>
          )) : <span style={{ fontSize: 12.5, color: "var(--dim)" }}>Nenhum registro ainda.</span>}
        </div>
      </div>
    </>
  );
}
