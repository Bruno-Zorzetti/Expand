import Link from "next/link";
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://expand.hshs.com.br";
  const next    = role === "cliente" ? "/aguardando" : "/aguardando";
  const { data, error } = await sb.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=${next}` },
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

async function vincularConta(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = createAdminClient();
  if (!sb) redirect("/expand/acessos?erro=sem_chave");
  const email     = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const role      = formData.get("role")?.toString()                        ?? "cliente";
  const clienteId = formData.get("clienteId")?.toString()                  ?? "";
  const tab       = formData.get("tab")?.toString()                        ?? "equipe";
  if (!email) return;

  const { data: { users } } = await sb.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  if (!user) redirect(`/expand/acessos?tab=${tab}&erro=nao_encontrado`);

  await sb.from("profiles").upsert({
    id: user!.id,
    email: user!.email ?? email,
    full_name: (user!.user_metadata as { full_name?: string })?.full_name ?? email.split("@")[0],
    role,
    expand_cliente: clienteId || null,
  }, { onConflict: "id" });

  revalidatePath("/expand/acessos");
  redirect(`/expand/acessos?tab=${tab}&ok=vinculado`);
}

/* ─── Types & helpers ───────────────────────────────────────────────────── */

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  expand_cliente: string | null;
  created_at: string;
};

const ROLE_LABEL: Record<string, string> = { admin: "Admin", equipe: "Equipe", cliente: "Cliente", pendente: "Pendente" };
const ROLE_COR:   Record<string, string> = { admin: "#D4A02A", equipe: "#6FBF92", cliente: "#86C0A6", pendente: "#C89B5E" };

const fld = {
  background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
  color: "var(--txt)", padding: "8px 11px", fontSize: 13, outline: "none",
  fontFamily: "inherit", width: "100%",
} as const;

function Avatar({ nome, email, cor }: { nome: string | null; email: string | null; cor: string }) {
  const ini = (nome ?? email ?? "?")[0].toUpperCase();
  return (
    <div style={{
      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
      background: `color-mix(in srgb, ${cor} 14%, var(--panel-2))`,
      border: `1.5px solid color-mix(in srgb, ${cor} 35%, transparent)`,
      display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15, color: cor,
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
  const tab = (sp.tab === "clientes" ? "clientes" : "equipe") as "equipe" | "clientes";

  const supabase = await createClient();
  const [{ data: profilesRaw }, { data: cliData }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, expand_cliente, created_at").order("created_at"),
    supabase.from("expand_clientes").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  const profiles  = (profilesRaw ?? []) as Profile[];
  const clientes  = (cliData     ?? []) as { id: string; nome: string }[];
  const pendentes = profiles.filter(p => p.role === "pendente");
  const equipe    = profiles.filter(p => p.role === "admin" || p.role === "equipe");
  const clienteUsers = profiles.filter(p => p.role === "cliente");

  const cliNome = (id: string | null) => clientes.find(c => c.id === id)?.nome ?? null;
  const adminOk = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  /* ── Tab nav style helper ── */
  const tabStyle = (active: boolean) => ({
    padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: 13,
    cursor: "pointer", border: "1.5px solid",
    textDecoration: "none",
    background: active ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
    borderColor: active ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--line-2)",
    color: active ? "var(--accent)" : "var(--mut)",
  } as const);

  return (
    <>
      <p className="hx-eyebrow">Configurações · sistema</p>
      <h1 className="ex-h1">Acessos & <span className="hx-accent-text">usuários</span></h1>
      <p className="ex-sub" style={{ marginBottom: 24 }}>
        Gerencie equipe e clientes separadamente — papéis, permissões e vínculos são diferentes para cada grupo.
      </p>

      {/* ── Alertas ──────────────────────────────────────────────────── */}
      {!adminOk && (
        <div style={{ padding: "14px 18px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", marginBottom: 20, fontSize: 13, color: "var(--red)", fontWeight: 600 }}>
          ⚠ SUPABASE_SERVICE_ROLE_KEY não configurada — ações de admin não vão funcionar.
        </div>
      )}
      {sp.erro === "sem_chave" && (
        <div style={{ padding: "14px 18px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", marginBottom: 20, fontSize: 13, color: "var(--red)" }}>
          ✗ Chave de serviço não configurada. Configure SUPABASE_SERVICE_ROLE_KEY no Vercel e faça redeploy.
        </div>
      )}
      {sp.erro === "nao_encontrado" && (
        <div style={{ padding: "14px 18px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", marginBottom: 20, fontSize: 13, color: "var(--red)" }}>
          ✗ E-mail não encontrado. A pessoa ainda não criou uma conta — use &quot;Gerar link de acesso&quot; abaixo.
        </div>
      )}
      {sp.erro === "link" && (
        <div style={{ padding: "14px 18px", borderRadius: 10, background: "color-mix(in srgb, var(--red) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)", marginBottom: 20, fontSize: 13, color: "var(--red)" }}>
          ✗ Erro ao gerar link: {sp.detalhe || "verifique as configurações do Supabase."}
        </div>
      )}
      {sp.ok === "vinculado" && (
        <div style={{ padding: "14px 18px", borderRadius: 10, background: "color-mix(in srgb, var(--green) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)", marginBottom: 20, fontSize: 13, color: "var(--green)", fontWeight: 600 }}>
          ✓ Conta vinculada com sucesso.
        </div>
      )}

      {/* ── Link gerado ──────────────────────────────────────────────── */}
      {sp.link && (
        <div style={{ padding: "18px 20px", borderRadius: 12, background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 6, color: "var(--accent)" }}>
            ✓ Link de acesso gerado para {sp.link_email}
          </div>
          <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 12, lineHeight: 1.5 }}>
            Copie e envie pelo WhatsApp ou e-mail. Expira em 24 horas.
          </p>
          <div style={{ background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 11.5, wordBreak: "break-all", color: "var(--txt)", lineHeight: 1.6 }}>
            {decodeURIComponent(sp.link)}
          </div>
        </div>
      )}

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <div className="ex-kpis" style={{ marginBottom: 28 }}>
        {pendentes.length > 0 && (
          <div className="ex-kpi hx-glass"><div className="lab">Aguardando</div><div className="val" style={{ color: "var(--warn)" }}>{pendentes.length}</div><div className="foot">Aprovar</div></div>
        )}
        <div className="ex-kpi hx-glass"><div className="lab">Admin</div><div className="val hx-accent-text">{equipe.filter(p => p.role === "admin").length}</div><div className="foot">Diretoria</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Equipe</div><div className="val">{equipe.filter(p => p.role === "equipe").length}</div><div className="foot">Operacional</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Clientes</div><div className="val" style={{ color: "#86C0A6" }}>{clienteUsers.length}</div><div className="foot">Portais ativos</div></div>
      </div>

      {/* ── Pendentes ────────────────────────────────────────────────── */}
      {pendentes.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="ex-grph"><span className="gt" style={{ color: "var(--warn)" }}>Aguardando aprovação</span><span className="gc">{pendentes.length}</span><span className="gl" /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendentes.map(p => (
              <div key={p.id} className="hx-glass" style={{ borderRadius: 12, borderLeft: "3px solid var(--warn)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Avatar nome={p.full_name} email={p.email} cor="var(--warn)" />
                <div style={{ flex: 1, minWidth: 180 }}>
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
                </div>
                <Link href={`/expand/acessos/${p.id}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>Configurar →</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Link href="/expand/acessos?tab=equipe"   style={tabStyle(tab === "equipe")}>
          Equipe <span style={{ opacity: 0.7, fontWeight: 400, fontSize: 11 }}>({equipe.length})</span>
        </Link>
        <Link href="/expand/acessos?tab=clientes" style={tabStyle(tab === "clientes")}>
          Clientes <span style={{ opacity: 0.7, fontWeight: 400, fontSize: 11 }}>({clienteUsers.length})</span>
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ABA EQUIPE                                                     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "equipe" && (
        <>
          <div className="ex-grph">
            <span className="gt">Membros da equipe</span>
            <span className="gc">{equipe.length} · admin + operacional</span>
            <span className="gl" />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 36 }}>
            {equipe.length === 0 && (
              <div className="hx-glass" style={{ borderRadius: 12, padding: "20px 22px", color: "var(--mut)", fontSize: 13, textAlign: "center" }}>
                Nenhum membro da equipe cadastrado ainda.
              </div>
            )}
            {equipe.map(p => {
              const cor = ROLE_COR[p.role] ?? "var(--dim)";
              return (
                <div key={p.id} className="hx-glass" style={{ borderRadius: 12, borderLeft: `3px solid ${cor}`, padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Avatar nome={p.full_name} email={p.email} cor={cor} />
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.full_name || p.email}</div>
                      <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>{p.email}</div>
                      {cliNome(p.expand_cliente) && (
                        <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2, fontWeight: 600 }}>
                          👤 Atende: {cliNome(p.expand_cliente)}
                        </div>
                      )}
                    </div>

                    <RoleBadge role={p.role} />

                    {/* Elevar / rebaixar papel */}
                    <div style={{ display: "flex", gap: 5 }}>
                      {(["equipe", "admin"] as const).filter(r => r !== p.role).map(r => (
                        <form key={r} action={alterarRole}>
                          <input type="hidden" name="userId" value={p.id} />
                          <input type="hidden" name="role"   value={r}    />
                          <button type="submit" style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: "1px solid var(--line-2)", background: "transparent", color: "var(--dim)", cursor: "pointer" }}>
                            → {ROLE_LABEL[r]}
                          </button>
                        </form>
                      ))}
                    </div>

                    {/* Cliente que este membro atende */}
                    {clientes.length > 0 && (
                      <form action={vincularCliente} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="hidden" name="userId" value={p.id} />
                        <select name="clienteId" defaultValue={p.expand_cliente ?? ""} style={{ ...fld, width: 140, fontSize: 12, padding: "5px 8px" }}>
                          <option value="">— sem cliente —</option>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <button type="submit" style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--panel-2)", color: "var(--txt)", cursor: "pointer", whiteSpace: "nowrap" }}>
                          Salvar
                        </button>
                      </form>
                    )}

                    <Link href={`/expand/acessos/${p.id}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", flexShrink: 0, fontWeight: 600 }}>
                      Perfil →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Adicionar membro */}
          <div className="ex-grph"><span className="gt">Adicionar membro</span><span className="gl" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 40 }}>

            <div className="hx-glass" style={{ borderRadius: 14, padding: "22px 24px", borderLeft: "3px solid #6FBF92" }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Gerar link de convite</div>
              <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 18, lineHeight: 1.6 }}>
                Para quem ainda não tem conta. Você copia e envia pelo WhatsApp. Expira em 24 h.
              </p>
              <form action={gerarLink} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input type="hidden" name="tab" value="equipe" />
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>E-mail</span>
                  <input name="email" type="email" required placeholder="nome@empresa.com" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>Papel</span>
                  <select name="role" style={fld}>
                    <option value="equipe">Equipe</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                {clientes.length > 0 && (
                  <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>Atende cliente (opcional)</span>
                    <select name="clienteId" style={fld}>
                      <option value="">— nenhum —</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </label>
                )}
                <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 13 }}>🔗 Gerar link</button>
              </form>
            </div>

            <div className="hx-glass" style={{ borderRadius: 14, padding: "22px 24px" }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Vincular conta existente</div>
              <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 18, lineHeight: 1.6 }}>
                Para quem já criou conta mas ainda não aparece na lista. Informe o e-mail e o papel.
              </p>
              <form action={vincularConta} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input type="hidden" name="tab" value="equipe" />
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>E-mail cadastrado</span>
                  <input name="email" type="email" required placeholder="email@empresa.com" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>Papel</span>
                  <select name="role" style={fld}>
                    <option value="equipe">Equipe</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 13 }}>✓ Vincular</button>
              </form>
            </div>
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

          {/* Legenda */}
          <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
            {[
              { dot: "#22c55e", label: "vinculado a uma empresa" },
              { dot: "#f59e0b", label: "sem empresa vinculada" },
            ].map(l => (
              <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--mut)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: l.dot, display: "inline-block" }} />
                {l.label}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 36 }}>
            {clienteUsers.length === 0 && (
              <div className="hx-glass" style={{ borderRadius: 12, padding: "20px 22px", color: "var(--mut)", fontSize: 13, textAlign: "center" }}>
                Nenhum usuário cliente ainda. Use o formulário abaixo para convidar.
              </div>
            )}
            {clienteUsers.map(p => {
              const empresa = cliNome(p.expand_cliente);
              const cor     = "#86C0A6";
              const statusDot = empresa ? "#22c55e" : "#f59e0b";
              return (
                <div key={p.id} className="hx-glass" style={{ borderRadius: 12, borderLeft: `3px solid ${statusDot}`, padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Avatar nome={p.full_name} email={p.email} cor={cor} />

                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.full_name || p.email}</div>
                      <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>{p.email}</div>
                      {empresa ? (
                        <div style={{ fontSize: 11.5, color: "var(--accent)", marginTop: 3, fontWeight: 600 }}>
                          🏢 {empresa}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 3 }}>
                          ⚠ Sem empresa vinculada — portal inacessível
                        </div>
                      )}
                    </div>

                    <RoleBadge role={p.role} />

                    {/* Empresa vinculada (obrigatório para clientes) */}
                    {clientes.length > 0 && (
                      <form action={vincularCliente} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="hidden" name="userId" value={p.id} />
                        <select name="clienteId" defaultValue={p.expand_cliente ?? ""} style={{ ...fld, width: 160, fontSize: 12, padding: "5px 8px", borderColor: empresa ? "var(--line-2)" : "color-mix(in srgb, var(--warn) 50%, transparent)" }}>
                          <option value="">— selecione a empresa —</option>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <button type="submit" style={{ fontSize: 11.5, padding: "5px 12px", borderRadius: 8, border: "1px solid var(--line-2)", background: "var(--panel-2)", color: "var(--txt)", cursor: "pointer", whiteSpace: "nowrap" }}>
                          Salvar
                        </button>
                      </form>
                    )}

                    {/* Ir ao portal */}
                    {p.expand_cliente && (
                      <Link href={`/expand/clientes/${p.expand_cliente}`} style={{ fontSize: 12, color: "#86C0A6", textDecoration: "none", flexShrink: 0, fontWeight: 600 }}>
                        Portal →
                      </Link>
                    )}

                    {/* Rebaixar / promover de emergência */}
                    <form action={alterarRole}>
                      <input type="hidden" name="userId" value={p.id} />
                      <input type="hidden" name="role"   value="equipe" />
                      <button type="submit" style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, border: "1px solid var(--line-2)", background: "transparent", color: "var(--dim)", cursor: "pointer" }}>
                        → Equipe
                      </button>
                    </form>

                    <Link href={`/expand/acessos/${p.id}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", flexShrink: 0 }}>
                      Config →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Convidar cliente */}
          <div className="ex-grph"><span className="gt">Convidar cliente</span><span className="gl" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 40 }}>

            <div className="hx-glass" style={{ borderRadius: 14, padding: "22px 24px", borderLeft: "3px solid #86C0A6" }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Gerar link de acesso ao portal</div>
              <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 18, lineHeight: 1.6 }}>
                Para o cliente acessar o portal pela primeira vez. Escolha obrigatoriamente a empresa dele. Expira em 24 h.
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

            <div className="hx-glass" style={{ borderRadius: 14, padding: "22px 24px" }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Vincular conta existente</div>
              <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 18, lineHeight: 1.6 }}>
                Cliente que já criou conta mas ainda não está vinculado. Informe o e-mail e a empresa.
              </p>
              <form action={vincularConta} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input type="hidden" name="tab"  value="clientes" />
                <input type="hidden" name="role" value="cliente"  />
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>E-mail cadastrado</span>
                  <input name="email" type="email" required placeholder="email@empresa.com" style={fld} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>
                    Empresa <span style={{ color: "var(--warn)" }}>*</span>
                  </span>
                  <select name="clienteId" required style={fld}>
                    <option value="">— selecione a empresa —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </label>
                <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 13 }}>✓ Vincular cliente</button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
