"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function atualizarTarefa(id: string, fields: Record<string, unknown>) {
  const supabase = await createClient();
  await supabase.from("expand_etapas").update(fields).eq("id", id);
  revalidatePath("/expand/2026/tarefas");
}
