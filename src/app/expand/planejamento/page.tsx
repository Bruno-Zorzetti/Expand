import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPessoa, type Pessoa } from "@/lib/expand-user";
import { getAcesso } from "@/lib/expand-acesso";
import { AREAS } from "@/lib/expand-esteira";
import { agendarEtapa } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

type Et = {
  id: string;
  titulo: string;
  area: string | null;
  responsavel: string | null;
  responsavel_atual: string | null;
  sla: string | null;
  status: string;
  marco: boolean;
  data_prevista: string | null;
  cliente_id: string;
  iniciada_em: string | null;
};
type Vista = "dia" | "semana" | "mes";
type Cli = { id: string; nome: string };

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s?: string) => {
  const d = s ? new Date(s + "T00:00:00") : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// ── Event card – compact (week/month cell) ─────────────────────────────────
function EventChip({ e, nomeCli }: { e: Et; nomeCli: Map<string, string> }) {
  const ar = e.area ? AREAS[e.area] : null;
  const cor = e.marco ? "var(--accent)" : ar ? ar.cor : "var(--dim)";
  const running = e.status === "run";
  return (
    <Link
      href={`/expand/etapa/${e.id}`}
      style={{
        display: "block",
        borderLeft: `3px solid ${cor}`,
        background: running ? `color-mix(in srgb,${cor} 14%,var(--panel-2))` : "var(--panel-2)",
        borderRadius: "0 4px 4px 0",
        padding: "3px 5px",
        marginBottom: 3,
        fontSize: 11,
        lineHeight: 1.3,
        color: "var(--txt)",
        textDecoration: "none",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
      }}
      title={`${e.marco ? "◆ " : ""}${e.titulo} — ${nomeCli.get(e.cliente_id) ?? "?"}`}
    >
      {running && <span style={{ color: cor, marginRight: 3, fontSize: 9 }}>●</span>}
      {e.marco && <span style={{ color: "var(--accent)", marginRight: 2 }}>◆</span>}
      <span>{e.titulo}</span>
    </Link>
  );
}

// ── Event card – full (day view / sem-data) ────────────────────────────────
function EventCard({ e, nomeCli }: { e: Et; nomeCli: Map<string, string> }) {
  const ar = e.area ? AREAS[e.area] : null;
  const cor = e.marco ? "var(--accent)" : ar ? ar.cor : "var(--dim)";
  const running = e.status === "run";
  const inp: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--line-2,var(--line))",
    borderRadius: 6,
    color: "var(--txt)",
    padding: "5px 7px",
    fontSize: 12,
    outline: "none",
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--panel-2)",
        border: `1px solid var(--line)`,
        borderLeft: `4px solid ${cor}`,
        borderRadius: "0 8px 8px 0",
        padding: "10px 12px",
        marginBottom: 6,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          href={`/expand/etapa/${e.id}`}
          style={{ color: "var(--txt)", textDecoration: "none", fontWeight: 600, fontSize: 13 }}
        >
          {running && <span style={{ color: cor, marginRight: 4 }}>●</span>}
          {e.marco && <span style={{ color: "var(--accent)", marginRight: 4 }}>◆</span>}
          {e.titulo}
        </Link>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>
          {nomeCli.get(e.cliente_id) ?? "—"}
          {ar ? ` · ${ar.n}` : ""}
          {e.sla ? ` · SLA ${e.sla}` : ""}
          {running ? " · em execução" : " · na fila"}
        </div>
      </div>
      <form action={agendarEtapa} style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <input type="hidden" name="etapaId" value={e.id} />
        <input type="date" name="data" defaultValue={e.data_prevista ?? ""} style={inp} />
        <button
          type="submit"
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "5px 9px",
            fontSize: 11,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          OK
        </button>
      </form>
      {e.data_prevista && (
        <form action={agendarEtapa}>
          <input type="hidden" name="etapaId" value={e.id} />
          <input type="hidden" name="data" value="" />
          <button
            type="submit"
            style={{
              background: "transparent",
              color: "var(--dim)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: "5px 7px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </form>
      )}
    </div>
  );
}

