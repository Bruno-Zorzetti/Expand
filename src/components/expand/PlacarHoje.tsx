"use client";

import { useState } from "react";
import {
  calc, doDia, xpDia, metaDia, xpMax, streak, xpTotal, nivel,
  iso, dtFromIso, addDias, ehUtil, DIAABR, type Plano, type Reg,
} from "@/lib/expand-comercial-game";

export default function PlacarHoje({ jogador, jogadorNome, plano, reg, setMissao }: {
  jogador: string; jogadorNome: string; plano: Plano; reg: Reg; setMissao: (fd: FormData) => Promise<void>;
}) {
  const [regLocal, setReg] = useState<Reg>(reg);
  const [dia, setDia] = useState<string>(iso(new Date()));
  const C = calc(plano);

  async function mudar(missao: string, valor: number) {
    const v = Math.max(0, valor);
    setReg((r) => ({ ...r, [dia]: { ...(r[dia] || {}), [missao]: v } }));
    const fd = new FormData();
    fd.set("jogador", jogador); fd.set("dia", dia); fd.set("missao", missao); fd.set("valor", String(v));
    await setMissao(fd);
  }

  const d = dtFromIso(dia), wd = d.getDay(), util = ehUtil(dia);
  const missoesDia = doDia(jogador, wd, C);
  const xpH = xpDia(jogador, dia, C, regLocal);
  const metaH = metaDia(jogador, wd, C);
  const maxH = xpMax(jogador, wd, C);
  const seq = streak(jogador, C, regLocal);
  const xpAcc = xpTotal(jogador, C, regLocal);
  const lvl = nivel(xpAcc);
  const okDia = util && xpH >= metaH;
  const pct = metaH > 0 ? Math.min(100, (xpH / metaH) * 100) : 0;
  const ehHoje = dia === iso(new Date());

  return (
    <>
      <div className="cg-score">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--accent)", fontWeight: 700, marginBottom: 6 }}>Placar de {jogadorNome} · Nível {lvl.i}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 25, fontWeight: 600, color: "var(--accent-2)", lineHeight: 1.15 }}>{!util ? "Dia de descanso" : okDia ? "Meta batida" : `Faltam ${Math.max(0, metaH - xpH)} XP`}</div>
            <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 6 }}>{lvl.nome}{lvl.prox ? ` · faltam ${lvl.prox - xpAcc} XP para ${lvl.proxNome}` : " · nível máximo"}</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div className="cg-chip"><div className="cv">{xpH}</div><div className="cl">XP do dia</div></div>
            <div className="cg-chip"><div className="cv" style={{ color: "var(--warn)" }}>{seq}🔥</div><div className="cl">Sequência</div></div>
            <div className="cg-chip"><div className="cv" style={{ fontSize: 14, fontFamily: "var(--serif)", paddingTop: 4 }}>{lvl.nome}</div><div className="cl">Nível</div></div>
          </div>
        </div>
        <div className={`cg-xpbar${okDia ? " done" : ""}`} style={{ marginTop: 20 }}><i style={{ width: `${pct}%` }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11.5, color: "var(--mut)" }}><span>{xpH} XP</span><span>meta do dia <b style={{ color: "var(--accent-2)" }}>{metaH}</b> · máx {maxH}</span></div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-2)" }}>{DIAABR[wd]} · {dtFromIso(dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</span>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          <button onClick={() => setDia(addDias(dia, -1))} className="ex-arqbtn">←</button>
          {!ehHoje ? <button onClick={() => setDia(iso(new Date()))} className="ex-arqbtn">Hoje</button> : null}
          <button onClick={() => setDia(addDias(dia, 1))} className="ex-arqbtn">→</button>
        </div>
      </div>

      {missoesDia.length === 0 ? <div className="hx-glass" style={{ padding: "20px 22px", color: "var(--mut)", fontSize: 13 }}>Sem missões para este dia. 🌴</div> : null}
      {missoesDia.map((m) => {
        const v = regLocal[dia]?.[m.id] || 0;
        const done = m.tipo === "check" ? v >= 1 : v >= (m.alvo ?? 1);
        return (
          <div key={m.id} className={`cg-mis${done ? " ok" : ""}`} style={{ ["--mc" as string]: m.c }}>
            <div style={{ flex: 1, minWidth: 190 }}>
              <div className="mt">{m.t}{done ? <span style={{ color: "var(--green)", fontWeight: 900 }}>✓</span> : null}<span className="mxp">{m.xp} XP{m.tipo === "ctr" ? "/un" : ""}</span></div>
              <div className="md">{m.d}</div>
              {m.tipo === "ctr" && m.alvo ? <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 3 }}>Meta do dia: {m.alvo}</div> : null}
            </div>
            {m.tipo === "check" ? (
              <button className={`cg-chk${done ? " on" : ""}`} onClick={() => mudar(m.id, done ? 0 : 1)}>{done ? "✓" : ""}</button>
            ) : (
              <div className="cg-ctr">
                <button onClick={() => mudar(m.id, v - 1)}>−</button>
                <span className="cv">{v}<small>/{m.alvo}</small></span>
                <button onClick={() => mudar(m.id, v + 1)}>+</button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
