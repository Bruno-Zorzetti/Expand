"use server";

import { createClient } from "@/lib/supabase/server";
import { getAcesso } from "@/lib/expand-acesso";
import { revalidatePath } from "next/cache";

export async function setModulos(userId: string, modulos: string[]) {
  const { isAdmin } = await getAcesso();
  if (!isAdmin) throw new Error("Sem permissão");

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ expand_modulos: modulos })
    .eq("id", userId);

  revalidatePath("/expand/rbac");
}

export async function toggleModulo(userId: string, gate: string, ativo: boolean) {
  const { isAdmin } = await getAcesso();
  if (!isAdmin) throw new Error("Sem permissão");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("expand_modulos")
    .eq("id", userId)
    .single();

  const atual = (data?.expand_modulos as string[] | null) ?? [];
  const novos = ativo
    ? [...new Set([...atual, gate])]
    : atual.filter((g) => g !== gate);

  await supabase
    .from("profiles")
    .update({ expand_modulos: novos })
    .eq("id", userId);

  revalidatePath("/expand/rbac");
}

export async function liberarSecao(userId: string, secao: string, modulos: string[]) {
  const { isAdmin } = await getAcesso();
  if (!isAdmin) throw new Error("Sem permissão");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("expand_modulos")
    .eq("id", userId)
    .single();

  const atual = (data?.expand_modulos as string[] | null) ?? [];
  const destaSecao = modulos.filter((g) => g.startsWith(secao + "."));
  const outrasSecoes = atual.filter((g) => !g.startsWith(secao + "."));
  const novos = [...new Set([...outrasSecoes, ...destaSecao])];

  await supabase
    .from("profiles")
    .update({ expand_modulos: novos })
    .eq("id", userId);

  revalidatePath("/expand/rbac");
}

export async function revogarSecao(userId: string, secao: string) {
  const { isAdmin } = await getAcesso();
  if (!isAdmin) throw new Error("Sem permissão");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("expand_modulos")
    .eq("id", userId)
    .single();

  const atual = (data?.expand_modulos as string[] | null) ?? [];
  const novos = atual.filter((g) => !g.startsWith(secao + "."));

  await supabase
    .from("profiles")
    .update({ expand_modulos: novos })
    .eq("id", userId);

  revalidatePath("/expand/rbac");
}