export default async function Planejamento({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; d?: string; c?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const vista: Vista = sp.v === "dia" || sp.v === "mes" ? sp.v : "semana";
  const anchor = parse(sp.d);
  const hojeS = ymd(new Date());

  const { pessoa, equipe } = await getPessoa();
  const { isAdmin } = await getAcesso();
  const supabase = await createClient();

  // Seleção de membro (admin pode ver qualquer um)
  const membroId = isAdmin && sp.m && equipe.some((e) => e.id === sp.m) ? sp.m : pessoa.id;
  const membroAtivo: Pessoa =
    equipe.find((e) => e.id === membroId) ?? pessoa;

  // Clientes
  const { data: cData } = await supabase
    .from("expand_clientes")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  const clientes = (cData ?? []) as Cli[];
  const nomeCli = new Map(clientes.map((c) => [c.id, c.nome]));
  const filtroCli = sp.c && clientes.some((c) => c.id === sp.c) ? sp.c : "";

  // Tarefas do membro
  let q = supabase
    .from("expand_etapas")
    .select(
      "id, titulo, area, responsavel, responsavel_atual, sla, status, marco, data_prevista, cliente_id, iniciada_em"
    )
    .in("status", ["run", "idle"])
    .or(
      `responsavel_atual.ilike.%${membroAtivo.nome}%,responsavel.ilike.%${membroAtivo.nome}%`
    );
  if (filtroCli) q = q.eq("cliente_id", filtroCli);
  const { data: etData } = await q.order("data_prevista", { nullsFirst: false });
  const etapas = (etData ?? []) as Et[];

  // Período
  let ini: Date, fim: Date, gridDias: Date[] = [];
  if (vista === "dia") {
    ini = anchor;
    fim = addDays(anchor, 1);
    gridDias = [anchor];
  } else if (vista === "semana") {
    ini = monday(anchor);
    fim = addDays(ini, 7);
    gridDias = Array.from({ length: 7 }, (_, i) => addDays(ini, i));
  } else {
    ini = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    fim = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    const g0 = monday(ini);
    gridDias = Array.from({ length: 42 }, (_, i) => addDays(g0, i));
  }
  const iniS = ymd(ini), fimS = ymd(fim);

  const noPeriodo = etapas.filter(
    (e) => e.data_prevista && e.data_prevista >= iniS && e.data_prevista < fimS
  );
  const semData = etapas.filter((e) => !e.data_prevista);
  const doDia = (d: Date) =>
    etapas.filter((e) => e.data_prevista === ymd(d));

  // Navegação
  const passo = (dir: number) =>
    vista === "dia"
      ? ymd(addDays(anchor, dir))
      : vista === "semana"
      ? ymd(addDays(anchor, dir * 7))
      : ymd(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));

  const label =
    vista === "dia"
      ? anchor.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", weekday: "long" })
      : vista === "semana"
      ? `${ini.getDate()}–${addDays(ini, 6).getDate()} de ${MESES[addDays(ini, 6).getMonth()]}`
      : `${MESES[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const qs = (o: { v?: string; d?: string; c?: string; m?: string }) => {
    const p = new URLSearchParams();
    const vv = o.v ?? vista;
    if (vv !== "semana") p.set("v", vv);
    if (o.d && o.d !== hojeS) p.set("d", o.d);
    const cc = "c" in o ? o.c : filtroCli;
    if (cc) p.set("c", cc);
    const mm = "m" in o ? o.m : (isAdmin ? membroId : undefined);
    if (mm && mm !== pessoa.id) p.set("m", mm);
    const s = p.toString();
    return `/expand/planejamento${s ? `?${s}` : ""}`;
  };

  const btnCls: React.CSSProperties = {
    background: "var(--panel-2)",
    border: "1px solid var(--line)",
    borderRadius: 7,
    color: "var(--txt)",
    fontSize: 12,
    padding: "5px 10px",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    lineHeight: 1,
    fontWeight: 500,
  };
  const chipAct: React.CSSProperties = {
    background: "color-mix(in srgb,var(--accent) 16%,transparent)",
    borderColor: "var(--accent)",
    color: "var(--accent)",
  };

  return (
    <>
      <style>{`
        .cal-grid-semana {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          overflow-x: auto;
          min-width: 560px;
        }
        .cal-grid-mes {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 4px;
          overflow-x: auto;
          min-width: 560px;
        }
        .cal-day-col {
          border-radius: 10px;
          border: 1px solid var(--line);
          background: var(--bg);
          min-height: 100px;
          overflow: hidden;
        }
        .cal-day-col.hoje {
          border-color: var(--accent);
          box-shadow: 0 0 0 1px var(--accent);
        }
        .cal-day-head {
          padding: 6px 8px 5px;
          border-bottom: 1px solid var(--line);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .04em;
          color: var(--dim);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
        }
        .cal-day-head .num {
          font-size: 16px;
          font-weight: 800;
          color: var(--txt);
          line-height: 1;
        }
        .cal-day-col.hoje .cal-day-head .num {
          color: var(--accent);
        }
        .cal-day-body {
          padding: 6px;
        }
        .cal-mes-cell {
          border-radius: 8px;
          border: 1px solid var(--line);
          background: var(--bg);
          min-height: 90px;
          padding: 4px;
          cursor: pointer;
        }
        .cal-mes-cell.hoje { border-color: var(--accent); }
        .cal-mes-cell.out-mes { opacity: 0.35; background: transparent; border-color: transparent; }
        .cal-mes-datenum {
          font-size: 11px;
          font-weight: 700;
          color: var(--dim);
          margin-bottom: 3px;
          display: block;
          text-decoration: none;
        }
        .cal-mes-cell.hoje .cal-mes-datenum { color: var(--accent); }
        @media (max-width: 800px) {
          .cal-grid-semana { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      `}</style>

      <p className="hx-eyebrow">Calendário · {membroAtivo.nome}</p>
      <h1 className="ex-h1">Agenda <span className="hx-accent-text">pessoal</span></h1>

      {/* Seletor de membro (admin only) */}
      {isAdmin && equipe.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {equipe.map((m) => (
            <Link
              key={m.id}
              href={qs({ m: m.id })}
              style={{
                ...btnCls,
                ...(membroId === m.id ? chipAct : {}),
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: membroId === m.id ? "var(--accent)" : "var(--panel-2)",
                  border: "1px solid var(--line)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 800,
                  color: membroId === m.id ? "#fff" : "var(--txt)",
                  flexShrink: 0,
                }}
              >
                {m.ini}
              </span>
              {m.nome}
            </Link>
          ))}
        </div>
      )}

      {/* Controles de navegação */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        {/* Abas de vista */}
        <div style={{ display: "flex", gap: 0, background: "var(--panel-2)", borderRadius: 8, border: "1px solid var(--line)", padding: 2 }}>
          {(["dia", "semana", "mes"] as Vista[]).map((v, i) => (
            <Link
              key={v}
              href={qs({ v })}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: 6,
                textDecoration: "none",
                color: vista === v ? "#fff" : "var(--dim)",
                background: vista === v ? "var(--accent)" : "transparent",
                transition: "background .15s",
              }}
            >
              {["Dia", "Semana", "Mês"][i]}
            </Link>
          ))}
        </div>

        {/* Seta prev */}
        <Link href={qs({ d: passo(-1) })} style={btnCls}>‹</Link>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            minWidth: 140,
            textAlign: "center",
            textTransform: "capitalize",
          }}
        >
          {label}
        </span>
        {/* Seta next */}
        <Link href={qs({ d: passo(1) })} style={btnCls}>›</Link>
        <Link href={qs({ d: hojeS })} style={{ ...btnCls, fontSize: 11.5, color: "var(--accent)", borderColor: "var(--accent)" }}>
          Hoje
        </Link>

        <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--dim)" }}>
          {noPeriodo.length} no período
          {semData.length > 0 && ` · ${semData.length} sem data`}
        </span>
      </div>

      {/* Filtro de cliente */}
      <div className="ex-chips" style={{ marginBottom: 14, gap: 4 }}>
        <Link href={qs({ c: "" })} style={{ ...btnCls, ...(filtroCli === "" ? chipAct : {}), fontSize: 11 }}>
          Todos
        </Link>
        {clientes.map((c) => (
          <Link
            key={c.id}
            href={qs({ c: c.id })}
            style={{ ...btnCls, ...(filtroCli === c.id ? chipAct : {}), fontSize: 11 }}
          >
            {c.nome}
          </Link>
        ))}
      </div>

      {/* ── SEMANA ────────────────────────────────────── */}
      {vista === "semana" && (
        <div className="cal-grid-semana">
          {gridDias.map((d, i) => {
            const ds = ymd(d);
            const its = doDia(d);
            const hoje = ds === hojeS;
            return (
              <div key={ds} className={`cal-day-col${hoje ? " hoje" : ""}`}>
                <div className="cal-day-head">
                  <span style={{ color: hoje ? "var(--accent)" : undefined }}>{DIAS[i]}</span>
                  <Link
                    href={qs({ v: "dia", d: ds })}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span className="num">{d.getDate()}</span>
                  </Link>
                </div>
                <div className="cal-day-body">
                  {its.length === 0 && (
                    <div style={{ fontSize: 10.5, color: "var(--dim)", padding: "2px 0" }}>—</div>
                  )}
                  {its.map((e) => (
                    <EventChip key={e.id} e={e} nomeCli={nomeCli} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MÊS ──────────────────────────────────────── */}
      {vista === "mes" && (
        <div>
          {/* Cabeçalho de dias da semana */}
          <div className="cal-grid-mes" style={{ marginBottom: 2 }}>
            {DIAS.map((d) => (
              <div
                key={d}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  color: "var(--dim)",
                  textAlign: "center",
                  padding: "2px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="cal-grid-mes">
            {gridDias.map((d) => {
              const ds = ymd(d);
              const outMes = d.getMonth() !== anchor.getMonth();
              const its = doDia(d);
              const hoje = ds === hojeS;
              return (
                <div key={ds} className={`cal-mes-cell${hoje ? " hoje" : ""}${outMes ? " out-mes" : ""}`}>
                  <Link href={qs({ v: "dia", d: ds })} className="cal-mes-datenum">
                    {d.getDate()}
                  </Link>
                  {its.slice(0, 3).map((e) => (
                    <EventChip key={e.id} e={e} nomeCli={nomeCli} />
                  ))}
                  {its.length > 3 && (
                    <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>
                      +{its.length - 3} mais
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DIA ──────────────────────────────────────── */}
      {vista === "dia" && (
        <div>
          {noPeriodo.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--dim)",
                fontSize: 13,
                padding: "40px 0",
                border: "1px dashed var(--line)",
                borderRadius: 12,
              }}
            >
              Nenhuma tarefa agendada para este dia.
            </div>
          ) : (
            noPeriodo.map((e) => <EventCard key={e.id} e={e} nomeCli={nomeCli} />)
          )}
        </div>
      )}

      {/* ── SEM DATA ─────────────────────────────────── */}
      {semData.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              borderTop: "1px solid var(--line)",
              paddingTop: 20,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--warn)" }}>
              A agendar
            </span>
            <span
              style={{
                background: "color-mix(in srgb,var(--warn) 20%,transparent)",
                color: "var(--warn)",
                borderRadius: 20,
                padding: "1px 8px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {semData.length}
            </span>
          </div>
          {semData.map((e) => (
            <EventCard key={e.id} e={e} nomeCli={nomeCli} />
          ))}
        </div>
      )}
    </>
  );
}
