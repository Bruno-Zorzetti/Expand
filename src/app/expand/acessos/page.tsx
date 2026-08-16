import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/expand-acesso";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

// Mapa de gates → labels curtos (mesma lista de MODULOS do [userId])
const GATE_LABEL: Record<string, { label: string; cor: string }> = {
  "tarefas.meudia":            { label: "Meu Dia",       cor: "#4F6BED" },
  "tarefas.board":             { label: "Board",          cor: "#4F6BED" },
  "tarefas.calendario":        { label: "Calendário",     cor: "#4F6BED" },
  "tarefas.plano":             { label: "Plano",          cor: "#4F6BED" },
  "projetos.clientes":         { label: "Clientes",       cor: "#6FBF92" },
  "projetos.equipe":           { label: "Equipe",         cor: "#6FBF92" },
  "projetos.produtos":         { label: "Produtos",       cor: "#6FBF92" },
  "ferramentas.grupos":        { label: "Grupos",         cor: "#86C0A6" },
  "ferramentas.apresentacoes": { label: "Apresentações",  cor: "#86C0A6" },
  "ferramentas.conhecimento":  { label: "Conhecimento",   cor: "#86C0A6" },
  "comercial.dashboard":       { label: "Com. Dashboard", cor: "#CE6A5F" },
  "comercial.funil":           { label: "Com. Funil",     cor: "#CE6A5F" },
  "comercial.placar":          { label: "Com. Placar",    cor: "#CE6A5F" },
  "comercial.meta":            { label: "Com. Meta",      cor: "#CE6A5F" },
  "comercial.guia":            { label: "Com. Guia",      cor: "#CE6A5F" },
  "financeiro.dashboard":      { label: "Fin. Dashboard", cor: "#C89B5E" },
  "financeiro.dre":            { label: "Fin. DRE",       cor: "#C89B5E" },
  "financeiro.metas":          { label: "Fin. Metas",     cor: "#C89B5E" },
  "financeiro.realizado":      { label: "Fin. Realizado", cor: "#C89B5E" },
  "financeiro.pagar":          { label: "Fin. A Pagar",   cor: "#C89B5E" },
  "financeiro.receber":        { label: "Fin. A Receber", cor: "#C89B5E" },
};

const ROLE_COR: Record<string, string> = {
  pendente: "var(--warn)",
  admin:    "var(--accent)",
  equipe:   "var(--green)",
  cliente:  "var(--accent-2)",
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
  mentor_agent: string | null;
  token_limit_day: number | null; token_limit_month: number | null;
  tokens_today: number; tokens_month: number;
  access_days: string[] | null; access_start: string | null; access_end: string | null;
  cliente_ids: string[] | null; funcoes: string[] | null;
};

async function aprovar(formData: FormData) {
  "use server";
  await exigirAdmin();
  const sb = await createClient();
  await sb.from("profiles").update({ role: String(formData.get("role")) }).eq("id", String(formData.get("id")));
  revalidatePath("/expand/acessos");
}

