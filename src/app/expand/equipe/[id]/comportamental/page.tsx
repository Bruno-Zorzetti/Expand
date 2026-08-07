import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/expand-perfis";
import { montarResultado, harmonia, TEMP_NOME, TEMP_DESC, type DiscKey, type TempKey } from "@/lib/expand-disc";
import PerfilAvatar from "@/components/expand/PerfilAvatar";
import BotaoPdf from "@/components/expand/BotaoPdf";

export const dynamic = "force-dynamic";

type Diag = { id: string; criado_em: string; disc_segmento: string | null; temp_segmento: string | null };

function Radar({ eixos, cor }: { eixos: { l: string; v: number }[]; cor: string }) {
  const N = eixos.length, cx = 108, cy = 104, R = 74;
  const pt = (i: number, r: number) => { const a = (-90 + (i * 360) / N) * (Math.PI / 180); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const poly = eixos.map((e, i) => pt(i, R * Math.max(0.08, Math.min(1, e.v))).join(",")).join(" ");
  return (
    <svg viewBox="0 0 216 208" style={{ width: "100%", maxWidth: 230, margin: "0 auto", display: "block" }}>
      {[0.33, 0.66, 1].map((rr, k) => <polygon key={k} points={eixos.map((_, i) => pt(i, R * rr).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth={1} />)}
      {eixos.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} />; })}
      <polygon points={poly} fill={`color-mix(in srgb, ${cor} 26%, transparent)`} stroke={cor} strokeWidth={2} />
      {eixos.map((e, i) => { const [x, y] = pt(i, R + 14); return <text key={i} x={x} y={y} fill="var(--mut)" fontSize={8.5} textAnchor="middle" dominantBaseline="middle">{e.l}</text>; })}
    </svg>
  );
}

export default async function Comportamental({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("expand_perfis").select("*").eq("id", id).single();
  if (!data) notFound();
  const p = data as Perfil;
  if (!p.disc || !p.temperamentos) {
    return (<><Link href={`/expand/equipe/${id}`} className="ex-back">← Voltar</Link><p className="ex-sub">Sem diagnóstico ainda. Preencha em <Link href={`/expand/equipe/${id}/diagnostico`} style={{ color: "var(--accent)" }}>Diagnóstico</Link>.</p></>);
  }
  const r = montarResultado(p.disc as Record<DiscKey, number>, p.temperamentos as Record<TempKey, number>);
  const cor = p.cor ?? "var(--accent)";
  const tempPrimario = (Object.entries(p.temperamentos) as [TempKey, number][]).sort((a, b) => b[1] - a[1])[0][0];

  const { data: hData } = await supabase.from("expand_diagnosticos").select("id, criado_em, disc_segmento, temp_segmento").eq("perfil_id", id).order("criado_em", { ascending: false }).limit(12);
  const hist = (hData ?? []) as Diag[];

  return (
    <>
      <div className="no-print"><Link href={`/expand/equipe/${id}`} className="ex-back">← Voltar ao perfil</Link></div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
        <PerfilAvatar p={p} size={64} radius={14} />
        <div style={{ flex: 1 }}>
          <p className="hx-eyebrow">Relatório comportamental</p>
          <h1 className="ex-h1" style={{ margin: 0 }}>{p.nome}</h1>
          <p style={{ fontSize: 12.5, color: "var(--mut)" }}>{p.cargo}{p.area ? ` · ${p.area}` : ""} · gerado em {new Date().toLocaleDateString("pt-BR")}</p>
        </div>
        <BotaoPdf />
      </div>

      <div className="ex-two" style={{ marginBottom: 16 }}>
        <div className="ex-panel hx-glass" style={{ padding: 0 }}>
          <div className="ph"><span className="pt">DISC · {r.discSegmento}</span></div>
          <div className="pb">
            <Radar cor={cor} eixos={[{ l: "D", v: r.disc.D / 15 }, { l: "I", v: r.disc.I / 15 }, { l: "S", v: r.disc.S / 15 }, { l: "C", v: r.disc.C / 15 }]} />
            <p style={{ fontSize: 13, fontWeight: 700, textAlign: "center", marginTop: 4 }}>{r.discNome}</p>
            <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, marginTop: 8 }}>{r.discDesc}</p>
          </div>
        </div>
        <div className="ex-panel hx-glass" style={{ padding: 0 }}>
          <div className="ph"><span className="pt">Temperamento</span></div>
          <div className="pb">
            <Radar cor="var(--accent-2)" eixos={[{ l: "Sang", v: r.temperamentos.sanguineo / 10 }, { l: "Col", v: r.temperamentos.colerico / 10 }, { l: "Mel", v: r.temperamentos.melancolico / 10 }, { l: "Fleu", v: r.temperamentos.fleumatico / 10 }]} />
            <p style={{ fontSize: 13, fontWeight: 700, textAlign: "center", marginTop: 4 }}>{r.tempNome}</p>
            <p style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6, marginTop: 8 }}>{r.tempDesc}</p>
          </div>
        </div>
      </div>

      <div className="ex-panel hx-glass" style={{ padding: 0, marginBottom: 16 }}>
        <div className="ph"><span className="pt">Como {p.nome} trabalha em harmonia</span><span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--dim)" }}>tratativas por temperamento</span></div>
        <div className="pb" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(["sanguineo", "colerico", "melancolico", "fleumatico"] as TempKey[]).map((t) => (
            <div key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 96, fontSize: 12, fontWeight: 700, color: "var(--accent-2)" }}>com {TEMP_NOME[t]}</div>
              <div style={{ flex: 1, fontSize: 12.2, color: "var(--mut)", lineHeight: 1.5 }}>{harmonia(tempPrimario, t)}</div>
            </div>
          ))}
          <p style={{ fontSize: 11.5, color: "var(--dim)", borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 2 }}>{TEMP_NOME[tempPrimario]}: {TEMP_DESC[tempPrimario]}</p>
        </div>
      </div>

      <div className="ex-panel hx-glass" style={{ padding: 0 }}>
        <div className="ph"><span className="pt">Evolução</span><span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--dim)" }}>{hist.length} preenchimento(s)</span></div>
        <div className="pb">
          {hist.length ? hist.map((h) => (
            <div key={h.id} style={{ display: "flex", gap: 12, fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ color: "var(--dim)", minWidth: 90 }}>{new Date(h.criado_em).toLocaleDateString("pt-BR")}</span>
              <span>DISC <b style={{ color: cor }}>{h.disc_segmento}</b></span>
              <span style={{ color: "var(--dim)" }}>· temperamento {h.temp_segmento}</span>
            </div>
          )) : <p style={{ fontSize: 12.5, color: "var(--dim)" }}>Primeiro preenchimento. Refazendo o diagnóstico ao longo do tempo, a evolução aparece aqui.</p>}
        </div>
      </div>
    </>
  );
}
