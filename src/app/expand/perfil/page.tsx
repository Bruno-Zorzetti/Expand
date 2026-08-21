import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAcesso } from "@/lib/expand-acesso";
import { CopiarUrl } from "@/components/expand/CopiarUrl";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", equipe: "Equipe", cliente: "Cliente", pendente: "Pendente",
};
const ROLE_COR: Record<string, string> = {
  admin: "var(--accent)", equipe: "var(--green)", cliente: "#86C0A6", pendente: "var(--warn)",
};

// ── Server actions ────────────────────────────────────────────────────────────
async function salvarMeuPerfil(formData: FormData) {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return;
  const sb = await createClient();
  const { data: me } = await sb.from("profiles").select("expand_membro").eq("id", userId).single();
  const membroSlug = String(me?.expand_membro ?? "").trim();
  if (!membroSlug) return;

  const bio     = String(formData.get("bio")     ?? "").trim();
  const fotoUrl = String(formData.get("foto_url") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();

  const adminSb = createAdminClient();
  if (adminSb) {
    await adminSb.from("expand_perfis").update({
      ...(bio      ? { bio }      : {}),
      ...(fotoUrl  ? { foto_url: fotoUrl } : {}),
      ...(telefone ? { telefone } : {}),
    }).eq("id", membroSlug);
  }
  revalidatePath("/expand/perfil");
}

async function gerarTokenCalendario(formData: FormData) {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return;
  const sb = await createClient();
  const { data: me } = await sb.from("profiles").select("expand_membro").eq("id", userId).single();
  const membroSlug = String(me?.expand_membro ?? "").trim();
  if (!membroSlug) return;
  const adminSb = createAdminClient();
  if (adminSb) {
    const { error: rpcErr } = await adminSb.rpc("gen_ics_token", { p_perfil_id: membroSlug });
    if (rpcErr) {
      await adminSb.from("expand_perfis").update({
        ics_token: crypto.randomUUID(),
      }).eq("id", membroSlug).is("ics_token", null);
    }
  }
  revalidatePath("/expand/perfil");
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function MeuPerfil() {
  const { userId } = await getAcesso();
  if (!userId) redirect("/login");

  const sb = await createClient();

  // Dados do profile auth
  const { data: profile } = await sb
    .from("profiles")
    .select("id, full_name, email, role, expand_membro, expand_modulos")
    .eq("id", userId)
    .single();

  const membroSlug = String(profile?.expand_membro ?? "").trim();
  const role  = String(profile?.role ?? "pendente");
  const roleCor   = ROLE_COR[role] ?? "var(--dim)";
  const roleLabel = ROLE_LABEL[role] ?? role;
  const modulos   = (profile?.expand_modulos as string[] | null) ?? [];

  // Perfil expand (cargo, bio, foto, ics)
  interface ExpandPerfil {
    id: string; nome: string | null; cargo: string | null;
    area: string | null; bio: string | null; foto_url: string | null;
    ics_token: string | null; telefone: string | null;
  }
  let perfil: ExpandPerfil | null = null;
  if (membroSlug) {
    const { data } = await sb
      .from("expand_perfis")
      .select("id, nome, cargo, area, bio, foto_url, ics_token, telefone")
      .eq("id", membroSlug)
      .single();
    perfil = data as unknown as ExpandPerfil | null;
  }

  // Tarefas ativas
  const nomeParaBusca = perfil?.nome ?? profile?.full_name ?? "";
  const { data: tarefasData } = nomeParaBusca
    ? await sb
        .from("expand_etapas")
        .select("id, titulo, cliente_id, status, sla, data_prevista, area")
        .or(`responsavel_atual.eq.${nomeParaBusca},responsavel.eq.${nomeParaBusca}`)
        .in("status", ["idle", "run", "wait"])
        .order("criado_em", { ascending: false })
        .limit(10)
    : { data: [] };
  const tarefas = (tarefasData ?? []) as Array<{
    id: string; titulo: string; cliente_id: string;
    status: string; sla: string | null; data_prevista: string | null; area: string | null;
  }>;

  // Clientes derivados das tarefas ativas
  const clienteIds = [...new Set(tarefas.map(t => t.cliente_id))];
  const { data: clientesData } = clienteIds.length > 0
    ? await sb.from("expand_clientes").select("id, nome").in("id", clienteIds)
    : { data: [] };
  const clientesMap = new Map((clientesData ?? []).map((c: { id: string; nome: string }) => [c.id, c.nome]));
  const clientes = clienteIds.map(id => ({ id, nome: clientesMap.get(id) ?? id }));

  // URL do calendário ICS
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://expand.hshs.com.br";
  const icsUrl  = perfil?.ics_token ? `${baseUrl}/api/calendario/${perfil.ics_token}` : null;

  const fld: CSSProperties = {
    background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
    color: "var(--txt)", padding: "7px 10px", fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%",
  };
  const sec = (title: string, children: ReactNode) => (
    <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid var(--line-2)" }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );

  const ini = ((perfil?.nome ?? profile?.full_name ?? "?")[0] ?? "?").toUpperCase();

  return (
    <>
      <p className="hx-eyebrow">Configurações · conta</p>

      {/* Header do perfil */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", flexShrink: 0,
          background: `color-mix(in srgb, ${roleCor} 18%, var(--panel-2))`,
          border: `2px solid ${roleCor}`,
          display: "grid", placeItems: "center",
          overflow: "hidden",
        }}>
          {perfil?.foto_url
            ? <img src={perfil.foto_url} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontWeight: 800, fontSize: 22, color: roleCor }}>{ini}</span>}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="ex-h1" style={{ margin: 0, fontSize: 22 }}>
              {perfil?.nome ?? profile?.full_name ?? "Meu Perfil"}
            </h1>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em",
              padding: "3px 9px", borderRadius: 20,
              background: `color-mix(in srgb, ${roleCor} 15%, transparent)`, color: roleCor,
            }}>{roleLabel}</span>
          </div>
          {perfil?.cargo && <p style={{ fontSize: 13, color: "var(--dim)", marginTop: 3 }}>{perfil.cargo}</p>}
          <p style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>{profile?.email}</p>
        </div>
      </div>

      {/* Identidade editável */}
      {sec("Identidade", (
        <form action={salvarMeuPerfil}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)" }}>URL da foto</span>
              <input name="foto_url" type="url" defaultValue={perfil?.foto_url ?? ""} placeholder="https://..." style={fld} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)" }}>Bio</span>
              <textarea name="bio" defaultValue={perfil?.bio ?? ""} placeholder="Conte um pouco sobre você..." rows={3}
                style={{ ...fld, resize: "vertical", lineHeight: 1.5 }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)" }}>WhatsApp (com código do país)</span>
              <input name="telefone" type="tel" defaultValue={perfil?.telefone ?? ""} placeholder="+5511999999999" style={{ ...fld, width: "auto", maxWidth: 240 }} />
            </label>
          </div>
          {!membroSlug && (
            <p style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 10 }}>
              Seu perfil ainda não está vinculado a um membro da equipe. Peça ao admin para vincular em Acessos.
            </p>
          )}
          <button className="hx-btn hx-btn-primary" type="submit" style={{ marginTop: 14, fontSize: 13 }}>
            Salvar alterações
          </button>
        </form>
      ))}

      {/* Acesso e módulos */}
      {sec("Acesso e módulos", (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {role === "admin"
              ? <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8, background: `color-mix(in srgb, var(--accent) 15%, transparent)`, color: "var(--accent)", fontWeight: 700 }}>Acesso total (Admin)</span>
              : modulos.length > 0
                ? modulos.map(m => {
                    const label = m.split(".")[1] ?? m;
                    return (
                      <span key={m} style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 7, border: "1px solid var(--line-2)", color: "var(--dim)", background: "var(--panel-2)" }}>
                        {label}
                      </span>
                    );
                  })
                : <span style={{ fontSize: 12.5, color: "var(--mut)", fontStyle: "italic" }}>Nenhum módulo ativo. Solicite acesso ao admin.</span>
            }
          </div>
        </div>
      ))}

      {/* Carteira de clientes */}
      {sec("Minha carteira de clientes", (
        clientes.length === 0
          ? <p style={{ fontSize: 13, color: "var(--mut)", fontStyle: "italic" }}>Nenhum cliente com tarefas ativas no momento.</p>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {clientes.map(c => (
                <div key={c.id} className="hx-glass" style={{ borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.nome}</div>
                  <a href={`/expand/carteira/${c.id}`} style={{ fontSize: 11.5, color: "var(--accent)", textDecoration: "none" }}>Ver dossiê →</a>
                </div>
              ))}
            </div>
          )
      ))}

      {/* Minhas tarefas ativas */}
      {sec("Minhas tarefas ativas", (
        tarefas.length === 0
          ? <p style={{ fontSize: 13, color: "var(--mut)", fontStyle: "italic" }}>Nenhuma tarefa ativa no momento.</p>
          : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {tarefas.map(t => {
                  const statusLabel: Record<string, string> = { idle: "Aguardando", run: "Em andamento", wait: "Aguardando retorno" };
                  const cor = t.status === "run" ? "var(--accent)" : t.status === "wait" ? "var(--warn)" : "var(--dim)";
                  return (
                    <div key={t.id} className="hx-glass" style={{ borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${cor}` }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.titulo}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                        {t.area && <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{t.area}</span>}
                        {t.sla  && <span style={{ fontSize: 10.5, color: "var(--dim)" }}>SLA: {t.sla}</span>}
                        <span style={{ fontSize: 10.5, color: cor, fontWeight: 600 }}>{statusLabel[t.status] ?? t.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a href="/expand/v2" style={{ display: "inline-block", marginTop: 10, fontSize: 12.5, color: "var(--accent)", textDecoration: "none" }}>
                Ver todas no Meu Dia →
              </a>
            </>
          )
      ))}

      {/* Calendário ICS */}
      {sec("Calendário Google", (
        <div>
          {icsUrl ? (
            <>
              <p style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 10, lineHeight: 1.6 }}>
                Use o link abaixo para adicionar sua agenda ao Google Calendar.<br />
                Em Google Calendar → <b>Outros calendários → Por URL</b>.
              </p>
              <CopiarUrl url={icsUrl} />
            </>
          ) : membroSlug ? (
            <div>
              <p style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 10 }}>
                Você ainda não tem um link de calendário gerado.
              </p>
              <form action={gerarTokenCalendario}>
                <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 13 }}>
                  Gerar meu link de calendário
                </button>
              </form>
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--mut)", fontStyle: "italic" }}>
              Vincule sua conta a um membro da equipe para ativar o calendário.
            </p>
          )}
        </div>
      ))}
    </>
  );
}
