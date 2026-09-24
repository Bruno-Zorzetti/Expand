"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function atualizarStatusLead(id: string, status: string) {
  const sb = await createClient();
  await sb.from("vma_leads").update({ status }).eq("id", id);
  revalidatePath("/expand/vma/leads");
}
