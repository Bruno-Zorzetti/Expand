import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/expand-acesso";

export const dynamic = "force-dynamic";

type Perfil = { id: string; full_name: string | null; email: string | null; role: string; expand_membro: string | null; expand_cliente: string | null; created_at: string };
const ROLE_ROTULO: Record<string, { l: string; c: string }> = {
  pendente: { l: "Pendente", c: "var(--warn)" },
  admin: { l: "Admin (diretoria)", c: "var(--accent)" },
  equipe: { l: "Equipe", c: "var(--green)" },
  cliente: { l: "Cliente", c: "var(--accent-2)" },
};

async function definirAcesso(formData: FormData) {
  "use server";
  await exigirAdmin();
  const supabase = await createClient();
  await supabase.rpc("admin_definir_acesso", {
    p_id: String(formData.get("id")),
    p_role: String(formData.get("role")),
    p_membro: String(formData.get("membro") ?? "").trim() || null,
    p_cliente: String(formData.get("cliente") ?? "").trim() || null,
  });
  revalidatePath("/expand/acessos");
}

export default async function Acessos() {
  await exigirAdmin();
  const supabase = await createClient();
  const { data: pData } = await supabase.rpc("admin_listar_perfis");
  const perfis = (pData ?? []) as Perfil[];
  const { data: pessoasData } = await supabase.from("expand_perfis").select("id, nome, tipo").eq("tipo", "humano").order("nome");
  const pessoas = (pessoasData ?? []) as { id: string; nome: string }[];
  const { data: clientesData } = await supabase.from("expand_clientes").select("id, nome").order("nome");
  const clientes = (clientesData ?? []) as { id: string; nome: string }[];

  const pendentes = perfis.filter((p) => p.role === "pendente");
  const ativos = perfis.filter((p) => p.role !== "pendente");
  const fld: React.CSSProperties = { background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--txt)", padding: "6px 8px", fontSize: 12.5, outline: "none", fontFamily: "inherit" };

  const Linha = (p: Perfil) => (
    <form key={p.id} action={definirAcesso} className="hx-glass" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, borderLeft: `3px solid ${ROLE_ROTULO[p.role]?.c ?? "var(--dim)"}` }}>
      <input type="hidden" name="id" value={p.id} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--txt)" }}>{p.full_name || "—"}</div>
        <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{p.email || p.id.slice(0, 8)} · desde {new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700 }}>Papel</span>
        <select name="role" defaultValue={p.role} style={fld}>
          <option value="pendente">Pendente (sem acesso)</option>
          <option value="equipe">Equipe</option>
          <option value="admin">Admin (diretoria)</option>
          <option value="cliente">Cliente</option>
        </select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700 }}>Vincular à pessoa</span>
        <select name="membro" defaultValue={p.expand_membro ?? ""} style={fld}><option value="">—</option>{pessoas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--dim)", fontWeight: 700 }}>Vincular ao cliente</span>
        <select name="cliente" defaultValue={p.expand_cliente ?? ""} style={fld}><option value="">—</option>{clientes.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
      </label>
      <button className="hx-btn hx-btn-primary" type="submit" style={{ padding: "8px 14px", fontSize: 12.5, alignSelf: "end" }}>Salvar</button>
    </form>
  );

  return (
    <>
      <p className="hx-eyebrow">Configurações · segurança</p>
      <h1 className="ex-h1">Controle de <span className="hx-accent-text">acessos</span></h1>
      <p className="ex-sub">Todo cadastro — equipe ou cliente — entra como <b style={{ color: "var(--warn)" }}>pendente</b> e só ganha acesso quando você aprova aqui. <b style={{ color: "var(--accent)" }}>Admin</b> vê tudo (dados sensíveis); <b style={{ color: "var(--green)" }}>Equipe</b> vê as próprias tarefas e a operação; <b style={{ color: "var(--accent-2)" }}>Cliente</b> vê só o portal.</p>

      <div className="ex-kpis" style={{ marginBottom: 18 }}>
        <div className="ex-kpi hx-glass"><div className="lab">Aguardando aprovação</div><div className="val" style={{ color: pendentes.length ? "var(--warn)" : "var(--dim)" }}>{pendentes.length}</div><div className="foot">Novos cadastros</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Admins</div><div className="val hx-accent-text">{ativos.filter((p) => p.role === "admin").length}</div><div className="foot">Diretoria</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Equipe</div><div className="val">{ativos.filter((p) => p.role === "equipe").length}</div><div className="foot">Com acesso operacional</div></div>
        <div className="ex-kpi hx-glass"><div className="lab">Clientes</div><div className="val">{ativos.filter((p) => p.role === "cliente").length}</div><div className="foot">Com portal</div></div>
      </div>

      <div className="ex-grph"><span className="gt" style={{ color: "var(--warn)" }}>Aguardando aprovação</span><span className="gc">{pendentes.length}</span><span className="gl" /></div>
      {pendentes.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>{pendentes.map(Linha)}</div>
      ) : <p style={{ fontSize: 12.5, color: "var(--dim)", marginBottom: 22 }}>Nenhum cadastro pendente. 🎉</p>}

      <div className="ex-grph"><span className="gt">Contas ativas</span><span className="gc">{ativos.length}</span><span className="gl" /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{ativos.map(Linha)}</div>

      <p style={{ marginTop: 18, fontSize: 11.5, color: "var(--dim)", lineHeight: 1.55 }}>Dica: para <b>equipe</b>, vincule à pessoa (aparece como ela no time e nas tarefas). Para <b>cliente</b>, vincule à conta (abre o portal do PIDE dele). <b>Admin</b> é só para você e o Pedro — quem vê Comercial, Finanças e Configurações.</p>
    </>
  );
}