export default async function Acessos() {
  await exigirAdmin();
  const supabase = await createClient();

  const { data } = await supabase.rpc("admin_listar_perfis_v2");
  const perfis = (data ?? []) as Perfil[];

  // busca os módulos RBAC de cada usuário
  const { data: profilesData } = await supabase.from("profiles").select("id, expand_modulos");
  const modulosMap = Object.fromEntries(
    (profilesData ?? []).map((p: { id: string; expand_modulos: string[] | null }) => [p.id, p.expand_modulos ?? []])
  );

  const { data: clientesData } = await supabase.from("expand_clientes").select("id, nome").order("nome");
  const clienteMap = Object.fromEntries((clientesData ?? []).map((c: { id: string; nome: string }) => [c.id, c.nome]));

  const pendentes = perfis.filter(p => p.role === "pendente");
  const ativos    = perfis.filter(p => p.role !== "pendente");

  const totais = {
    admin:   ativos.filter(p => p.role === "admin").length,
    equipe:  ativos.filter(p => p.role === "equipe").length,
    cliente: ativos.filter(p => p.role === "cliente").length,
  };

  const chip = (label: string, color: string) => (
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", padding: "2px 7px", borderRadius: 6, background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>{label}</span>
  );

  const CardUsuario = (p: Perfil) => {
    const clientes   = (p.cliente_ids ?? []).map(id => clienteMap[id] ?? id).filter(Boolean);
    const funcoes    = p.funcoes ?? [];
    const modulos    = modulosMap[p.id] ?? [];
    const temLimites = p.token_limit_day || p.token_limit_month || p.access_start;
    const cor        = ROLE_COR[p.role] ?? "var(--dim)";
    const isAdmin    = p.role === "admin";

    return (
      <div key={p.id} className="hx-glass" style={{ borderRadius: 12, borderLeft: `3px solid ${cor}`, overflow: "hidden" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 10, padding: "13px 16px" }}>
          {/* Info principal */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{p.full_name || "—"}</span>
              {chip(ROLE_LABEL[p.role] ?? p.role, cor)}
              {p.tipo_acesso === "equipe"  && chip("◆ Equipe",  "var(--green)")}
              {p.tipo_acesso === "cliente" && chip("★ Cliente", "var(--accent-2)")}
              {temLimites && chip("⏱ Limites", "var(--mut)")}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>
              {p.email || p.id.slice(0, 10)} · {new Date(p.created_at).toLocaleDateString("pt-BR")}
            </div>

            {/* Clientes */}
            {clientes.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
                {clientes.map(c => (
                  <span key={c} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5, background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>{c}</span>
                ))}
              </div>
            )}

            {/* Funções */}
            {funcoes.length > 0 && (
              <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                {funcoes.map(f => (
                  <span key={f} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5, background: "color-mix(in srgb, var(--txt) 8%, transparent)", color: "var(--mut)", textTransform: "uppercase", letterSpacing: ".04em" }}>{f}</span>
                ))}
              </div>
            )}

            {/* Módulos ativos */}
            {isAdmin ? (
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 5, background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", fontWeight: 700 }}>✓ Acesso irrestrito (admin)</span>
              </div>
            ) : modulos.length > 0 ? (
              <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {modulos.map(g => {
                  const info = GATE_LABEL[g];
                  if (!info) return null;
                  return (
                    <span key={g} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: `color-mix(in srgb, ${info.cor} 12%, transparent)`, color: info.cor, fontWeight: 600 }}>
                      {info.label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 10.5, color: "var(--dim)", fontStyle: "italic" }}>Nenhum módulo configurado</span>
              </div>
            )}
          </div>

          {/* Tokens hoje */}
          {(p.token_limit_day || p.tokens_today > 0) && (
            <div style={{ textAlign: "center", minWidth: 80 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: p.token_limit_day && p.tokens_today >= p.token_limit_day ? "var(--red)" : "var(--txt)" }}>
                {(p.tokens_today / 1000).toFixed(1)}k
              </div>
              <div style={{ fontSize: 9.5, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                tokens hoje{p.token_limit_day ? ` / ${(p.token_limit_day / 1000).toFixed(0)}k` : ""}
              </div>
            </div>
          )}

          {/* Horário */}
          {p.access_start && (
            <div style={{ textAlign: "center", minWidth: 80 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--mut)" }}>{p.access_start}–{p.access_end}</div>
              <div style={{ fontSize: 9.5, color: "var(--dim)" }}>{(p.access_days ?? []).join(" ")}</div>
            </div>
          )}

          {/* Botão configurar */}
          <div style={{ display: "flex", gap: 8, alignSelf: "flex-start", marginTop: 2 }}>
            <Link href={`/expand/acessos/${p.id}`} className="hx-btn hx-btn-ghost" style={{ padding: "7px 14px", fontSize: 12.5 }}>
              Configurar →
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <p className="hx-eyebrow">Configurações · segurança</p>
      <h1 className="ex-h1">Controle de <span className="hx-accent-text">acessos</span></h1>
      <p className="ex-sub">
        Papéis · Módulos por pessoa · Agente mentor · Limites de tokens · Restrição de horário.
        Cada cadastro entra como <b style={{ color: "var(--warn)" }}>pendente</b> e só acessa após aprovação aqui.
      </p>

      {/* KPIs */}
      <div className="ex-kpis" style={{ marginBottom: 22 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Aguardando</div><div className="val" style={{ color: pendentes.length ? "var(--warn)" : "var(--dim)" }}>{pendentes.length}</div><div className="foot">Pendentes</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Admin</div><div className="val hx-accent-text">{totais.admin}</div><div className="foot">Diretoria</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Equipe</div><div className="val">{totais.equipe}</div><div className="foot">Operacional</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Clientes</div><div className="val">{totais.cliente}</div><div className="foot">Portais ativos</div></div>
      </div>

      {/* Pendentes — aprovação rápida */}
      {pendentes.length > 0 && (
        <>
          <div className="ex-grph"><span className="gt" style={{ color: "var(--warn)" }}>Aguardando aprovação</span><span className="gc">{pendentes.length}</span><span className="gl" /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 26 }}>
            {pendentes.map(p => (
              <div key={p.id} className="hx-glass" style={{ borderRadius: 12, borderLeft: "3px solid var(--warn)", padding: "13px 16px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.full_name || "—"}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{p.email} · {new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <form action={aprovar} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="role" value="equipe" />
                  <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "7px 14px", fontSize: 12.5 }}>Aprovar como Equipe</button>
                </form>
                <form action={aprovar} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="role" value="cliente" />
                  <button className="hx-btn hx-btn-ghost" type="submit" style={{ padding: "7px 14px", fontSize: 12.5 }}>Aprovar como Cliente</button>
                </form>
                <Link href={`/expand/acessos/${p.id}`} className="hx-btn hx-btn-ghost" style={{ padding: "7px 14px", fontSize: 12.5 }}>Configurar →</Link>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Ativos */}
      <div className="ex-grph"><span className="gt">Contas ativas</span><span className="gc">{ativos.length}</span><span className="gl" /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ativos.map(CardUsuario)}
      </div>

      <p style={{ marginTop: 20, fontSize: 11.5, color: "var(--dim)", lineHeight: 1.6 }}>
        Clique em <b>Configurar →</b> para definir módulos, funções, agente mentor, limites de tokens e restrições de horário de cada pessoa.
      </p>
    </>
  );
}
