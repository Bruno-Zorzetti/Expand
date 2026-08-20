import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirAdmin } from "@/lib/expand-acesso";
import { revalidatePath } from "next/cache";
import { MODULOS, SECOES } from "@/lib/expand-modulos";
import { toggleModulo, liberarSecao, revogarSecao } from "../rbac/actions";

export const dynamic = "force-dynamic";

const SECAO_COR: Record<string, string> = {
  Tarefas:     "#4F6BED",
  Projetos:    "#6FBF92",
  Ferramentas: "#86C0A6",
  Comercial:   "#CE6A5F",
  Financeiro:  "#C89B5E",
};
const ROLE_COR: Record<string, string> = {
  pendente: "var(--warn)",
  admin:    "var(--accent)",
  equipe:   "var(--green)",
  cliente:  "#86C0A6",
};
const ROLE_LABEL: Record<string, string> = {
  pendente: "Pendente",
  admin:    "Admin",
  equipe:   "Equipe",
  cliente:  "Cliente",
};

type Perfil = {
  id: string; full_name: string | null; email: string | null;
  role: string; expand_membro: string | null; acessos: string[] | null;
  created_at: string; tipo_acesso: string | null;
  token_limit_day: number | null; token_limit_month: number | null;
  tokens_today: number; tokens_month: number;
  access_days: string[] | null; access_start: string | null; access_end: string | null;
  cliente_ids: string[] | null; funcoes: string[] | null;
};

async function aprovar(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = createAdminClient();
  if (!sb) return;
  await sb.from("profiles").update({ role: String(formData.get("role")) }).eq("id", String(formData.get("id")));
  revalidatePath("/expand/acessos");
}

async function convidar(formData: FormData) {
  "use server";
  await exigirAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role  = String(formData.get("role") ?? "equipe");
  if (!email) return;
  const sb = createAdminClient();
  if (!sb) return;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://expand.hshs.com.br";
  await sb.auth.admin.inviteUserByEmail(email, { redirectTo: `${siteUrl}/aguardando`, data: { tipo_acesso: role } });
  const { data: u } = await sb.auth.admin.listUsers();
  const user = u.users.find((x: { email?: string }) => x.email === email);
  if (user) await sb.from("profiles").update({ role }).eq("id", user.id);
  revalidatePath("/expand/acessos");
}

const fld: React.CSSProperties = {
  background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
  color: "var(--txt)", padding: "7px 10px", fontSize: 13, outline: "none", fontFamily: "inherit",
};

function TabBar({ ativo }: { ativo: string }) {
  const abas = [
    { k: "equipe",     label: "Equipe" },
    { k: "permissoes", label: "Permissões" },
    { k: "custos",     label: "Custos" },
  ];
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 22, background: "var(--panel-2)", borderRadius: 12, padding: 4, width: "fit-content" }}>
      {abas.map(a => (
        <Link key={a.k} href={`/expand/acessos?tab=${a.k}`} style={{
          padding: "6px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: "none",
          background: ativo === a.k ? "var(--panel)" : "transparent",
          color: ativo === a.k ? "var(--txt)" : "var(--dim)",
          boxShadow: ativo === a.k ? "0 1px 4px rgba(0,0,0,.12)" : "none",
          transition: "all .15s",
        }}>{a.label}</Link>
      ))}
    </div>
  );
}

