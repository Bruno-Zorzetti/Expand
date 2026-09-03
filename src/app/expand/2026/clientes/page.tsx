import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NovoClienteModal from "@/components/expand/NovoClienteModal";

export const dynamic = "force-dynamic";

export default async function ClientesPage2026() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/expand/2026/clientes");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = (profile?.role as string) === "admin";

  let clienteIds: string[] | null = null;
  if (!isAdmin) {
    const { data: vinc } = await supabase
      .from("expand_user_clientes")
      .select("cliente_id")
      .eq("user_id", user.id);
    clienteIds = (vinc ?? []).map((v: { cliente_id: string }) => v.cliente_id);
  }

  const q = supabase.from("expand_clientes").select("id, nome, maturidade, ativo, exec, rel, produto_slug").eq("ativo", true).order("nome");
  if (clienteIds) q.in("id", clienteIds);
  const { data: clientes } = await q;

  // Conta tarefas ativas por cliente
  const { data: etapas } = await supabase
    .from("expand_etapas")
    .select("cliente_id, status")
    .in("status", ["run", "wait", "idle"]);

  const tarefasPorCliente: Record<string, number> = {};
  for (const e of etapas ?? []) {
    tarefasPorCliente[e.cliente_id] = (tarefasPorCliente[e.cliente_id] ?? 0) + 1;
  }

  function saude(c: { exec: number | null; rel: number | null }): "verde" | "amarelo" | "vermelho" {
    if (!c.exec && !c.rel) return "verde";
    const exBad = c.exec != null && c.exec <= 4;
    const relBad = c.rel != null && c.rel <= 5;
    if (exBad && relBad) return "vermelho";
    if (exBad || relBad) return "amarelo";
    return "verde";
  }

  const SAUDE_COR = { verde: "var(--green)", amarelo: "var(--warn)", vermelho: "var(--red)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <p className="hx-eyebrow">CRM · Gestão de Projetos</p>
          <h1 className="ex-h1" style={{ marginBottom: 4 }}>Clientes</h1>
          <p className="ex-sub" style={{ marginTop: 0 }}>
            {isAdmin ? `${(clientes ?? []).length} clientes ativos` : "Sua carteira de clientes"}
          </p>
        </div>
        {isAdmin && <NovoClienteModal />}
      </div>

      {(!clientes || clientes.length === 0) ? (
        <div className="hx-glass" style={{ padding: "40px 28px", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", marginBottom: 6 }}>Nenhum cliente encontrado</p>
          <p style={{ fontSize: 13, color: "var(--mut)" }}>
            {isAdmin ? "Adicione clientes no sistema." : "Peça ao administrador para vincular clientes ao seu perfil."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {(clientes ?? []).map((c) => {
            const s = saude(c);
            const cor = SAUDE_COR[s];
            const nTarefas = tarefasPorCliente[c.id] ?? 0;
            return (
              <Link key={c.id} href={`/expand/clientes/${c.id}`}
                style={{ textDecoration: "none", color: "inherit" }}>
                <div className="hx-glass hx-glass-hover" style={{ padding: "16px 18px", borderLeft: `4px solid ${cor}`, borderRadius: 12 }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--panel)", display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0, border: "1px solid var(--line-2)" }}>
                      {c.nome.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{c.produto_slug ?? c.maturidade ?? "—"}</div>
                    </div>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: cor, flexShrink: 0, marginTop: 4 }} title={`Saúde: ${s}`} />
                  </div>

                  {/* Meta */}
                  <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                    <div>
                      <div style={{ color: "var(--dim)", marginBottom: 2 }}>Tarefas abertas</div>
                      <div style={{ fontWeight: 700, color: "var(--txt)", fontVariantNumeric: "tabular-nums" }}>{nTarefas}</div>
                    </div>
                    {c.exec != null && (
                      <div>
                        <div style={{ color: "var(--dim)", marginBottom: 2 }}>Execução</div>
                        <div style={{ fontWeight: 700, color: "var(--txt)" }}>{c.exec}/10</div>
                      </div>
                    )}
                    {c.rel != null && (
                      <div>
                        <div style={{ color: "var(--dim)", marginBottom: 2 }}>Relação</div>
                        <div style={{ fontWeight: 700, color: "var(--txt)" }}>{c.rel}/10</div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
