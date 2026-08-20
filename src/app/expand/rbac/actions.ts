"use server";

import { getAcesso } from "@/lib/expand-acesso";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function adminSb() {
  const { isAdmin } = await getAcesso();
  if (!isAdmin) throw new Error("Sem permissão");
  const sb = createAdminClient();
  if (!sb) throw new Error("Admin client não configurado");
  return sb;
}

async function getModulos(sb: NonNullable<ReturnType<typeof createAdminClient>>, userId: string) {
  const { data } = await sb.from("profiles").select("expand_modulos").eq("id", userId).single();
  return (data?.expand_modulos as string[] | null) ?? [];
}

function revalidate() {
  revalidatePath("/expand/rbac");
  revalidatePath("/expand/acessos");
}

export async function setModulos(userId: string, modulos: string[]) {
  const sb = await adminSb();
  await sb.from("profiles").update({ expand_modulos: modulos }).eq("id", userId);
  revalidate();
}

export async function toggleModulo(userId: string, gate: string, ativo: boolean) {
  const sb = await adminSb();
  const atual = await getModulos(sb, userId);
  const novos = ativo ? [...new Set([...atual, gate])] : atual.filter((g) => g !== gate);
  await sb.from("profiles").update({ expand_modulos: novos }).eq("id", userId);
  revalidate();
}

export async function liberarSecao(userId: string, secao: string, modulos: string[]) {
  const sb = await adminSb();
  const atual = await getModulos(sb, userId);
  const destaSecao = modulos.filter((g) => g.startsWith(secao + "."));
  const novos = [...new Set([...atual.filter((g) => !g.startsWith(secao + ".")), ...destaSecao])];
  await sb.from("profiles").update({ expand_modulos: novos }).eq("id", userId);
  revalidate();
}

export async function revogarSecao(userId: string, secao: string) {
  const sb = await adminSb();
  const atual = await getModulos(sb, userId);
  const novos = atual.filter((g) => !g.startsWith(secao + "."));
  await sb.from("profiles").update({ expand_modulos: novos }).eq("id", userId);
  revalidate();
}
