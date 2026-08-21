import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirAdmin } from "@/lib/expand-acesso";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const FUNCOES = [
  { slug: "sdr",        label: "SDR" },
  { slug: "closer",     label: "Closer" },
  { slug: "cs",         label: "Customer Success" },
  { slug: "pmo",        label: "PMO / Gestão" },
  { slug: "designer",   label: "Designer" },
  { slug: "financeiro", label: "Financeiro" },
  { slug: "juridico",   label: "Jurídico" },
  { slug: "ops",        label: "Operações" },
  { slug: "tech",       label: "Tech / Dev" },
];

const DIAS = [
  { slug: "seg", label: "Seg" }, { slug: "ter", label: "Ter" },
  { slug: "qua", label: "Qua" }, { slug: "qui", label: "Qui" },
  { slug: "sex", label: "Sex" }, { slug: "sab", label: "Sáb" },
  { slug: "dom", label: "Dom" },
];

const AGENTES = [
  { slug: "",           label: "— nenhum —" },
  { slug: "teo",        label: "Téo (SDR / Closer)" },
  { slug: "bia",        label: "Bia (Customer Success)" },
  { slug: "aurelio",    label: "Aurélio (Jurídico)" },
  { slug: "henrique",   label: "Henrique (Mentor Advisor)" },
  { slug: "daniel",     label: "Daniel (Design Master)" },
  { slug: "financeiro", label: "Financeiro (Controladoria)" },
  { slug: "pmo",        label: "PMO (Gerente de Projetos)" },
];

// ── Módulos do sistema — gate = valor em expand_modulos / acessos ─────────────
const MODULOS = [
  // Tarefas
  { gate: "tarefas.meudia",      label: "Meu Dia",              desc: "Hub diário de tarefas e anotações",         grupo: "Tarefas",       cor: "#4F6BED" },
  { gate: "tarefas.board",       label: "Board",                desc: "Kanban de tarefas por conta",               grupo: "Tarefas",       cor: "#4F6BED" },
  { gate: "tarefas.calendario",  label: "Calendário",           desc: "Agenda pessoal e lembretes",                grupo: "Tarefas",       cor: "#4F6BED" },
  { gate: "tarefas.plano",       label: "Plano de Ação",        desc: "Objetivos e metas pessoais",                grupo: "Tarefas",       cor: "#4F6BED" },
  // Projetos
  { gate: "projetos.clientes",   label: "Clientes",             desc: "Carteira, histórico e portais dos clientes",grupo: "Projetos",      cor: "#6FBF92" },
  { gate: "projetos.equipe",     label: "Equipe",               desc: "Perfis de humanos e agentes IA",            grupo: "Projetos",      cor: "#6FBF92" },
  { gate: "projetos.produtos",   label: "Produtos",             desc: "Catálogo de produtos e processos padrão",   grupo: "Projetos",      cor: "#6FBF92" },
  // Ferramentas
  { gate: "ferramentas.grupos",       label: "Grupos",              desc: "Criador de grupos WhatsApp e squads",       grupo: "Ferramentas",   cor: "#86C0A6" },
  { gate: "ferramentas.apresentacoes",label: "Apresentações",       desc: "Criador de decks e slides",                 grupo: "Ferramentas",   cor: "#86C0A6" },
  { gate: "ferramentas.conhecimento", label: "Conhecimento",        desc: "Playbooks, funis, objeções e biblioteca",   grupo: "Ferramentas",   cor: "#86C0A6" },
  // Comercial
  { gate: "comercial.dashboard", label: "Comercial — Dashboard", desc: "Visão geral de vendas e resultados",       grupo: "Comercial",     cor: "#CE6A5F" },
  { gate: "comercial.funil",     label: "Comercial — Funil",    desc: "Pipeline CRM e leads",                      grupo: "Comercial",     cor: "#CE6A5F" },
  { gate: "comercial.placar",    label: "Comercial — Placar",   desc: "Gamificação e ranking diário",              grupo: "Comercial",     cor: "#CE6A5F" },
  { gate: "comercial.meta",      label: "Comercial — Meta",     desc: "Calculadora de metas de vendas",            grupo: "Comercial",     cor: "#CE6A5F" },
  { gate: "comercial.guia",      label: "Comercial — Guia",     desc: "Manual de uso do comercial",                grupo: "Comercial",     cor: "#CE6A5F" },
  // Financeiro
  { gate: "financeiro.dashboard",label: "Financeiro — Dashboard",desc: "DRE, valuation e visão geral",            grupo: "Financeiro",    cor: "#C89B5E" },
  { gate: "financeiro.dre",      label: "Financeiro — DRE",     desc: "Demonstrativo de resultados",               grupo: "Financeiro",    cor: "#C89B5E" },
  { gate: "financeiro.metas",    label: "Financeiro — Metas",   desc: "Metas financeiras e projeções",             grupo: "Financeiro",    cor: "#C89B5E" },
  { gate: "financeiro.realizado",label: "Financeiro — Realizado",desc: "Resultados realizados do período",         grupo: "Financeiro",    cor: "#C89B5E" },
  { gate: "financeiro.pagar",    label: "Financeiro — A Pagar", desc: "Contas a pagar e despesas",                 grupo: "Financeiro",    cor: "#C89B5E" },
  { gate: "financeiro.receber",  label: "Financeiro — A Receber",desc: "Contas a receber e receitas",              grupo: "Financeiro",    cor: "#C89B5E" },
];

