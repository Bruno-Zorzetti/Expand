import Link from "next/link";
import { siteUrl } from "@/lib/site";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/expand-acesso";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/* ─── Server actions ────────────────────────────────────────────────────── */

async function alterarRole(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = createAdminClient();
  if (!sb) redirect("/expand/acessos?erro=sem_chave");
  const userId = formData.get("userId")?.toString() ?? "";
  const role   = formData.get("role")?.toString()   ?? "";
  if (!userId || !role) return;
  await sb.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/expand/acessos");
}

async function vincularMembro(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = createAdminClient();
  if (!sb) redirect("/expand/acessos?erro=sem_chave");
  const userId = formData.get("userId")?.toString() ?? "";
  const slug   = formData.get("slug")?.toString()   ?? "";
  if (!userId) return;
  await sb.from("profiles").update({ expand_membro: slug || null }).eq("id", userId);
  revalidatePath("/expand/acessos");
}

async function vincularCliente(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = createAdminClient();
  if (!sb) redirect("/expand/acessos?erro=sem_chave");
  const userId    = formData.get("userId")?.toString()    ?? "";
  const clienteId = formData.get("clienteId")?.toString() ?? "";
  if (!userId) return;
  await sb.from("profiles").update({ expand_cliente: clienteId || null }).eq("id", userId);
  revalidatePath("/expand/acessos");
}

async function excluirUsuario(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = createAdminClient();
  if (!sb) redirect("/expand/acessos?erro=sem_chave");
  const userId = formData.get("userId")?.toString() ?? "";
  if (!userId) return;
  await sb.auth.admin.deleteUser(userId);
  revalidatePath("/expand/acessos");
}

async function criarComSenha(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = createAdminClient();
  if (!sb) redirect("/expand/acessos?erro=sem_chave");
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const senha = formData.get("senha")?.toString() ?? "";
  const nome  = formData.get("nome")?.toString().trim() ?? "";
  const role  = formData.get("role")?.toString() ?? "equipe";
  if (!email || !senha) return;
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { full_name: nome || email.split("@")[0] },
  });
  if (error || !data.user) {
    redirect(`/expand/acessos?tab=convidar&erro=criar&detalhe=${encodeURIComponent(error?.message ?? "")}`);
  }
  await sb.from("profiles").upsert({
    id: data.user.id, email,
    full_name: nome || email.split("@")[0],
    role,
  }, { onConflict: "id" });
  revalidatePath("/expand/acessos");
  redirect(`/expand/acessos?tab=convidar&ok=criado&criado_email=${encodeURIComponent(email)}`);
}