export default async function Acessos({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await exigirAdmin();
  const { tab: rawTab } = await searchParams;
  const tab = ["equipe", "permissoes", "custos"].includes(rawTab ?? "") ? rawTab! : "equipe";

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_listar_perfis_v2");
  const perfis = (data ?? []) as Perfil[];

  const { data: profilesData } = await supabase.from("profiles").select("id, expand_modulos");
  const modulosMap = Object.fromEntries(
    (profilesData ?? []).map((p: { id: string; expand_modulos: string[] | null }) => [p.id, p.expand_modulos ?? []])
  );

  const pendentes = perfis.filter(p => p.role === "pendente");
  const ativos    = perfis.filter(p => p.role !== "pendente");

  const totais = {
    admin:   ativos.filter(p => p.role === "admin").length,
    equipe:  ativos.filter(p => p.role === "equipe").length,
    cliente: ativos.filter(p => p.role === "cliente").length,
  };

  return (
    <>
      <p className="hx-eyebrow">Configurações · segurança</p>
      <h1 className="ex-h1">Acessos & <span className="hx-accent-text">permissões</span></h1>
      <p className="ex-sub" style={{ marginBottom: 18 }}>
        Gerencie equipe, módulos por pessoa e custos operacionais.
      </p>

      <div className="ex-kpis" style={{ marginBottom: 22 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Aguardando</div><div className="val" style={{ color: pendentes.length ? "var(--warn)" : "var(--dim)" }}>{pendentes.length}</div><div className="foot">Pendentes</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Admin</div><div className="val hx-accent-text">{totais.admin}</div><div className="foot">Diretoria</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Equipe</div><div className="val">{totais.equipe}</div><div className="foot">Operacional</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Clientes</div><div className="val">{totais.cliente}</div><div className="foot">Portais</div></div>
      </div>

      <TabBar ativo={tab} />

      {/* ── EQUIPE ──────────────────────────────────────────────────────── */}
      {tab === "equipe" && (
        <>
          {pendentes.length > 0 && (
            <>
              <div className="ex-grph"><span className="gt" style={{ color: "var(--warn)" }}>Aguardando aprovação</span><span className="gc">{pendentes.length}</span><span className="gl" /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {pendentes.map(p => (
                  <div key={p.id} className="hx-glass" style={{ borderRadius: 12, borderLeft: "3px solid var(--warn)", padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{p.full_name || "—"}</div>
                        <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{p.email} · {new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
                      </div>
                      <form action={aprovar}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="role" value="equipe" /><button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 12.5 }}>✓ Equipe</button></form>
                      <form action={aprovar}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="role" value="cliente" /><button className="hx-btn hx-btn-ghost" type="submit" style={{ fontSize: 12.5 }}>✓ Cliente</button></form>
                      <form action={aprovar}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="role" value="admin" /><button className="hx-btn hx-btn-ghost" type="submit" style={{ fontSize: 12.5 }}>✓ Admin</button></form>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="ex-grph"><span className="gt">Contas ativas</span><span className="gc">{ativos.length}</span><span className="gl" /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ativos.map(p => {
              const cor = ROLE_COR[p.role] ?? "var(--dim)";
              return (
                <div key={p.id} className="hx-glass" style={{ borderRadius: 12, borderLeft: `3px solid ${cor}`, padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: `color-mix(in srgb, ${cor} 18%, var(--panel-2))`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, color: cor, flexShrink: 0 }}>
                      {(p.full_name ?? p.email ?? "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{p.full_name || "—"}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", padding: "1px 7px", borderRadius: 5, background: `color-mix(in srgb, ${cor} 15%, transparent)`, color: cor }}>{ROLE_LABEL[p.role] ?? p.role}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>{p.email}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {["equipe", "admin", "cliente"].filter(r => r !== p.role).map(r => (
                        <form key={r} action={aprovar}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="role" value={r} />
                          <button type="submit" style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, border: "1px solid var(--line-2)", background: "transparent", color: "var(--dim)", cursor: "pointer" }}>
                            → {ROLE_LABEL[r]}
                          </button>
                        </form>
                      ))}
                    </div>
                    <Link href={`/expand/acessos/${p.id}`} style={{ fontSize: 11.5, color: "var(--dim)", textDecoration: "none", flexShrink: 0 }}>avançado →</Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hx-glass" style={{ marginTop: 24, borderRadius: 12, padding: "20px 22px" }}>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "var(--accent)" }}>Convidar por e-mail</p>
            <form action={convidar} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
              <label style={{ flex: 2, minWidth: 200, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>E-mail</span>
                <input name="email" type="email" required placeholder="nome@empresa.com" style={fld} />
              </label>
              <label style={{ flex: 1, minWidth: 120, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>Papel</span>
                <select name="role" style={fld}><option value="equipe">Equipe</option><option value="cliente">Cliente</option><option value="admin">Admin</option></select>
              </label>
              <button className="hx-btn hx-btn-primary" type="submit" style={{ fontSize: 12.5, alignSelf: "flex-end" }}>Enviar convite</button>
            </form>
          </div>
        </>
      )}

      {/* ── PERMISSÕES ────────────────────────────────────────────────── */}
      {tab === "permissoes" && (
        <>
          <p style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 16, lineHeight: 1.6 }}>
            Clique nos módulos para ligar/desligar por pessoa.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ativos.map(p => {
              const cor     = ROLE_COR[p.role] ?? "var(--dim)";
              const isAdmin = p.role === "admin";
              const modulos = modulosMap[p.id] ?? [];
              return (
                <details key={p.id} className="hx-glass" style={{ borderRadius: 14, borderLeft: `3px solid ${cor}`, overflow: "hidden" }}>
                  <summary style={{ padding: "13px 18px", cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `color-mix(in srgb, ${cor} 18%, var(--panel-2))`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, color: cor, flexShrink: 0 }}>
                      {(p.full_name ?? p.email ?? "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5 }}>{p.full_name || "—"}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginLeft: 8, padding: "1px 7px", borderRadius: 5, background: `color-mix(in srgb, ${cor} 15%, transparent)`, color: cor }}>{ROLE_LABEL[p.role] ?? p.role}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--dim)" }}>{isAdmin ? "Acesso total" : `${modulos.length} módulos`} ▾</span>
                  </summary>
                  <div style={{ borderTop: "1px solid var(--line)", padding: "16px 18px" }}>
                    {isAdmin ? (
                      <p style={{ fontSize: 12.5, color: "var(--mut)", margin: 0 }}>
                        Admin tem acesso irrestrito. Mude o papel em <Link href="/expand/acessos?tab=equipe" style={{ color: "var(--accent)" }}>Equipe</Link> para restringir.
                      </p>
                    ) : (
                      SECOES.map(sec => {
                        const mods  = MODULOS.filter(m => m.secao === sec);
                        const cor2  = SECAO_COR[sec] ?? "var(--accent)";
                        const gates = mods.map(m => m.gate);
                        const allOn = gates.every(g => modulos.includes(g));
                        return (
                          <div key={sec} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: cor2, background: `color-mix(in srgb, ${cor2} 13%, transparent)`, padding: "2px 8px", borderRadius: 5 }}>{sec}</span>
                              <div style={{ flex: 1, height: 1, background: "var(--line-2)" }} />
                              <form action={allOn ? revogarSecao.bind(null, p.id, sec.toLowerCase()) : liberarSecao.bind(null, p.id, sec.toLowerCase(), gates)}>
                                <button type="submit" style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, border: `1px solid ${allOn ? cor2 : "var(--line-2)"}`, background: allOn ? `color-mix(in srgb, ${cor2} 12%, transparent)` : "transparent", color: allOn ? cor2 : "var(--dim)", cursor: "pointer", fontWeight: allOn ? 700 : 400 }}>
                                  {allOn ? "✓ Tudo" : "Liberar tudo"}
                                </button>
                              </form>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {mods.map(m => {
                                const ativo = modulos.includes(m.gate);
                                return (
                                  <form key={m.gate} action={toggleModulo.bind(null, p.id, m.gate, !ativo)}>
                                    <button type="submit" title={m.descricao} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8, border: `1px solid ${ativo ? cor2 : "var(--line-2)"}`, background: ativo ? `color-mix(in srgb, ${cor2} 12%, transparent)` : "var(--bg)", color: ativo ? cor2 : "var(--dim)", cursor: "pointer", fontWeight: ativo ? 700 : 400, display: "flex", alignItems: "center", gap: 5 }}>
                                      <span style={{ fontSize: 10 }}>{ativo ? "✓" : "○"}</span>
                                      {m.label}
                                    </button>
                                  </form>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}

      {/* ── CUSTOS ────────────────────────────────────────────────────── */}
      {tab === "custos" && (
        <>
          <p style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 16, lineHeight: 1.6 }}>
            Uso de tokens de IA e limites por pessoa.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--line)", color: "var(--dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 700 }}>Membro</th>
                  <th style={{ textAlign: "left", padding: "6px 12px", fontWeight: 700 }}>Papel</th>
                  <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 700 }}>Tokens hoje</th>
                  <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 700 }}>Tokens mês</th>
                  <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 700 }}>Limite/dia</th>
                  <th style={{ textAlign: "right", padding: "6px 12px", fontWeight: 700 }}>Limite/mês</th>
                </tr>
              </thead>
              <tbody>
                {ativos.map((p, i) => {
                  const cor    = ROLE_COR[p.role] ?? "var(--dim)";
                  const pctDia = p.token_limit_day   ? Math.round((p.tokens_today / p.token_limit_day) * 100)   : null;
                  const pctMes = p.token_limit_month ? Math.round((p.tokens_month / p.token_limit_month) * 100) : null;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--line-2)", background: i % 2 ? "transparent" : "color-mix(in srgb, var(--panel) 40%, transparent)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: `color-mix(in srgb, ${cor} 18%, var(--panel-2))`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11, color: cor, flexShrink: 0 }}>
                            {(p.full_name ?? p.email ?? "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.full_name || "—"}</div>
                            <div style={{ fontSize: 10.5, color: "var(--dim)" }}>{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "2px 7px", borderRadius: 5, background: `color-mix(in srgb, ${cor} 15%, transparent)`, color: cor }}>
                          {ROLE_LABEL[p.role] ?? p.role}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <div>{(p.tokens_today ?? 0).toLocaleString("pt-BR")}</div>
                        {pctDia !== null && <div style={{ fontSize: 10, color: pctDia > 80 ? "var(--red)" : "var(--dim)" }}>{pctDia}%</div>}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <div>{(p.tokens_month ?? 0).toLocaleString("pt-BR")}</div>
                        {pctMes !== null && <div style={{ fontSize: 10, color: pctMes > 80 ? "var(--red)" : "var(--dim)" }}>{pctMes}%</div>}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>
                        {p.token_limit_day ? p.token_limit_day.toLocaleString("pt-BR") : <span style={{ color: "var(--mut)", fontStyle: "italic" }}>sem limite</span>}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--dim)", fontVariantNumeric: "tabular-nums" }}>
                        {p.token_limit_month ? p.token_limit_month.toLocaleString("pt-BR") : <span style={{ color: "var(--mut)", fontStyle: "italic" }}>sem limite</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 12 }}>
            Ajuste limites por pessoa em <Link href="/expand/rotinas" style={{ color: "var(--accent)" }}>Rotinas</Link> ou via <b>avançado →</b> no card do membro.
          </p>
        </>
      )}
    </>
  );
}
