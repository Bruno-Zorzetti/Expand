import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import { getAcesso } from "@/lib/expand-acesso";
import { CalendarV2, type Et, type Cli, type Vista } from "./CalendarV2";

export const dynamic = "force-dynamic";

export default async function Planejamento({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; d?: string; c?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const initialView: Vista =
    sp.v === "dia" || sp.v === "mes" ? sp.v : "semana";
  const initialDate = sp.d ?? new Date().toISOString().slice(0, 10);

  const { pessoa, equipe } = await getPessoa();
  const { isAdmin } = await getAcesso();
  const supabase = await createClient();

  // Resolve active member
  const membroId =
    isAdmin && sp.m && equipe.some((e) => e.id === sp.m) ? sp.m : pessoa.id;
  const membroAtivo = equipe.find((e) => e.id === membroId) ?? pessoa;

  // Clientes
  const { data: cData } = await supabase
    .from("expand_clientes")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  const clientes = (cData ?? []) as Cli[];
  const initialFiltroCli =
    sp.c && clientes.some((c) => c.id === sp.c) ? sp.c : "";

  // Tarefas do membro
  let q = supabase
    .from("expand_etapas")
    .select(
      "id, titulo, area, responsavel, responsavel_atual, sla, status, marco, data_prevista, cliente_id, iniciada_em"
    )
    .in("status", ["run", "idle"])
    .or(
      `responsavel_atual.ilike.%${membroAtivo.nome}%,responsavel.ilike.%${membroAtivo.nome}%`
    );
  if (initialFiltroCli) q = q.eq("cliente_id", initialFiltroCli);
  const { data: etData } = await q.order("data_prevista", { nullsFirst: false });
  const etapas = (etData ?? []) as Et[];

  // nomeCli map as plain object (serializable for client)
  const nomeCli: Record<string, string> = {};
  for (const c of clientes) nomeCli[c.id] = c.nome;

  return (
    <>
      <p className="hx-eyebrow">Calendário · {membroAtivo.nome}</p>
      <h1 className="ex-h1" style={{ marginBottom: 20 }}>
        Agenda <span className="hx-accent-text">pessoal</span>
      </h1>
      <CalendarV2
        etapas={etapas}
        nomeCli={nomeCli}
        equipe={equipe}
        isAdmin={isAdmin}
        clientes={clientes}
        membroId={membroId}
        membroNome={membroAtivo.nome}
        initialView={initialView}
        initialDate={initialDate}
        initialFiltroCli={initialFiltroCli}
      />
    </>
  );
}
