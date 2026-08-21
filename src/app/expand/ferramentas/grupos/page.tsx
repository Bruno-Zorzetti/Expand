import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listarGrupos } from "@/lib/whatsapp";
import { getAcesso } from "@/lib/expand-acesso";
import { salvarGrupoCliente } from "@/app/expand/actions";

export const dynamic = "force-dynamic";

type ClienteMin = { id: string; nome: string; whatsapp_grupo: string | null; whatsapp_grupo_nome: string | null };

export default async function GruposPage() {
  const { isAdmin } = await getAcesso();
  const supabase = await createClient();

  const [grupos, { data: clienteData }] = await Promise.all([
    listarGrupos().catch(() => [] as { jid: string; nome: string }[]),
    supabase.from("expand_clientes").select("id, nome, whatsapp_grupo, whatsapp_grupo_nome").eq("ativo", true).order("nome"),
  ]);

  const clientes = (clienteData ?? []) as ClienteMin[];
  const clientesPorGrupo = new Map<string, ClienteMin[]>();
  clientes.forEach((c) => {
    if (c.whatsapp_grupo) {
      const arr = clientesPorGrupo.get(c.whatsapp_grupo) ?? [];
      arr.push(c);
      clientesPorGrupo.set(c.whatsapp_grupo, arr);
    }
  });

  const vinculados = clientes.filter((c) => c.whatsapp_grupo).length;
  const semGrupo  = clientes.filter((c) => !c.whatsapp_grupo);

  return (
    <>
      <p className="hx-eyebrow">Ferramentas · WhatsApp</p>
      <h1 className="ex-h1">Grupos <span className="hx-accent-text">WhatsApp</span></h1>
      <p className="ex-sub">{grupos.length} grupos encontrados · {vinculados} clientes vinculados</p>

      {grupos.length === 0 ? (
        <div className="hx-glass" style={{ borderRadius: 14, padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 13.5, color: "var(--dim)" }}>Nenhum grupo encontrado. Verifique se o número WhatsApp está configurado em Integrações.</p>
          <Link href="/expand/integracoes" className="hx-btn" style={{ display: "inline-block", marginTop: 14, padding: "8px 14px", textDecoration: "none", fontSize: 12.5 }}>Ir para Integrações</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {grupos.map((g) => {
            const vinculadosAqui = clientesPorGrupo.get(g.jid) ?? [];
            return (
              <div key={g.jid} className="hx-glass" style={{ borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>💬</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{g.nome}</div>
                    <div style={{ fontSize: 10.5, color: "var(--dim)", fontFamily: "monospace" }}>{g.jid}</div>
                  </div>
                  {vinculadosAqui.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {vinculadosAqui.map((c) => (
                        <Link key={c.id} href={`/expand/clientes/${c.id}?t=grupo`}
                          style={{ fontSize: 11, fontWeight: 600, background: "color-mix(in srgb,var(--accent) 14%,transparent)", color: "var(--accent)", borderRadius: 20, padding: "2px 9px", textDecoration: "none" }}>
                          {c.nome}
                        </Link>
                      ))}
                    </div>
                  )}
                  {vinculadosAqui.length === 0 && (
                    <span style={{ fontSize: 11, color: "var(--dim)", fontStyle: "italic" }}>sem cliente</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vincular grupo a cliente */}
      {isAdmin && semGrupo.length > 0 && grupos.length > 0 && (
        <div className="hx-glass" style={{ borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Vincular grupo a cliente</p>
          <p style={{ fontSize: 12, color: "var(--dim)", marginBottom: 14 }}>Selecione o cliente e o grupo correspondente.</p>
          <form action={salvarGrupoCliente} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", marginBottom: 4 }}>Cliente</label>
              <select name="clienteId" required style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit", minWidth: 180 }}>
                <option value="">Selecionar cliente</option>
                {semGrupo.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", marginBottom: 4 }}>Grupo</label>
              <select name="jid" required style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "9px 11px", fontSize: 12.5, fontFamily: "inherit", minWidth: 220 }}>
                <option value="">Selecionar grupo</option>
                {grupos.map((g) => <option key={g.jid} value={g.jid}>{g.nome}</option>)}
              </select>
            </div>
            <button type="submit" className="hx-btn hx-btn-primary" style={{ padding: "9px 16px", fontSize: 12.5 }}>Vincular</button>
          </form>
        </div>
      )}

      {/* Clientes já vinculados — tabela rápida */}
      {vinculados > 0 && (
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)", marginBottom: 10 }}>Clientes com grupo vinculado</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {clientes.filter((c) => c.whatsapp_grupo).map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 9, background: "var(--panel-2)" }}>
                <Link href={`/expand/clientes/${c.id}?t=grupo`} style={{ fontWeight: 600, fontSize: 13, textDecoration: "none", color: "var(--txt)", flex: 1 }}>{c.nome}</Link>
                <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{c.whatsapp_grupo_nome ?? c.whatsapp_grupo}</span>
                {isAdmin && (
                  <form action={salvarGrupoCliente}>
                    <input type="hidden" name="clienteId" value={c.id} />
                    <input type="hidden" name="jid" value="" />
                    <button type="submit" style={{ fontSize: 10.5, color: "var(--red)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>Desvincular</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
