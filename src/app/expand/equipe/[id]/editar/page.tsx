import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcesso } from "@/lib/expand-acesso";
import PerfilAvatar from "@/components/expand/PerfilAvatar";
import { salvarPerfil, excluirPerfil } from "@/app/expand/actions";
import type { Perfil } from "@/lib/expand-perfis";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";

const fld: CSSProperties = {
  background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
  color: "var(--txt)", padding: "9px 11px", fontSize: 13, fontFamily: "inherit", width: "100%",
};
const label: CSSProperties = { fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 };
const fgroup: CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };

export default async function EditarPerfil({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { id } = await params;
  const { ok } = await searchParams;
  const supabase = await createClient();
  const { isAdmin } = await getAcesso();

  // Verify current user can edit
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: me } = await supabase.from("profiles").select("expand_membro").eq("id", user.id).single();
  const membro = me?.expand_membro as string | null;
  if (!isAdmin && membro !== id) redirect(`/expand/equipe/${id}`);

  const { data } = await supabase.from("expand_perfis").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Perfil;

  // Admin: list of human perfis for "superior" select
  let superiores: { id: string; nome: string }[] = [];
  if (isAdmin) {
    const { data: sup } = await supabase.from("expand_perfis").select("id, nome").eq("tipo", "humano").order("nome");
    superiores = (sup ?? []) as { id: string; nome: string }[];
  }

  const pRaw = p as Perfil & { ativo?: boolean; ordem?: number };
  const ehAgente = p.tipo === "agente";
  const cor = (p.cor as string | null) ?? "var(--accent)";

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href={`/expand/equipe/${id}`} style={{ color: "var(--dim)", fontSize: 13, textDecoration: "none" }}>← {p.nome}</Link>
        <span style={{ color: "var(--line)", fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, color: "var(--mut)" }}>Editar</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <PerfilAvatar p={p} size={52} radius={8} />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--txt)", marginBottom: 2 }}>{p.nome}</h1>
          <p style={{ fontSize: 12.5, color: "var(--mut)" }}>{ehAgente ? "Agente de IA" : "Membro humano"} · {p.cargo ?? "Sem cargo"}</p>
        </div>
      </div>

      {ok === "1" && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)", color: "var(--green)", fontSize: 13, marginBottom: 16 }}>
          Perfil salvo com sucesso.
        </div>
      )}

      <form action={salvarPerfil} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
        <input type="hidden" name="id" value={id} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={fgroup}>
            <label style={label}>Nome *</label>
            <input name="nome" defaultValue={p.nome} required style={fld} />
          </div>
          <div style={fgroup}>
            <label style={label}>Cargo</label>
            <input name="cargo" defaultValue={(p.cargo as string | null) ?? ""} style={fld} placeholder="ex: Diretor Comercial" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div style={fgroup}>
            <label style={label}>Área</label>
            <select name="area" defaultValue={(p.area as string | null) ?? ""} style={fld}>
              <option value="">— Sem área —</option>
              {["comercial","cs","design","marketing","tech","gestao","financeiro","juridico","ops"].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div style={fgroup}>
            <label style={label}>Cor de destaque</label>
            <input type="color" name="cor" defaultValue={(p.cor as string | null) ?? "#6366F1"} style={{ ...fld, padding: "4px", height: 42, cursor: "pointer" }} />
          </div>
          <div style={fgroup}>
            <label style={label}>Foto (URL)</label>
            <input name="foto_url" defaultValue={(p.foto_url as string | null) ?? ""} style={fld} placeholder="https://…" />
          </div>
        </div>

        <div style={fgroup}>
          <label style={label}>Bio</label>
          <textarea name="bio" defaultValue={(p.bio as string | null) ?? ""} rows={3} style={{ ...fld, resize: "vertical" }} placeholder="Resumo de 2-3 frases sobre o papel e estilo de trabalho." />
        </div>

        {ehAgente && (
          <>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <p style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Configuração do agente de IA</p>
            </div>
            <div style={fgroup}>
              <label style={label}>Prompt do sistema</label>
              <textarea name="prompt" defaultValue={(p.prompt as string | null) ?? ""} rows={8} style={{ ...fld, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} placeholder="Instruções de comportamento do agente — quem é, como age, quais são suas prioridades." />
            </div>
            <div style={fgroup}>
              <label style={label}>Memória (contexto persistente)</label>
              <textarea name="memoria" defaultValue={(p.memoria as string | null) ?? ""} rows={5} style={{ ...fld, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} placeholder="Acertos, padrões, aprendizados relevantes — injetado no chat automaticamente." />
            </div>
          </>
        )}

        {isAdmin && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Configurações de admin</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {!ehAgente && (
                <div style={fgroup}>
                  <label style={label}>Superior direto</label>
                  <select name="superior" defaultValue={(p.superior as string | null) ?? ""} style={fld}>
                    <option value="">— Nenhum —</option>
                    {superiores.filter(s => s.id !== id).map(s => (
                      <option key={s.id} value={s.nome}>{s.nome}</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={fgroup}>
                <label style={label}>Ordem de exibição</label>
                <input type="number" name="ordem" defaultValue={pRaw.ordem ?? ""} style={fld} placeholder="0" min={0} />
              </div>
              <div style={fgroup}>
                <label style={label}>Ativo</label>
                <select name="ativo" defaultValue={pRaw.ativo ? "1" : "0"} style={fld}>
                  <option value="1">Sim (visível)</option>
                  <option value="0">Não (oculto)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
          <button type="submit" className="hx-btn hx-btn-primary" style={{ padding: "10px 24px" }}>Salvar alterações</button>
          <Link href={`/expand/equipe/${id}`} className="hx-btn hx-btn-ghost" style={{ padding: "10px 20px" }}>Cancelar</Link>
        </div>
      </form>

      {/* Danger zone — admin only */}
      {isAdmin && (
        <div style={{ marginTop: 40, padding: "16px 18px", borderRadius: 12, border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)", background: "color-mix(in srgb, var(--red) 6%, transparent)" }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--red)", marginBottom: 8 }}>Zona de perigo</p>
          <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 12 }}>Excluir {ehAgente ? "este agente" : "este membro"} remove o perfil permanentemente. As etapas vinculadas permanecem.</p>
          <form action={excluirPerfil} style={{ display: "inline" }}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="hx-btn" style={{ padding: "8px 16px", fontSize: 12, background: "color-mix(in srgb, var(--red) 14%, transparent)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: 8, cursor: "pointer" }}>
              Excluir {p.nome}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
