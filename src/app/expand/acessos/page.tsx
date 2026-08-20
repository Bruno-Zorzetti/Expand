import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirAdmin } from "@/lib/expand-acesso";
import { revalidatePath } from "next/cache";
import { MODULOS, SECOES } from "@/lib/expand-modulos";
import { toggleModulo, liberarSecao, revogarSecao } from "../rbac/actions";

export const dynamic = "force-dynamic";

const PRESETS: Record<string, string[]> = {
  comercial: ["tarefas.meudia","tarefas.board","tarefas.calendario","comercial.dashboard","comercial.funil","comercial.placar","comercial.meta","comercial.guia","projetos.clientes","projetos.equipe"],
  cs:        ["tarefas.meudia","tarefas.board","tarefas.calendario","projetos.clientes","projetos.equipe","ferramentas.conhecimento"],
  designer:  ["tarefas.meudia","tarefas.board","tarefas.calendario","projetos.equipe","ferramentas.apresentacoes"],
  basico:    ["tarefas.meudia","tarefas.calendario"],
};

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
  const email  = String(formData.get("email") ?? "").trim().toLowerCase();
  const role   = String(formData.get("role")   ?? "equipe");
  const preset = String(formData.get("preset") ?? "");
  if (!email) return;
  const sb = createAdminClient();
  if (!sb) return;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://expand.hshs.com.br";
  await sb.auth.admin.inviteUserByEmail(email, { redirectTo: `${siteUrl}/aguardando`, data: { tipo_acesso: role } });
  const { data: u } = await sb.auth.admin.listUsers();
  const user = u.users.find((x: { email?: string }) => x.email === email);
  if (user) {
    const mods = PRESETS[preset] ?? [];
    await sb.from("profiles").update({
      role,
      ...(mods.length ? { expand_modulos: mods } : {}),
    }).eq("id", user.id);
  }
  revalidatePath("/expand/acessos");
}

