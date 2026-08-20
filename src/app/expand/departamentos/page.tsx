import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/expand-acesso";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

type Depto = {
  id: string; nome: string; descricao: string | null; regras: string | null;
  cor: string | null; whatsapp_grupo: string | null; whatsapp_link: string | null;
  responsavel_id: string | null; criado_em: string;
};

async function salvarDepto(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = await createClient();
  const id = String(formData.get("id") ?? "").trim();
  const payload = {
    nome: String(formData.get("nome") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    regras: String(formData.get("regras") ?? "").trim() || null,
    cor: String(formData.get("cor") ?? "#C89B5E").trim(),
    whatsapp_grupo: String(formData.get("whatsapp_grupo") ?? "").trim() || null,
    whatsapp_link: String(formData.get("whatsapp_link") ?? "").trim() || null,
    responsavel_id: String(formData.get("responsavel_id") ?? "").trim() || null,
  };
  if (id) {
    await sb.from("expand_departamentos").update(payload).eq("id", id);
  } else {
    await sb.from("expand_departamentos").insert(payload);
  }
  revalidatePath("/expand/departamentos");
}

async function excluirDepto(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await sb.from("expand_departamentos").delete().eq("id", id);
  revalidatePath("/expand/departamentos");
}

const fld: React.CSSProperties = { width: "100%", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "7px 10px", fontSize: 13, outline: "none", fontFamily: "inherit" };
const lb: React.CSSProperties = { display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", fontWeight: 700, marginBottom: 4 };

export default async function Departamentos() {
  await exigirAdmin();
  const sb = await createClient();

  const { data: deptos } = await sb.from("expand_departamentos").select("*").order("nome");
  const { data: perfisData } = await sb.from("expand_perfis").select("id, nome, tipo").eq("tipo", "humano");

  const lista = (deptos ?? []) as Depto[];
  const perfis = (perfisData ?? []) as { id: string; nome: string; tipo: string }[];

  return (
    <>
      <p className="hx-eyebrow">Configurações · Organização</p>
      <h1 className="ex-h1">Departamentos <span className="hx-accent-text">da equipe</span></h1>
      <p className="ex-sub">
        Cada departamento tem nome, descrição, regras de operação e um grupo do WhatsApp para receber os relatórios automáticos.
        Atribua o departamento de cada pessoa na edição do perfil.
      </p>

      {/* KPIs */}
      <div className="ex-kpis" style={{ marginBottom: 22 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Departamentos</div><div className="val hx-accent-text">{lista.length}</div><div className="foot">Configurados</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Com WhatsApp</div><div className="val">{lista.filter(d => d.whatsapp_link).length}</div><div className="foot">Grupo configurado</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Com regras</div><div className="val">{lista.filter(d => d.regras).length}</div><div className="foot">Normas definidas</div></div>
      </div>

      {/* Lista de departamentos */}
      {lista.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {lista.map((d) => (
            <details key={d.id} className="hx-glass" style={{ borderRadius: 12, borderLeft: `3px solid ${d.cor ?? "var(--accent)"}`, overflow: "hidden" }}>
              <summary style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", listStyle: "none" }}>
                <span className="hx-icon-tile" style={{ width: 36, height: 36, flexShrink: 0, ["--accent" as string]: d.cor ?? "var(--accent)", ["--accent-2" as string]: d.cor ?? "var(--accent-2)" }}>
                  <Icon name="building" size={16} className="hx-icon-glow" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{d.nome}</div>
                  {d.descricao && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{d.descricao}</div>}
                </div>
                {d.whatsapp_link && (
                  <a href={d.whatsapp_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--green)", textDecoration: "none" }}>
                    <Icon name="whatsapp" size={13} />
                    Grupo
                  </a>
                )}
                <span style={{ fontSize: 11, color: "var(--dim)" }}>▾</span>
              </summary>

              <div style={{ padding: "0 18px 18px", borderTop: "1px solid var(--line)" }}>
                {d.regras && (
                  <div style={{ marginTop: 14, padding: "12px 14px", background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderRadius: 8, borderLeft: "2px solid var(--accent)" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--accent)", marginBottom: 6 }}>Regras</p>
                    <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.6, whiteSpace: "pre-line" }}>{d.regras}</p>
                  </div>
                )}

                {/* Formulário de edição */}
                <form action={salvarDepto} style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <input type="hidden" name="id" value={d.id} />
                  <div><label style={lb}>Nome</label><input name="nome" defaultValue={d.nome} required style={fld} /></div>
                  <div><label style={lb}>Cor (hex)</label><input name="cor" defaultValue={d.cor ?? "#C89B5E"} style={fld} /></div>
                  <div style={{ gridColumn: "1/-1" }}><label style={lb}>Descrição</label><input name="descricao" defaultValue={d.descricao ?? ""} style={fld} /></div>
                  <div style={{ gridColumn: "1/-1" }}><label style={lb}>Regras de operação</label><textarea name="regras" defaultValue={d.regras ?? ""} rows={4} style={{ ...fld, resize: "vertical" }} /></div>
                  <div><label style={lb}>Grupo WhatsApp (nome)</label><input name="whatsapp_grupo" defaultValue={d.whatsapp_grupo ?? ""} placeholder="ex: Equipe Entrega" style={fld} /></div>
                  <div><label style={lb}>Link do grupo</label><input name="whatsapp_link" defaultValue={d.whatsapp_link ?? ""} placeholder="https://chat.whatsapp.com/..." style={fld} /></div>
                  <div><label style={lb}>Responsável</label>
                    <select name="responsavel_id" defaultValue={d.responsavel_id ?? ""} style={fld}>
                      <option value="">— Sem responsável —</option>
                      {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                    <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 12.5 }}>Salvar</button>
                    <form action={excluirDepto}>
                      <input type="hidden" name="id" value={d.id} />
                      <button className="hx-btn hx-btn-ghost" type="submit" style={{ fontSize: 12.5, color: "var(--red)" }}>Excluir</button>
                    </form>
                  </div>
                </form>
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Formulário de novo departamento */}
      <div className="hx-glass" style={{ borderRadius: 12, padding: "20px 22px" }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: "var(--accent)" }}>+ Novo departamento</p>
        <form action={salvarDepto} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input type="hidden" name="id" value="" />
          <div><label style={lb}>Nome *</label><input name="nome" required placeholder="ex: Entrega, Comercial…" style={fld} /></div>
          <div><label style={lb}>Cor (hex)</label><input name="cor" defaultValue="#C89B5E" style={fld} /></div>
          <div style={{ gridColumn: "1/-1" }}><label style={lb}>Descrição breve</label><input name="descricao" placeholder="O que esse departamento faz" style={fld} /></div>
          <div style={{ gridColumn: "1/-1" }}><label style={lb}>Regras de operação</label><textarea name="regras" rows={4} placeholder="Normas, SLAs e compromissos do departamento" style={{ ...fld, resize: "vertical" }} /></div>
          <div><label style={lb}>Grupo WhatsApp (nome)</label><input name="whatsapp_grupo" placeholder="ex: Equipe Entrega" style={fld} /></div>
          <div><label style={lb}>Link do grupo</label><input name="whatsapp_link" placeholder="https://chat.whatsapp.com/..." style={fld} /></div>
          <div><label style={lb}>Responsável</label>
            <select name="responsavel_id" style={fld}>
              <option value="">— Sem responsável —</option>
              {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 12.5 }}>Criar departamento</button>
          </div>
        </form>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: "var(--dim)" }}>
        Após criar os departamentos, atribua cada pessoa em <Link href="/expand/equipe" style={{ color: "var(--accent)" }}>Equipe → perfil → Editar</Link>.
      </p>
    </>
  );
}