const GRUPOS_MODULOS = ["Tarefas", "Projetos", "Ferramentas", "Comercial", "Financeiro"];

// ── Server actions ─────────────────────────────────────────────────────────────
async function gerarLinkConvite(formData: FormData) {
  "use server";
  await exigirAdmin();
  const email  = String(formData.get("email")  ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!email || !userId) redirect(`/expand/acessos/${userId}`);
  const adminSb = createAdminClient();
  if (!adminSb) redirect(`/expand/acessos/${userId}?err=1`);
  const { data } = await adminSb!.auth.admin.generateLink({ type: "invite", email });
  const link = data?.properties?.action_link ?? null;
  if (link) redirect(`/expand/acessos/${userId}?lk=${encodeURIComponent(link)}&lt=convite`);
  redirect(`/expand/acessos/${userId}?err=1`);
}

async function gerarLinkSenha(formData: FormData) {
  "use server";
  await exigirAdmin();
  const email  = String(formData.get("email")  ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!email || !userId) redirect(`/expand/acessos/${userId}`);
  const adminSb = createAdminClient();
  if (!adminSb) redirect(`/expand/acessos/${userId}?err=1`);
  const { data } = await adminSb!.auth.admin.generateLink({ type: "recovery", email });
  const link = data?.properties?.action_link ?? null;
  if (link) redirect(`/expand/acessos/${userId}?lk=${encodeURIComponent(link)}&lt=senha`);
  redirect(`/expand/acessos/${userId}?err=1`);
}

async function alterarEmail(formData: FormData) {
  "use server";
  await exigirAdmin();
  const userId   = String(formData.get("userId")    ?? "").trim();
  const novoEmail = String(formData.get("novo_email") ?? "").trim();
  if (!userId || !novoEmail) redirect(`/expand/acessos/${userId}`);
  const adminSb = createAdminClient();
  if (!adminSb) redirect(`/expand/acessos/${userId}?err=1`);
  await adminSb!.auth.admin.updateUserById(userId, { email: novoEmail });
  redirect(`/expand/acessos/${userId}?msg=email_ok&ne=${encodeURIComponent(novoEmail)}`);
}

async function gerarIcsToken(formData: FormData) {
  "use server";
  await exigirAdmin();
  const slug = String(formData.get("membroSlug") ?? "").trim();
  if (!slug) return;
  const adminSb = createAdminClient();
  if (adminSb) {
    await adminSb.from("expand_perfis")
      .update({ ics_token: crypto.randomUUID() })
      .eq("id", slug);
  }
  revalidatePath("/expand/acessos");
}