async function salvarLimiteInline(formData: FormData) {
  "use server";
  await exigirAdmin();
  const userId = String(formData.get("userId"));
  const day    = formData.get("limitDay")   ? Number(formData.get("limitDay"))   : null;
  const month  = formData.get("limitMonth") ? Number(formData.get("limitMonth")) : null;
  const sb = createAdminClient();
  if (!sb) return;
  await sb.from("expand_user_config").upsert(
    { user_id: userId, token_limit_day: day, token_limit_month: month, access_days: ["seg","ter","qua","qui","sex"] },
    { onConflict: "user_id" }
  );
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

  // Dados extras de expand_perfis (cargo, foto) para os cards
  const membroSlugs = ativos.map(p => p.expand_membro).filter(Boolean) as string[];
  const { data: epData } = await supabase.from("expand_perfis")
    .select("id, nome, cargo, area, foto_url").eq("tipo", "humano");
  const epMap = Object.fromEntries((epData ?? []).map((e: { id: string; nome: string | null; cargo: string | null; area: string | null; foto_url: string | null }) => [e.id, e]));

  // Membros da equipe em expand_perfis ainda sem conta auth
  const semConta = (epData ?? []).filter(
    (e: { id: string }) => !membroSlugs.includes(e.id)
  ) as { id: string; nome: string | null; cargo: string | null; area: string | null; foto_url: string | null }[];

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
              const cor   = ROLE_COR[p.role] ?? "var(--dim)";
              const ep    = epMap[p.expand_membro ?? ""];
              const cargo = ep?.cargo ?? null;
              const ini   = (p.full_name ?? p.email ?? "?")[0].toUpperCase();
              return (
                <div key={p.id} className="hx-glass" style={{ borderRadius: 12, borderLeft: `3px solid ${cor}`, padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {/* Avatar */}
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: `color-mix(in srgb, ${cor} 18%, var(--panel-2))`, border: `1.5px solid color-mix(in srgb, ${cor} 40%, transparent)`, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15, color: cor, flexShrink: 0, overflow: "hidden" }}>
                      {ep?.foto_url
                        ? <img src={ep.foto_url} alt={ini} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : ini}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{p.full_name || "—"}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", padding: "1px 7px", borderRadius: 5, background: `color-mix(in srgb, ${cor} 15%, transparent)`, color: cor }}>{ROLE_LABEL[p.role] ?? p.role}</span>
                      </div>
                      {cargo && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 1, fontWeight: 500 }}>{cargo}</div>}
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
                        {(p.funcoes ?? []).map(f => (
                          <span key={f} style={{ fontSize: 9.5, padding: "1px 7px", borderRadius: 4, border: "1px solid var(--line-2)", color: "var(--dim)", background: "var(--bg)", textTransform: "uppercase", letterSpacing: ".04em" }}>{f}</span>
                        ))}
                        {(p.cliente_ids ?? []).length > 0 && (
                          <span style={{ fontSize: 9.5, padding: "1px 7px", borderRadius: 4, background: "color-mix(in srgb, var(--green) 12%, transparent)", color: "var(--green)", letterSpacing: ".04em" }}>
                            {(p.cliente_ids ?? []).length} cliente{(p.cliente_ids ?? []).length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--mut)", marginTop: 3 }}>{p.email}</div>
                    </div>
                    {/* Ações de role */}
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
                    <Link href={`/expand/acessos/${p.id}`} style={{ fontSize: 11.5, color: "var(--accent)", textDecoration: "none", flexShrink: 0, fontWeight: 600 }}>Configurar →</Link>
                  </div>
                </div>
              );
            })}
          </div>

          {semConta.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="ex-grph"><span className="gt" style={{ color: "var(--warn)" }}>Membros da equipe sem conta</span><span className="gc">{semConta.length}</span><span className="gl" /></div>
              <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 12, lineHeight: 1.6 }}>
                Estes membros existem no sistema mas ainda não receberam convite de acesso. Invite usando o formulário abaixo.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {semConta.map(m => {
                  const ini = ((m.nome ?? "?")[0] ?? "?").toUpperCase();
                  return (
                    <div key={m.id} className="hx-glass" style={{ borderRadius: 12, borderLeft: "3px solid var(--warn)", padding: "12px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "color-mix(in srgb, var(--warn) 18%, var(--panel-2))", border: "1.5px solid color-mix(in srgb, var(--warn) 40%, transparent)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, color: "var(--warn)", flexShrink: 0, overflow: "hidden" }}>
                          {m.foto_url
                            ? <img src={m.foto_url} alt={ini} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : ini}
                        </div>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{m.nome ?? "—"}</div>
                          {m.cargo && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 1 }}>{m.cargo}</div>}
                          <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 2, textTransform: "capitalize" }}>{m.area ?? ""}</div>
                        </div>
                        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "color-mix(in srgb, var(--warn) 15%, transparent)", color: "var(--warn)", fontWeight: 600 }}>
                          Sem conta
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="hx-glass" style={{ marginTop: 24, borderRadius: 12, padding: "20px 22px" }}>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: "var(--accent)" }}>Convidar por e-mail</p>
            <form action={convidar} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
              <label style={{ flex: 3, minWidth: 200, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>E-mail</span>
                <input name="email" type="email" required placeholder="nome@empresa.com" style={fld} />
              </label>
              <label style={{ flex: 1, minWidth: 110, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>Papel</span>
                <select name="role" style={fld}>
                  <option value="equipe">Equipe</option>
                  <option value="cliente">Cliente</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label style={{ flex: 1, minWidth: 130, display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--dim)" }}>Preset de módulos</span>
                <select name="preset" style={fld}>
                  <option value="">Sem preset</option>
                  <option value="comercial">Comercial</option>
                  <option value="cs">Customer Success</option>
                  <option value="designer">Designer</option>
                  <option value="basico">Acesso básico</option>
                </select>
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
                  <th style={{ padding: "6px 12px" }}></th>
                </tr>
              </thead>
              <tbody>
                {ativos.map((p, i) => {
                  const cor    = ROLE_COR[p.role] ?? "var(--dim)";
                  const pctDia = p.token_limit_day   ? Math.round((p.tokens_today / p.token_limit_day) * 100)   : null;
                  const pctMes = p.token_limit_month ? Math.round((p.tokens_month / p.token_limit_month) * 100) : null;
                  const inFld: React.CSSProperties = {
                    width: 90, padding: "4px 6px", fontSize: 12, borderRadius: 6,
                    background: "var(--bg)", border: "1px solid var(--line-2)",
                    color: "var(--txt)", outline: "none", textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  };
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
                      {/* Limites editáveis inline */}
                      <td colSpan={3} style={{ padding: "6px 12px" }}>
                        <form action={salvarLimiteInline} style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                          <input type="hidden" name="userId" value={p.id} />
                          <input type="number" name="limitDay"
                            defaultValue={p.token_limit_day ?? ""}
                            placeholder="∞ dia"
                            min={0} step={1000} style={inFld}
                          />
                          <input type="number" name="limitMonth"
                            defaultValue={p.token_limit_month ?? ""}
                            placeholder="∞ mês"
                            min={0} step={10000} style={inFld}
                          />
                          <button type="submit" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
                            Salvar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 12 }}>
            Deixe em branco para sem limite. Use <b>Configurar →</b> no card de Equipe para ajustes completos.
          </p>
        </>
      )}
    </>
  );
}
