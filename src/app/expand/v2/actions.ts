"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";

export async function criarEtapav2(formData: FormData) {
  const titulo    = String(formData.get("titulo")         ?? "").trim();
  const clienteId = String(formData.get("cliente_id")     ?? "").trim();
  if (!titulo || !clienteId) return;

  const supabase = await createClient();
  const { pessoa } = await getPessoa();

  const area        = String(formData.get("area")           ?? "").trim() || null;
  const responsavel = String(formData.get("responsavel")    ?? "").trim() || pessoa.nome;
  const sla         = String(formData.get("sla")            ?? "").trim() || null;
  const dataPrev    = String(formData.get("data_prevista")  ?? "").trim() || null;
  const back        = String(formData.get("back")           ?? "/expand/v2").trim();

  const { data: max } = await supabase
    .from("expand_etapas")
    .select("ordem, fase")
    .eq("cliente_id", clienteId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("expand_etapas").insert({
    titulo,
    cliente_id:      clienteId,
    area,
    responsavel,
    responsavel_atual: responsavel,
    sla,
    data_prevista:   dataPrev || null,
    status:          "idle",
    fase:            (max?.fase as number | null) ?? 1,
    ordem:           ((max?.ordem as number | null) ?? 0) + 1,
    marco:           false,
    bloqueado:       false,
    visivel_cliente: false,
  });

  revalidatePath("/expand/v2");
  revalidatePath("/expand/board");
  redirect(back);
}