async function salvar(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = await createClient();

  const userId  = String(formData.get("userId"));
  const role    = String(formData.get("role"));
  const membro  = String(formData.get("membro") ?? "").trim();

  // acessos legados para compatibilidade
  const acessos: string[] = [];
  if (formData.get("ac_comercial") === "on")   acessos.push("comercial");
  if (formData.get("ac_pmo") === "on")          acessos.push("pmo");
  if (formData.get("ac_financeiro") === "on")   acessos.push("financeiro");

  // módulos RBAC — lê todos os gates marcados
  const modulos = MODULOS.map(m => m.gate).filter(g => formData.get(`mod_${g.replace(/\./g, "_")}`) === "on");

  // clientes vinculados
  const clienteIds = formData.getAll("clientes[]").map(String).filter(Boolean);

  // funções
  const funcoes = FUNCOES.map(f => f.slug).filter(s => formData.get(`fn_${s}`) === "on");

  // agente mentor + bloqueados
  const mentorAgent   = String(formData.get("mentor_agent") ?? "").trim();
  const agentsBlocked = AGENTES.filter(a => a.slug)
    .map(a => a.slug)
    .filter(s => formData.get(`agents_blocked_${s}`) === "on");

  // limites
  const tlDay   = formData.get("token_limit_day")   ? Number(formData.get("token_limit_day"))   : null;
  const tlMonth = formData.get("token_limit_month") ? Number(formData.get("token_limit_month")) : null;

  // horário
  const dias       = DIAS.map(d => d.slug).filter(s => formData.get(`dia_${s}`) === "on");
  const accessStart = String(formData.get("access_start") ?? "").trim();
  const accessEnd   = String(formData.get("access_end")   ?? "").trim();

  // salva acessos legados + modulos RBAC juntos em expand_modulos
  await sb.rpc("admin_salvar_config_usuario", {
    p_user_id:           userId,
    p_role:              role,
    p_membro:            membro,
    p_acessos_extras:    acessos,
    p_cliente_ids:       clienteIds,
    p_funcoes:           funcoes,
    p_mentor_agent:      mentorAgent,
    p_agents_allowed:    null,
    p_agents_blocked:    agentsBlocked,
    p_token_limit_day:   tlDay,
    p_token_limit_month: tlMonth,
    p_access_days:       dias.length ? dias : ["seg","ter","qua","qui","sex"],
    p_access_start:      accessStart,
    p_access_end:        accessEnd,
  });

  // persiste os módulos RBAC em expand_modulos via admin client (bypassa RLS)
  const adminSb = createAdminClient();
  if (adminSb) await adminSb.from("profiles").update({ expand_modulos: modulos }).eq("id", userId);

  revalidatePath("/expand/acessos");
  redirect("/expand/acessos");
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function ConfigurarUsuario({ params, searchParams }: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  await exigirAdmin();
  const { userId } = await params;
  const sp = await searchParams;
  const geradoLink = sp.lk ? decodeURIComponent(sp.lk) : null;
  const geradoTipo = sp.lt ?? null;
  const errorMsg   = sp.err ? "Erro ao gerar o link. Verifique o email e tente novamente." : null;
  const emailOk    = sp.msg === "email_ok" ? (sp.ne ? `Email alterado para ${decodeURIComponent(sp.ne)}` : "Email alterado!") : null;
  const sb = await createClient();

  const { data: pData } = await sb.rpc("admin_listar_perfis_v2");
  const perfil = ((pData ?? []) as Array<Record<string, unknown>>).find(p => p.id === userId);
  if (!perfil) redirect("/expand/acessos");

  const { data: pessoasData } = await sb.from("expand_perfis").select("id, nome, cargo").eq("tipo", "humano").order("nome");
  const pessoas = (pessoasData ?? []) as { id: string; nome: string; cargo: string | null }[];

  const { data: clientesData } = await sb.from("expand_clientes").select("id, nome").order("nome");
  const clientes = (clientesData ?? []) as { id: string; nome: string }[];

  // ICS token do expand_perfis vinculado
  const membroSlug = String(perfil.expand_membro ?? "").trim();
  const { data: icsData } = membroSlug
    ? await sb.from("expand_perfis").select("ics_token").eq("id", membroSlug).single()
    : { data: null };
  const icsToken  = (icsData?.ics_token as string | null) ?? null;
  const baseUrl   = siteUrl();
  const icsUrl    = icsToken ? `${baseUrl}/api/calendario/${icsToken}.ics` : null;

  // perfil atual do usuário
  const { data: profileData } = await sb.from("profiles").select("expand_modulos").eq("id", userId).single();
  const modulosAtivos = (profileData?.expand_modulos as string[] | null) ?? [];

  const clienteIds  = (perfil.cliente_ids  as string[] | null) ?? [];
  const funcoes     = (perfil.funcoes       as string[] | null) ?? [];
  const acessos     = (perfil.acessos       as string[] | null) ?? [];
  const accessDays  = (perfil.access_days   as string[] | null) ?? ["seg","ter","qua","qui","sex"];

  // helpers de estilo
  const fld: CSSProperties = {
    background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8,
    color: "var(--txt)", padding: "7px 10px", fontSize: 13, outline: "none",
    fontFamily: "inherit", width: "100%",
  };
  const sec = (title: string, subtitle: string | null, children: ReactNode) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: subtitle ? 2 : 12, paddingBottom: subtitle ? 0 : 6, borderBottom: subtitle ? "none" : "1px solid var(--line-2)" }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3, marginBottom: 10, borderBottom: "1px solid var(--line-2)", paddingBottom: 8 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
  const row = (...children: ReactNode[]) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>{children}</div>
  );
  const col = (label: string, children: ReactNode, hint?: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 10.5, color: "var(--dim)", lineHeight: 1.4 }}>{hint}</span>}
    </label>
  );
  const chk = (name: string, label: string, checked: boolean) => (
    <label key={name} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--txt)", cursor: "pointer" }}>
      <input type="checkbox" name={name} defaultChecked={checked} style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
      {label}
    </label>
  );

  const nome  = String(perfil.full_name ?? "Usuário");
  const email = String(perfil.email ?? "");
  const role  = String(perfil.role  ?? "pendente");

  return (
    <>
      <p className="hx-eyebrow">Controle de acessos · configuração</p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <h1 className="ex-h1" style={{ margin: 0 }}>{nome}</h1>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", padding: "3px 9px", borderRadius: 7, background: `color-mix(in srgb, var(--accent) 12%, transparent)`, color: "var(--accent)" }}>{role}</span>
      </div>
      <p className="ex-sub" style={{ marginBottom: 28 }}>{email}</p>

      {/* ── Flash de feedback ──────────────────────────────── */}
      {(errorMsg || emailOk || geradoLink) && (
        <div style={{ marginBottom: 24 }}>
          {errorMsg && (
            <div style={{ background: "color-mix(in srgb,var(--red) 12%,transparent)", border: "1px solid color-mix(in srgb,var(--red) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "var(--red)", marginBottom: 8 }}>
              ⚠ {errorMsg}
            </div>
          )}
          {emailOk && (
            <div style={{ background: "color-mix(in srgb,var(--green) 12%,transparent)", border: "1px solid color-mix(in srgb,var(--green) 30%,transparent)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "var(--green)", marginBottom: 8 }}>
              ✓ {emailOk}
            </div>
          )}
          {geradoLink && (
            <div style={{ background: "color-mix(in srgb,var(--accent) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--accent) 30%,transparent)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                🔗 Link de {geradoTipo === "convite" ? "convite (primeiro acesso)" : "redefinição de senha"} gerado
              </div>
              <p style={{ fontSize: 11.5, color: "var(--mut)", margin: "0 0 10px", lineHeight: 1.5 }}>
                Copie e envie para <b>{email}</b> via WhatsApp ou email.{" "}
                Válido por {geradoTipo === "convite" ? "24 horas" : "1 hora"} — uso único.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input readOnly value={geradoLink} style={{ ...fld, fontFamily: "monospace", fontSize: 11, flex: 1, minWidth: 200 }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Credenciais & Acesso ─────────────────────────── */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--line-2)", borderRadius: 14, padding: "16px 18px", marginBottom: 28 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid var(--line-2)" }}>
          Credenciais &amp; Acesso
        </div>
        <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 14, lineHeight: 1.5 }}>
          Ações de autenticação. Todos os links gerados são de uso único e expiram automaticamente.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <form action={gerarLinkConvite}>
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="email" value={email} />
            <button type="submit" style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--accent)", background: "color-mix(in srgb,var(--accent) 12%,transparent)", color: "var(--accent)", cursor: "pointer", fontFamily: "inherit" }}>
              🔗 Gerar link de convite
            </button>
          </form>
          <form action={gerarLinkSenha}>
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="email" value={email} />
            <button type="submit" style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line-2)", background: "transparent", color: "var(--dim)", cursor: "pointer", fontFamily: "inherit" }}>
              🔑 Gerar link de redefinição de senha
            </button>
          </form>
        </div>
        <form action={alterarEmail} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line-2)" }}>
          <input type="hidden" name="userId" value={userId} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", marginBottom: 4 }}>Alterar email</label>
            <input name="novo_email" type="email" placeholder={`Novo email (atual: ${email})`} required style={fld} />
          </div>
          <button type="submit" style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line-2)", background: "transparent", color: "var(--dim)", cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-end" }}>
            ✏️ Alterar email
          </button>
        </form>
      </div>

      <form action={salvar}>
        <input type="hidden" name="userId" value={userId} />

        {/* ── Papel e vínculo ──────────────────────────────────────── */}
        {sec("Acesso e papel", null, <>
          {row(
            col("Papel no sistema",
              <select name="role" defaultValue={role} style={fld}>
                <option value="pendente">Pendente (sem acesso)</option>
                <option value="equipe">Equipe</option>
                <option value="admin">Admin (diretoria)</option>
                <option value="cliente">Cliente</option>
              </select>
            ),
            col("Vincular à pessoa da equipe",
              <select name="membro" defaultValue={String(perfil.expand_membro ?? "")} style={fld}>
                <option value="">— não vinculado —</option>
                {pessoas.map(x => <option key={x.id} value={x.id}>{x.nome}{x.cargo ? ` (${x.cargo})` : ""}</option>)}
              </select>,
              "Associa este login ao perfil correto no sistema"
            )
          )}
        </>)}

        {/* ── Módulos e permissões ─────────────────────────────────── */}
        {sec("Módulos e permissões",
          "Admin tem acesso irrestrito. Para equipe e cliente, ative os módulos que esta pessoa pode ver e usar.",
          <>
            <div style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12 }}>
              <b style={{ color: "var(--accent)" }}>Admin</b> — tem acesso irrestrito a tudo, independente das seleções abaixo.
            </div>
            {GRUPOS_MODULOS.map(grupo => {
              const items = MODULOS.filter(m => m.grupo === grupo);
              return (
                <div key={grupo} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: items[0]?.cor ?? "var(--dim)", background: `color-mix(in srgb, ${items[0]?.cor ?? "#888"} 15%, transparent)`, padding: "2px 8px", borderRadius: 5 }}>{grupo}</span>
                    <div style={{ flex: 1, height: 1, background: "var(--line-2)" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 7 }}>
                    {items.map(m => {
                      const key  = `mod_${m.gate.replace(/\./g, "_")}`;
                      const ativo = modulosAtivos.includes(m.gate);
                      return (
                        <label key={m.gate} style={{
                          display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 12px",
                          borderRadius: 10, cursor: "pointer",
                          border: `1px solid ${ativo ? m.cor : "var(--line-2)"}`,
                          background: ativo ? `color-mix(in srgb, ${m.cor} 8%, transparent)` : "transparent",
                          transition: "border-color .15s, background .15s",
                        }}>
                          <input type="checkbox" name={key} defaultChecked={ativo}
                            style={{ accentColor: m.cor, width: 14, height: 14, marginTop: 3, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: ativo ? m.cor : "var(--txt)", lineHeight: 1.3 }}>
                              {m.label.includes(" — ") ? m.label.split(" — ")[1] : m.label}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.4, marginTop: 2 }}>{m.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── Clientes atendidos ───────────────────────────────────── */}
        {sec("Clientes atendidos",
          "Quais contas este colaborador atende. Pode marcar mais de uma.",
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
            {clientes.map(c => (
              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, border: `1px solid ${clienteIds.includes(c.id) ? "var(--accent)" : "var(--line-2)"}`, background: clienteIds.includes(c.id) ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "transparent", cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" name="clientes[]" value={c.id} defaultChecked={clienteIds.includes(c.id)} style={{ accentColor: "var(--accent)" }} />
                {c.nome}
              </label>
            ))}
          </div>
        )}

        {/* ── Funções / papéis ─────────────────────────────────────── */}
        {sec("Funções / papéis",
          "Uma pessoa pode ter múltiplas funções (ex: SDR + PMO).",
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
            {FUNCOES.map(f => (
              <label key={f.slug} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, border: `1px solid ${funcoes.includes(f.slug) ? "var(--green)" : "var(--line-2)"}`, background: funcoes.includes(f.slug) ? "color-mix(in srgb, var(--green) 8%, transparent)" : "transparent", cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" name={`fn_${f.slug}`} defaultChecked={funcoes.includes(f.slug)} style={{ accentColor: "var(--green)" }} />
                {f.label}
              </label>
            ))}
          </div>
        )}

        {/* ── Agente mentor ────────────────────────────────────────── */}
        {sec("Agente mentor e IA", null, <>
          {row(
            col("Agente mentor",
              <select name="mentor_agent" defaultValue={String(perfil.mentor_agent ?? "")} style={fld}>
                {AGENTES.map(a => <option key={a.slug} value={a.slug}>{a.label}</option>)}
              </select>,
              "Este agente orienta e responde dúvidas do dia a dia desta pessoa"
            )
          )}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "var(--dim)", marginBottom: 8 }}>Agentes bloqueados</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 6 }}>
              {AGENTES.filter(a => a.slug).map(a =>
                chk(`agents_blocked_${a.slug}`, a.label, ((perfil.agents_blocked as string[] | null) ?? []).includes(a.slug))
              )}
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 10, lineHeight: 1.5 }}>
            Deixe todos desbloqueados para acesso irrestrito. Bloquear Financeiro impede consulta de dados financeiros.
          </p>
        </>)}

        {/* ── Limites de tokens ────────────────────────────────────── */}
        {sec("Limites de uso (tokens)",
          `Deixe em branco para sem limite. Uso atual: ${(Number(perfil.tokens_today ?? 0) / 1000).toFixed(1)}k hoje · ${(Number(perfil.tokens_month ?? 0) / 1000).toFixed(1)}k este mês.`,
          row(
            col("Limite diário", <input type="number" name="token_limit_day" defaultValue={perfil.token_limit_day ? String(perfil.token_limit_day) : ""} placeholder="Ex: 50000" style={fld} min={0} step={1000} />, "0 = bloqueado; vazio = sem limite"),
            col("Limite mensal",  <input type="number" name="token_limit_month" defaultValue={perfil.token_limit_month ? String(perfil.token_limit_month) : ""} placeholder="Ex: 500000" style={fld} min={0} step={10000} />)
          )
        )}

        {/* ── Restrição de horário ─────────────────────────────────── */}
        {sec("Restrição de horário",
          "Deixe vazio para acesso 24/7. Configure para colaboradores que só devem acessar em horário comercial.",
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
              {DIAS.map(d => (
                <label key={d.slug} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid ${accessDays.includes(d.slug) ? "var(--accent)" : "var(--line-2)"}`, background: accessDays.includes(d.slug) ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent", cursor: "pointer", fontSize: 12.5 }}>
                  <input type="checkbox" name={`dia_${d.slug}`} defaultChecked={accessDays.includes(d.slug)} style={{ accentColor: "var(--accent)" }} />
                  {d.label}
                </label>
              ))}
            </div>
            {row(
              col("Horário início", <input type="time" name="access_start" defaultValue={String(perfil.access_start ?? "")} style={fld} />),
              col("Horário fim",    <input type="time" name="access_end"   defaultValue={String(perfil.access_end   ?? "")} style={fld} />)
            )}
          </>
        )}

        {/* ── Calendário ICS ──────────────────────────────────────── */}
        {sec("Calendário ICS", null, <>
          {membroSlug ? (
            icsUrl ? (
              <div>
                <p style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 8, lineHeight: 1.6 }}>
                  Link de assinatura ICS do calendário desta pessoa. Copie e use em Google Calendar → Outros calendários → Por URL.
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input readOnly value={icsUrl} style={{ ...fld, fontFamily: "monospace", fontSize: 11.5, flex: 1, minWidth: 200 }} />
                  <form action={gerarIcsToken} style={{ flexShrink: 0 }}>
                    <input type="hidden" name="membroSlug" value={membroSlug} />
                    <button type="submit" style={{ fontSize: 11.5, padding: "7px 14px", borderRadius: 8, border: "1px solid var(--line-2)", background: "transparent", color: "var(--dim)", cursor: "pointer" }}>
                      Revogar e gerar novo
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 10 }}>
                  Esta pessoa ainda não tem um token de calendário. Gere agora.
                </p>
                <form action={gerarIcsToken}>
                  <input type="hidden" name="membroSlug" value={membroSlug} />
                  <button type="submit" className="hx-btn hx-btn-primary" style={{ fontSize: 13 }}>
                    Gerar token de calendário
                  </button>
                </form>
              </div>
            )
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--mut)", fontStyle: "italic" }}>
              Vincule um perfil no campo "Vincular à pessoa da equipe" para ativar o calendário.
            </p>
          )}
        </>)}

        {/* ── Salvar ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
          <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "10px 24px", fontSize: 14 }}>Salvar configurações</button>
          <a href="/expand/acessos" className="hx-btn hx-btn-ghost" style={{ padding: "10px 18px", fontSize: 14 }}>Cancelar</a>
        </div>
      </form>
    </>
  );
}
