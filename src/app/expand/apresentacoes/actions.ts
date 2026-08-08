"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import { novoSlide, type Slide } from "@/lib/expand-slides";

export async function criarApresentacao() {
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const { data } = await supabase.from("expand_apresentacoes")
    .insert({ titulo: "Nova apresentação", criado_por: pessoa.nome, slides: [novoSlide("capa")] })
    .select("id").single();
  redirect(data?.id ? `/expand/apresentacoes/${data.id}` : "/expand/apresentacoes");
}

export async function salvarApresentacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const titulo = String(formData.get("titulo") ?? "").trim() || "Sem título";
  const publico = String(formData.get("publico") ?? "") === "true";
  let slides: Slide[] = [];
  try { slides = JSON.parse(String(formData.get("slides") ?? "[]")) as Slide[]; } catch { /* noop */ }
  const supabase = await createClient();
  await supabase.from("expand_apresentacoes")
    .update({ titulo, slides, publico, atualizado_em: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/expand/apresentacoes/${id}`);
  revalidatePath("/expand/apresentacoes");
}

export async function excluirApresentacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("expand_apresentacoes").delete().eq("id", id);
  revalidatePath("/expand/apresentacoes");
  redirect("/expand/apresentacoes");
}
