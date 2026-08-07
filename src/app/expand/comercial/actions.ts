"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PADRAO } from "@/lib/expand-comercial-game";

export async function salvarPlano(formData: FormData) {
  const supabase = await createClient();
  const plano: Record<string, number> = {};
  (Object.keys(PADRAO) as string[]).forEach((k) => { const v = Number(formData.get(k) ?? 0); plano[k] = Number.isFinite(v) ? v : 0; });
  await supabase.from("expand_com_config").upsert({ id: "main", plano, atualizado_em: new Date().toISOString() }, { onConflict: "id" });
  revalidatePath("/expand/comercial/meta");
  revalidatePath("/expand/comercial");
}

export async function setMissao(formData: FormData) {
  const jogador = String(formData.get("jogador") ?? "");
  const dia = String(formData.get("dia") ?? "");
  const missao = String(formData.get("missao") ?? "");
  const valor = Math.max(0, Number(formData.get("valor") ?? 0) || 0);
  if (!jogador || !dia || !missao) return;
  const supabase = await createClient();
  await supabase.from("expand_com_registro").upsert({ jogador, dia, missao, valor, atualizado_em: new Date().toISOString() }, { onConflict: "jogador,dia,missao" });
  revalidatePath("/expand/comercial");
}

export async function trocarJogador(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const c = await cookies();
  c.set("com_jogador", id, { path: "/", maxAge: 31536000 });
  revalidatePath("/expand/comercial");
  revalidatePath("/expand/comercial/semana");
}
