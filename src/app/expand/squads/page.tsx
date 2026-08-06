import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import PerfilAvatar from "@/components/expand/PerfilAvatar";

export const dynamic = "force-dynamic";

type Emb = { nome: string; cargo: string | null; cor: string | null; tipo: string; foto_url: string | null };
type Sq = { id: string; funcao: string | null; lider: boolean; perfil_id: string; expand_perfis: Emb | Emb[] | null };

async function addMembro(formData: FormData) {
  "use server";
  const cliente_id = String(formData.get("cliente_id") ?? "");
  const perfil_id = String(formData.get("perfil_id") ?? "");
  if (!cliente_id || !perfil_id) return;
  const supabase = await createClient();
  await supabase.from("expand_squad_membros").insert({
    cliente_id, perfil_id,
    funcao: String(formData.get("funcao") ?? "").trim() || null,
    lider: formData.get("lider") === "on",
  });
  revalidatePath("/expand/squads");
}
async function removeMembro(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("expand_squad_membros").delete().eq("id", id);
  revalidatePath("/expand/squads");
}

export default async function Squads({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: cData } = await supabase.from("expand_clientes").select("id, nome, segmento, maturidade").eq("ativo", true).order("nome");
  const clientes = (cData ?? []) as { id: string; nome: string; segmento: string | null; maturidade: string | null }[];
  const sel = clientes.find((c) => c.id === sp.c) ?? clientes[0];

  if (!sel) return (<><p className="hx-eyebrow">Squads</p><h1 className="ex-h1">Squads por projeto</h1><p className="ex-sub">Nenhuma conta ativa.</p></>);

  const { data: sqData } = await supabase.from("expand_squad_membros")
    .select("id, funcao, lider, perfil_id, expand_perfis(nome, cargo, cor, tipo, foto_url)")
    .eq("cliente_id", sel.id).order("lider", { ascending: false }).order("ordem");
  const squad = (sqData ?? []) as Sq[];
  const { data: pData } = await supabase.from("expand_perfis").select("id, nome, cargo, tipo").order("ordem");
  const perfis = (pData ?? []) as { id: string; nome: string; cargo: string | null; tipo: string }[];
  const naSquad = new Set(squad.map((s) => s.perfil_id));
  const disponiveis = perfis.filter((p) => !naSquad.has(p.id));

  return (
    <>
      <p className="hx-eyebrow">Squad do projeto</p>
      <h1 className="ex-h1">Squads por <span className="hx-accent-text">projeto</span></h1>
      <p className="ex-sub">A agência tem o organograma padrão, mas cada projeto monta a sua squad — com as pessoas e as funções que fizerem sentido ali. Edite livremente e, com o tempo, compare quais arranjos dão melhor resultado.</p>

      <div className="ex-chips">
        {clientes.map((c) => <Link key={c.id} href={`/expand/squads?c=${c.id}`} className={`ex-chip2${c.id === sel.id ? " on" : ""}`}>{c.nome}</Link>)}
      </div>

      <div className="ex-kpis" style={{ marginBottom: 16 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Projeto</div><div className="val" style={{ fontSize: 18 }}>{sel.nome}</div><div className="foot">{sel.segmento}</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Na squad</div><div className="val hx-accent-text">{squad.length}</div><div className="foot">Pessoas + agentes</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Maturidade</div><div className="val" style={{ fontSize: 16 }}>{sel.maturidade}</div><div className="foot">Fase da conta</div></div>
      </div>

      <div className="ex-grph"><span className="gt">O time deste projeto</span><span className="gc">{squad.length}</span><span className="gl" /></div>
      {squad.length === 0 ? <p style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 14 }}>Squad ainda não montada. Adicione os membros abaixo.</p> : (
        <div className="ex-squad" style={{ marginBottom: 16 }}>
          {squad.map((s) => {
            const pf = (Array.isArray(s.expand_perfis) ? s.expand_perfis[0] : s.expand_perfis) as Emb | undefined;
            if (!pf) return null;
            return (
              <div key={s.id} className="ex-squadcard hx-glass" style={{ ["--sc" as string]: pf.cor ?? "var(--accent)" }}>
                <PerfilAvatar p={{ foto_url: pf.foto_url, cor: pf.cor, tipo: pf.tipo, nome: pf.nome }} size={40} radius={11} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>{pf.nome}{s.lider ? <span className="ex-pill" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}>Líder</span> : null}</div>
                  <div className="fn">{s.funcao || pf.cargo}</div>
                  <div style={{ fontSize: 10.5, color: "var(--dim)" }}>{pf.tipo === "agente" ? "Agente de IA" : "Humano"}</div>
                </div>
                <form action={removeMembro} className="rm"><input type="hidden" name="id" value={s.id} /><button className="ex-arqbtn no" type="submit" title="Remover da squad">✕</button></form>
              </div>
            );
          })}
        </div>
      )}

      <div className="ex-panel hx-glass">
        <div className="ph"><span className="pt">Adicionar à squad</span></div>
        <form action={addMembro} className="pb" style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <input type="hidden" name="cliente_id" value={sel.id} />
          <label className="ex-fld" style={{ marginBottom: 0 }}><span>Pessoa / agente</span>
            <select name="perfil_id" required>{disponiveis.map((p) => <option key={p.id} value={p.id}>{p.nome} · {p.cargo}{p.tipo === "agente" ? " (IA)" : ""}</option>)}</select>
          </label>
          <label className="ex-fld" style={{ marginBottom: 0 }}><span>Função neste projeto</span><input name="funcao" placeholder="ex.: Roteiro, Tráfego, Edição…" /></label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--mut)" }}><input type="checkbox" name="lider" /> Líder</label>
            <button className="hx-btn hx-btn-primary" type="submit">Adicionar</button>
          </div>
        </form>
      </div>
    </>
  );
}