async function gerarLink(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = createAdminClient();
  if (!sb) redirect("/expand/acessos?erro=sem_chave");
  const email     = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const role      = formData.get("role")?.toString()                        ?? "equipe";
  const clienteId = formData.get("clienteId")?.toString()                  ?? "";
  const tab       = formData.get("tab")?.toString()                        ?? "equipe";
  if (!email) return;

  const next = role === "cliente" ? "/aguardando" : "/definir-senha";
  const { data, error } = await sb.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${siteUrl()}/auth/callback?next=${next}` },
  });

  if (error || !data?.properties?.action_link) {
    redirect(`/expand/acessos?tab=${tab}&erro=link&detalhe=${encodeURIComponent(error?.message ?? "")}`);
  }

  const { data: { users } } = await sb.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  if (user) {
    await sb.from("profiles").upsert({
      id: user.id, email,
      full_name: (user.user_metadata as { full_name?: string })?.full_name ?? email.split("@")[0],
      role,
      expand_cliente: clienteId || null,
    }, { onConflict: "id" });
  }

  revalidatePath("/expand/acessos");
  redirect(
    `/expand/acessos?tab=${tab}&link=${encodeURIComponent(data!.properties!.action_link)}&link_email=${encodeURIComponent(email)}`
  );
}

/* ─── Types ─────────────────────────────────────────────────────────────── */

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  expand_membro: string | null;
  expand_cliente: string | null;
  created_at: string;
};

type Perfil = {
  id: string;
  nome: string;
  cargo: string | null;
  area: string | null;
  cor: string | null;
  tipo: string;
};

const ROLE_LABEL: Record<string, string> = { admin: "Admin", equipe: "Equipe", cliente: "Cliente", pendente: "Pendente" };
const ROLE_COR:   Record<string, string> = { admin: "#C89B5E", equipe: "#6FBF92", cliente: "#86C0A6", pendente: "#D9A94E" };

const fld = {
  background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
  color: "var(--txt)", padding: "8px 11px", fontSize: 13, outline: "none",
  fontFamily: "inherit", width: "100%",
} as const;

const fldSm = { ...fld, padding: "5px 8px", fontSize: 12 } as const;

function Avatar({ nome, email, cor }: { nome: string | null; email: string | null; cor: string }) {
  const ini = (nome ?? email ?? "?")[0].toUpperCase();
  return (
    <div style={{
      width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
      background: `color-mix(in srgb, ${cor} 14%, var(--panel-2))`,
      border: `1.5px solid color-mix(in srgb, ${cor} 40%, transparent)`,
      display: "grid", placeItems: "center", fontWeight: 800, fontSize: 16, color: cor,
    }}>
      {ini}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cor = ROLE_COR[role] ?? "var(--dim)";
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em",
      padding: "3px 9px", borderRadius: 6,
      background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor,
    }}>
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default async function Acessos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await exigirAdmin();
  const sp  = await searchParams;
  const tab = (sp.tab === "clientes" ? "clientes" : sp.tab === "convidar" ? "convidar" : "equipe") as "equipe" | "clientes" | "convidar";

  const supabase = await createClient();
  const [{ data: profilesRaw }, { data: cliData }, { data: perfisData }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, expand_membro, expand_cliente, created_at").order("created_at"),
    supabase.from("expand_clientes").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("expand_perfis").select("id, nome, cargo, area, cor, tipo").eq("tipo", "humano").order("nome"),
  ]);

  const profiles  = (profilesRaw ?? []) as Profile[];
  const clientes  = (cliData     ?? []) as { id: string; nome: string }[];
  const perfis    = (perfisData  ?? []) as Perfil[];

  const pendentes    = profiles.filter(p => p.role === "pendente");
  const equipe       = profiles.filter(p => p.role === "admin" || p.role === "equipe");
  const clienteUsers = profiles.filter(p => p.role === "cliente");

  const cliNome    = (id: string | null) => clientes.find(c => c.id === id)?.nome ?? null;
  const perfilDe   = (slug: string | null) => perfis.find(p => p.id === slug) ?? null;
  const perfisLivres = perfis.filter(p => !profiles.find(pr => pr.expand_membro === p.id));

  const adminOk = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  const tabStyle = (active: boolean) => ({
    padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: 13,
    cursor: "pointer", border: "1.5px solid", textDecoration: "none",
    background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
    borderColor: active ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--line-2)",
    color: active ? "var(--accent)" : "var(--mut)",
  } as const);

  return (
    <>
      <p className="hx-eyebrow">Configurações · sistema</p>
      <h1 className="ex-h1">Acessos & <span className="hx-accent-text">usuários</span></h1>
      <p className="ex-sub" style={{ marginBottom: 24 }}>
        Gerencie equipe e clientes — papel, perfil operacional e vínculo de empresa em um só lugar.
      </p>

      {/* ── Alertas ── */}
      {!adminOk && (
        <div style={{ padding: "14px 18px", borderRadius: 10, marginBottom: 20, fontSize: 13, color: "var(--red)", fontWeight: 600, background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)" }}>
          ⚠ SUPABASE_SERVICE_ROLE_KEY não configurada — ações de admin desativadas.
        </div>
      )}
      {sp.erro === "link" && (
        <div style={{ padding: "14px 18px", borderRadius: 10, marginBottom: 20, fontSize: 13, color: "var(--red)", background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)" }}>
          ✗ Erro ao gerar link: {sp.detalhe || "verifique as configurações do Supabase."}
        </div>
      )}
      {sp.ok === "vinculado" && (
        <div style={{ padding: "14px 18px", borderRadius: 10, marginBottom: 20, fontSize: 13, color: "var(--green)", fontWeight: 600, background: "color-mix(in srgb, var(--green) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)" }}>
          ✓ Operação realizada com sucesso.
        </div>
      )}

      {/* ── Link gerado ── */}
      {sp.link && (
        <div style={{ padding: "18px 20px", borderRadius: 12, marginBottom: 24, background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6, color: "var(--accent)" }}>
            ✓ Link de acesso gerado para {sp.link_email}
          </div>
          <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 10, lineHeight: 1.5 }}>
            Copie e envie pelo WhatsApp ou e-mail. Expira em 24 horas.
          </p>
          <div style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 11.5, wordBreak: "break-all", color: "var(--txt)", lineHeight: 1.6 }}>
            {decodeURIComponent(sp.link)}
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="ex-kpis" style={{ marginBottom: 28 }}>
        {pendentes.length > 0 && (
          <div className="ex-kpi hx-glass"><div className="lab">Pendentes</div><div className="val" style={{ color: "var(--warn)" }}>{pendentes.length}</div><div className="foot">Aguardando</div></div>
        )}
        <div className="ex-kpi hx-glass"><div className="lab">Admin</div><div className="val hx-accent-text">{equipe.filter(p => p.role === "admin").length}</div><div className="foot">Diretoria</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Equipe</div><div className="val">{equipe.filter(p => p.role === "equipe").length}</div><div className="foot">Operacional</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Clientes</div><div className="val" style={{ color: "#86C0A6" }}>{clienteUsers.length}</div><div className="foot">Portais</div></div>
      </div>

      {/* ── Pendentes ── */}
      {pendentes.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="ex-grph"><span className="gt" style={{ color: "var(--warn)" }}>Aguardando aprovação</span><span className="gc">{pendentes.length}</span><span className="gl" /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendentes.map(p => (
              <div key={p.id} className="hx-glass" style={{ borderRadius: 12, borderLeft: "3px solid var(--warn)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Avatar nome={p.full_name} email={p.email} cor="var(--warn)" />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.full_name || "—"}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{p.email} · {new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["equipe", "cliente", "admin"] as const).map(r => (
                    <form key={r} action={alterarRole}>
                      <input type="hidden" name="userId" value={p.id} />
                      <input type="hidden" name="role"   value={r}    />
                      <button type="submit" className="hx-btn hx-btn-primary" style={{ fontSize: 12, padding: "5px 14px" }}>
                        → {ROLE_LABEL[r]}
                      </button>
                    </form>
                  ))}
                  <form action={excluirUsuario}>
                    <input type="hidden" name="userId" value={p.id} />
                    <button type="submit" style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, border: "1px solid color-mix(in srgb, var(--red) 30%, transparent)", background: "color-mix(in srgb, var(--red) 8%, transparent)", color: "var(--red)", cursor: "pointer" }}>
                      Excluir
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <Link href="/expand/acessos?tab=equipe"    style={tabStyle(tab === "equipe")}>
          Equipe <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 11 }}>({equipe.length})</span>
        </Link>
        <Link href="/expand/acessos?tab=clientes"  style={tabStyle(tab === "clientes")}>
          Clientes <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 11 }}>({clienteUsers.length})</span>
        </Link>
        <Link href="/expand/acessos?tab=convidar"  style={tabStyle(tab === "convidar")}>
          + Convidar
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ABA EQUIPE                                                     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "equipe" && (
        <>
          <div className="ex-grph">
            <span className="gt">Membros da equipe</span>
            <span className="gc">{equipe.length}</span>
            <span className="gl" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>
            {equipe.length === 0 && (
              <div className="hx-glass" style={{ borderRadius: 12, padding: "20px 22px", color: "var(--mut)", fontSize: 13, textAlign: "center" }}>
                Nenhum membro cadastrado.
              </div>
            )}
            {equipe.map(p => {
              const cor    = ROLE_COR[p.role] ?? "var(--dim)";
              const perfil = perfilDe(p.expand_membro);
              return (
                <div key={p.id} className="hx-glass" style={{ borderRadius: 14, borderLeft: `3px solid ${perfil?.cor ?? cor}`, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>

                    {/* Avatar + identidade */}
                    <Avatar nome={perfil?.nome ?? p.full_name} email={p.email} cor={perfil?.cor ?? cor} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, fontSize: 14.5 }}>{perfil?.nome ?? p.full_name ?? p.email}</span>
                        <RoleBadge role={p.role} />
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{p.email}</div>
                      {perfil ? (
                        <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 3 }}>
                          {perfil.cargo}{perfil.area ? ` · ${perfil.area}` : ""}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--warn)", marginTop: 3 }}>
                          ⚠ Sem perfil operacional vinculado
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>

                      {/* Papel */}
                      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--dim)", flexShrink: 0 }}>Papel:</span>
                        {(["equipe", "admin"] as const).filter(r => r !== p.role).map(r => (
                          <form key={r} action={alterarRole}>
                            <input type="hidden" name="userId" value={p.id} />
                            <input type="hidden" name="role"   value={r}    />
                            <button type="submit" style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: "1px solid var(--line-2)", background: "transparent", color: "var(--mut)", cursor: "pointer" }}>
                              → {ROLE_LABEL[r]}
                            </button>
                          </form>
                        ))}
                      </div>

                      {/* Perfil operacional */}
                      <form action={vincularMembro} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="hidden" name="userId" value={p.id} />
                        <select name="slug" defaultValue={p.expand_membro ?? ""} style={{ ...fldSm, flex: 1 }}>
                          <option value="">— sem perfil —</option>
                          {/* perfil já vinculado aparece mesmo que não esteja nos "livres" */}
                          {perfil && <option value={perfil.id}>{perfil.nome}</option>}
                          {perfisLivres.filter(pf => pf.id !== perfil?.id).map(pf => (
                            <option key={pf.id} value={pf.id}>{pf.nome} ({pf.cargo ?? pf.area})</option>
                          ))}
                        </select>
                        <button type="submit" style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--panel-2)", color: "var(--txt)", cursor: "pointer", whiteSpace: "nowrap" }}>
                          Salvar
                        </button>
                      </form>

                    </div>

                    {/* Links e exclusão */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                      {perfil && (
                        <Link href={`/expand/equipe/${perfil.id}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                          Ver perfil →
                        </Link>
                      )}
                      <form action={excluirUsuario}>
                        <input type="hidden" name="userId" value={p.id} />
                        <button type="submit" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", background: "transparent", color: "var(--red)", cursor: "pointer", opacity: 0.7 }}>
                          Excluir acesso
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ABA CLIENTES                                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "clientes" && (
        <>
          <div className="ex-grph">
            <span className="gt">Usuários clientes</span>
            <span className="gc">{clienteUsers.length} · acesso ao portal</span>
            <span className="gl" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>
            {clienteUsers.length === 0 && (
              <div className="hx-glass" style={{ borderRadius: 12, padding: "20px 22px", color: "var(--mut)", fontSize: 13, textAlign: "center" }}>
                Nenhum cliente com acesso ainda.
              </div>
            )}
            {clienteUsers.map(p => {
              const empresa    = cliNome(p.expand_cliente);
              const statusDot  = empresa ? "#6FBF92" : "#D9A94E";
              return (
                <div key={p.id} className="hx-glass" style={{ borderRadius: 14, borderLeft: `3px solid ${statusDot}`, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>

                    <Avatar nome={p.full_name} email={p.email} cor="#86C0A6" />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5 }}>{p.full_name || p.email}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{p.email}</div>
                      {empresa ? (
                        <div style={{ fontSize: 12, color: "var(--green)", marginTop: 3, fontWeight: 600 }}>🏢 {empresa}</div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--warn)", marginTop: 3 }}>⚠ Sem empresa — portal inacessível</div>
                      )}
                    </div>

                    {/* Empresa */}
                    {clientes.length > 0 && (
                      <form action={vincularCliente} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="hidden" name="userId" value={p.id} />
                        <select name="clienteId" defaultValue={p.expand_cliente ?? ""} style={{ ...fldSm, width: 160, borderColor: empresa ? "var(--line-2)" : "color-mix(in srgb, var(--warn) 50%, transparent)" }}>
                          <option value="">— selecione a empresa —</option>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <button type="submit" style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--panel-2)", color: "var(--txt)", cursor: "pointer", whiteSpace: "nowrap" }}>
                          Salvar
                        </button>
                      </form>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                      {p.expand_cliente && (
                        <Link href={`/expand/clientes/${p.expand_cliente}`} style={{ fontSize: 12, color: "#86C0A6", textDecoration: "none", fontWeight: 600 }}>
                          Portal →
                        </Link>
                      )}
                      <form action={alterarRole}>
                        <input type="hidden" name="userId" value={p.id} />
                        <input type="hidden" name="role"   value="equipe" />
                        <button type="submit" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid var(--line-2)", background: "transparent", color: "var(--mut)", cursor: "pointer" }}>
                          → Equipe
                        </button>
                      </form>
                      <form action={excluirUsuario}>
                        <input type="hidden" name="userId" value={p.id} />
                        <button type="submit" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", background: "transparent", color: "var(--red)", cursor: "pointer", opacity: 0.7 }}>
                          Excluir acesso
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ABA CONVIDAR                                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "convidar" && (
        <>
          <div className="ex-grph"><span className="gt">Convidar novo membro ou cliente</span><span className="gl" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 40 }}>

            {/* Equipe */}
            <div className="hx-glass" style={{ borderRadius: 14, padding: "22px 24px", borderLeft: "3px solid #6FBF92" }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Membro da equipe</div>
              <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 18, lineHeight: 1.6 }}>
                Gera link de convite. A pessoa define a senha e o admin vincula o perfil operacional depois.
              </p>
              <form action={gerarLink} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input type="hidden" name="tab" value="equipe" />
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>E-mail</span>
                  <input name="email" type="email" required placeholder="nome@empresa.com" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>Papel inicial</span>
                  <select name="role" style={fld}>
                    <option value="equipe">Equipe</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 13 }}>🔗 Gerar link de convite</button>
              </form>
            </div>

            {/* Cliente */}
            <div className="hx-glass" style={{ borderRadius: 14, padding: "22px 24px", borderLeft: "3px solid #86C0A6" }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Acesso ao portal (cliente)</div>
              <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 18, lineHeight: 1.6 }}>
                Gera link de acesso para o portal do cliente. Empresa obrigatória.
              </p>
              <form action={gerarLink} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input type="hidden" name="tab"  value="clientes" />
                <input type="hidden" name="role" value="cliente"  />
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>E-mail do contato</span>
                  <input name="email" type="email" required placeholder="contato@empresa.com" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>
                    Empresa <span style={{ color: "var(--warn)" }}>*</span>
                  </span>
                  <select name="clienteId" required style={{ ...fld, borderColor: "color-mix(in srgb, var(--accent) 30%, transparent)" }}>
                    <option value="">— selecione a empresa —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </label>
                <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 13 }}>🔗 Gerar link do portal</button>
              </form>
            </div>

            {/* Criar com senha — sem depender de e-mail */}
            <div className="hx-glass" style={{ borderRadius: 14, padding: "22px 24px", borderLeft: "3px solid var(--accent)", gridColumn: "1 / -1" }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Criar com senha direta</div>
              <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 18, lineHeight: 1.6 }}>
                Cria o acesso imediatamente — sem depender de e-mail. Ideal para equipe interna. Compartilhe a senha pelo WhatsApp.
              </p>
              {sp.ok === "criado" && sp.criado_email && (
                <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "var(--green)", fontWeight: 600, background: "color-mix(in srgb, var(--green) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)" }}>
                  ✓ Acesso criado para {decodeURIComponent(sp.criado_email)}. Compartilhe a senha.
                </div>
              )}
              {sp.erro === "criar" && (
                <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "var(--red)", background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)" }}>
                  ✗ {sp.detalhe || "Erro ao criar usuário."}
                </div>
              )}
              <form action={criarComSenha} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>Nome</span>
                  <input name="nome" type="text" placeholder="Nome completo" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>E-mail</span>
                  <input name="email" type="email" required placeholder="nome@empresa.com" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>Senha inicial</span>
                  <input name="senha" type="text" required placeholder="Mín. 8 caracteres" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>Papel</span>
                  <select name="role" style={fld}>
                    <option value="equipe">Equipe</option>
                    <option value="admin">Admin</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </label>
                <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 13, gridColumn: "1 / -1" }}>
                  ✓ Criar acesso imediatamente
                </button>
              </form>
            </div>

          </div>
        </>
      )}
    </>
  );
}
