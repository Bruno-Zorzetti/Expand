import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import { getAcesso } from "@/lib/expand-acesso";
import { PlanejamentoBoard, type Et, type Cli } from "./PlanejamentoBoard";

export const dynamic = "force-dynamic";

export default async function Planejamento({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; d?: string; c?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const initialView = (["agenda", "semana", "mes", "roadmap"] as const).includes(sp.v as never)
    ? (sp.v as "agenda" | "semana" | "mes" | "roadmap")
    : "semana";
  const initialDate = sp.d ?? new Date().toISOString().slice(0, 10);

  const { pessoa, equipe } = await getPessoa();
  const { isAdmin } = await getAcesso();
  const supabase = await createClient();

  const membroId =
    isAdmin && sp.m && equipe.some((e) => e.id === sp.m) ? sp.m : pessoa.id;
  const membroAtivo = equipe.find((e) => e.id === membroId) ?? pessoa;

  const { data: cData } = await supabase
    .from("expand_clientes")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");
  const clientes = (cData ?? []) as Cli[];
  const initialFiltroCli =
    sp.c && clientes.some((c) => c.id === sp.c) ? sp.c : "";

  // Active tasks for the member
  let q = supabase
    .from("expand_etapas")
    .select(
      "id, titulo, area, responsavel, responsavel_atual, sla, status, marco, data_prevista, cliente_id, iniciada_em, concluida_em"
    )
    .in("status", ["run", "idle", "wait"])
    .or(`responsavel_atual.ilike.%${membroAtivo.nome}%,responsavel.ilike.%${membroAtivo.nome}%`);
  if (initialFiltroCli) q = q.eq("cliente_id", initialFiltroCli);
  const { data: etData } = await q.order("data_prevista", { nullsFirst: false });

  // Done tasks from the last 7 days (for stats)
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: doneData } = await supabase
    .from("expand_etapas")
    .select("id, titulo, area, concluida_em, cliente_id, marco")
    .eq("status", "done")
    .or(`responsavel_atual.ilike.%${membroAtivo.nome}%,responsavel.ilike.%${membroAtivo.nome}%`)
    .gte("concluida_em", since7)
    .order("concluida_em", { ascending: false })
    .limit(30);

  const etapas = (etData ?? []) as Et[];
  const concluidas = (doneData ?? []) as Et[];

  const nomeCli: Record<string, string> = {};
  for (const c of clientes) nomeCli[c.id] = c.nome;

  return (
    <PlanejamentoBoard
      etapas={etapas}
      concluidas={concluidas}
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
  );
}
