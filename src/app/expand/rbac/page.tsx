import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/expand-acesso";

export const dynamic = "force-dynamic";

type Perfil = {
  id: string; full_name: string | null; email: string | null;
  role: string; expand_membro: string | null; expand_cliente: string | null;
  acessos: string[] | null; created_at: string;
};

const PAPEL_COR: Record<string, string> = {
  pendente: "var(--warn)",
  equipe: "var(--green)",
  admin: "var(--accent)",
  cliente: "var(--accent-2)",
};

const PERMISSOES = [
  { key: "comercial", label: "Comercial", desc: "Acesso ao departamento Comercial (placar, meta, guia)" },
  { key: "pmo", label: "PMO", desc: "Vê tarefas de toda a equipe no Meu Dia (hub do dia)" },
];

async function salvarPermissoes(formData: FormData) {
  "use server";
  await exigirAdmin();
  const supabase = await createClient();
  const acessos: string[] = [];
  if (formData.get("comercial") === "on") acessos.push("comercial");
  if (formData.get("pmo") === "on") acessos.push("pmo");
  await supabase.rpc("admin_definir_acesso", {
    p_id: String(formData.get("id")),
    p_role: String(formData.get("role")),
    p_membro: String(formData.get("membro") ?? "").trim() || null,
    p_cliente: String(formData.get("cliente") ?? "").trim() || null,
    p_acessos: acessos,
  });
  revalidatePath("/expand/rbac");
  revalidatePath("/expand/acessos");
}

export default async function RBACPage() {
  await exigirAdmin();
  const supabase = await createClient();
  const { data: pData } = await supabase.rpc("admin_listar_perfis");
  const todos = (pData ?? []) as Perfil[];
  const perfis = todos.filter((p) => p.role !== "pendente");
  const pendentes = todos.filter((p) => p.role === "pendente");

  const fld: React.CSSProperties = {
    background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 6,
    color: "var(--txt)", padding: "4px 6px", fontSize: 11.5, outline: "none", fontFamily: "inherit",
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `1fr 130px ${PERMISSOES.map(() => "90px").join(" ")} 80px`,
    gap: 1,
    alignItems: "center",
  };

  return (
    <>
      <p className="hx-eyebrow">Configurações · segurança</p>
      <h1 className="ex-h1">Permissões <span className="hx-accent-text">RBAC</span></h1>
      <p className="ex-sub">Matriz de permissões por usuário. <b style={{ color: "var(--accent)" }}>Admin</b> tem acesso total automaticamente (marcado com ✓). Os checkboxes concedem acesso granular a contas com papel <b style={{ color: "var(--green)" }}>Equipe</b>.</p>

      <div className="ex-kpis" style={{ marginBottom: 20 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Admins</div><div className="val hx-accent-text">{perfis.filter((p) => p.role === "admin").length}</div><div className="foot">Acesso total</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Equipe</div><div className="val">{perfis.filter((p) => p.role === "equipe").length}</div><div className="foot">Permissões granulares</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Clientes</div><div className="val">{perfis.filter((p) => p.role === "cliente").length}</div><div className="foot">Portal PIDE</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Pendentes</div><div className="val" style={{ color: pendentes.length ? "var(--warn)" : "var(--dim)" }}>{pendentes.length}</div><div className="foot">Aguardando aprovação</div></div>
      </div>

      {/* Cabeçalho da tabela */}
      <div style={{ ...grid, padding: "0 14px 8px", fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: ".06em" }}>
        <div>Usuário</div>
        <div style={{ textAlign: "center" }}>Papel</div>
        {PERMISSOES.map((p) => (
          <div key={p.key} style={{ textAlign: "center" }} title={p.desc}>{p.label}</div>
        ))}
        <div />
      </div>

      {/* Linhas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {perfis.map((p) => (
          <form key={p.id} action={salvarPermissoes} className="hx-glass" style={{ ...grid, padding: "10px 14px", borderRadius: 12, borderLeft: `3px solid ${PAPEL_COR[p.role] ?? "var(--dim)"}` }}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="membro" value={p.expand_membro ?? ""} />
            <input type="hidden" name="cliente" value={p.expand_cliente ?? ""} />

            {/* Usuário */}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.full_name || "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--dim)" }}>{p.email || p.id.slice(0, 8)}</div>
            </div>

            {/* Papel */}
            <div style={{ textAlign: "center" }}>
              <select name="role" defaultValue={p.role} style={{ ...fld, color: PAPEL_COR[p.role] ?? "var(--txt)", fontWeight: 700 }}>
                <option value="equipe">Equipe</option>
                <option value="admin">Admin</option>
                <option value="cliente">Cliente</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>

            {/* Permissões */}
            {PERMISSOES.map((perm) => (
              <div key={perm.key} style={{ textAlign: "center" }}>
                {p.role === "admin" ? (
                  <span style={{ color: "var(--accent)", fontSize: 14, fontWeight: 700 }} title="Admin tem acesso automático">✓</span>
                ) : (
                  <input
                    type="checkbox"
                    name={perm.key}
                    defaultChecked={p.acessos?.includes(perm.key) ?? false}
                    disabled={p.role === "cliente" || p.role === "pendente"}
                    title={p.role === "cliente" || p.role === "pendente" ? "Não aplicável para este papel" : perm.desc}
                    style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: p.role === "cliente" || p.role === "pendente" ? "not-allowed" : "pointer" }}
                  />
                )}
              </div>
            ))}

            {/* Ação */}
            <div style={{ textAlign: "right" }}>
              <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "6px 12px", fontSize: 11.5 }}>Salvar</button>
            </div>
          </form>
        ))}

        {perfis.length === 0 && (
          <div className="hx-glass" style={{ padding: "20px 22px", color: "var(--mut)" }}>Nenhum usuário ativo cadastrado.</div>
        )}
      </div>

      {pendentes.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="ex-grph"><span className="gt" style={{ color: "var(--warn)" }}>Aguardando aprovação</span><span className="gc">{pendentes.length}</span><span className="gl" /></div>
          {pendentes.map((p) => (
            <form key={p.id} action={salvarPermissoes} className="hx-glass" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, borderLeft: "3px solid var(--warn)", marginBottom: 6 }}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="membro" value={p.expand_membro ?? ""} />
              <input type="hidden" name="cliente" value={p.expand_cliente ?? ""} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.full_name || "—"}</div>
                <div style={{ fontSize: 11, color: "var(--dim)" }}>{p.email || p.id.slice(0, 8)}</div>
              </div>
              <select name="role" defaultValue="equipe" style={{ ...fld }}>
                <option value="equipe">Equipe</option>
                <option value="admin">Admin</option>
                <option value="cliente">Cliente</option>
                <option value="pendente">Manter pendente</option>
              </select>
              <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "6px 14px", fontSize: 12 }}>Aprovar</button>
            </form>
          ))}
        </div>
      )}

      <p style={{ marginTop: 18, fontSize: 11.5, color: "var(--dim)", lineHeight: 1.6 }}>
        <b>Comercial</b>: acesso a placar, calculadora e guia do comercial sem precisar de admin.<br />
        <b>PMO</b>: no Meu Dia, vê tarefas de <em>toda</em> a equipe (não só as próprias). Ideal para gerentes de projeto.<br />
        Para vincular o usuário a uma pessoa ou cliente, use a página <a href="/expand/acessos" style={{ color: "var(--accent)" }}>Acessos</a>.
      </p>
    </>
  );
}
