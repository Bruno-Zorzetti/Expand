import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EtapaRow } from "@/lib/expand-tarefas";
import TarefasClient from "./TarefasClient";

export const dynamic = "force-dynamic";

export default async function TarefasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/expand/2026/tarefas");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role as string ?? "pendente";
  const isAdmin = role === "admin";

  // Admin/PMO veem todos os clientes; equipe vê só os vinculados
  let clienteIds: string[] | null = null;
  if (!isAdmin) {
    const { data: vinc } = await supabase
      .from("expand_user_clientes")
      .select("cliente_id")
      .eq("user_id", user.id);
    clienteIds = (vinc ?? []).map((v: { cliente_id: string }) => v.cliente_id);
    if (clienteIds.length === 0) {
      return (
        <div>
          <p className="hx-eyebrow">CRM · Gestão de Projetos</p>
          <h1 className="ex-h1" style={{ marginBottom: 8 }}>Tarefas</h1>
          <div className="hx-glass" style={{ padding: "32px 28px", textAlign: "center", marginTop: 24 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--txt)", marginBottom: 6 }}>Nenhum cliente vinculado</p>
            <p style={{ fontSize: 13, color: "var(--mut)" }}>
              Peça ao administrador para vincular clientes ao seu perfil em{" "}
              <strong>Configurações → Acessos</strong>.
            </p>
          </div>
        </div>
      );
    }
  }

  // Busca clientes (admin = todos; equipe = só vinculados)
  const clientesQuery = supabase.from("expand_clientes").select("id, nome").eq("ativo", true).order("nome");
  if (clienteIds) clientesQuery.in("id", clienteIds);
  const { data: clientes } = await clientesQuery;

  // Busca tarefas
  const etapasQuery = supabase
    .from("expand_etapas")
    .select("*")
    .order("ordem");
  if (clienteIds) etapasQuery.in("cliente_id", clienteIds);
  const { data: etapas } = await etapasQuery;

  // Mapeia nome do cliente em cada tarefa
  const clienteMap = Object.fromEntries((clientes ?? []).map((c: { id: string; nome: string }) => [c.id, c.nome]));
  const tarefas = (etapas ?? []).map((e: EtapaRow) => ({
    ...e,
    cliente_nome: clienteMap[e.cliente_id] ?? "",
  }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p className="hx-eyebrow">CRM · Gestão de Projetos</p>
        <h1 className="ex-h1" style={{ marginBottom: 4 }}>Tarefas</h1>
        <p className="ex-sub" style={{ marginTop: 0 }}>
          {isAdmin ? "Visão completa de todas as tarefas." : "Suas contas e tarefas vinculadas."}
        </p>
      </div>

      <TarefasClient
        tarefas={tarefas}
        clientes={clientes ?? []}
      />
    </div>
  );
}
