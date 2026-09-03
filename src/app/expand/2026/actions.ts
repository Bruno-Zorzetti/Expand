"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function exigirAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// ── Clientes ──────────────────────────────────────────────────────────────────

export async function criarCliente2026(formData: FormData) {
  const { supabase } = await exigirAuth();
  const nome     = String(formData.get("nome")     ?? "").trim();
  const segmento = String(formData.get("segmento") ?? "").trim() || null;
  if (!nome) return { erro: "Nome obrigatório." };

  const { data, error } = await supabase
    .from("expand_clientes")
    .insert({ nome, segmento, ativo: true })
    .select("id")
    .single();

  if (error || !data?.id) return { erro: error?.message ?? "Erro ao criar cliente." };
  revalidatePath("/expand/2026/clientes");
  revalidatePath("/expand/2026/tarefas");
  return { ok: true, id: data.id as string };
}

// ── Tarefas ───────────────────────────────────────────────────────────────────

export async function criarTarefa2026(formData: FormData) {
  const { supabase } = await exigirAuth();
  const titulo      = String(formData.get("titulo")      ?? "").trim();
  const cliente_id  = String(formData.get("cliente_id")  ?? "").trim();
  const area        = String(formData.get("area")        ?? "").trim() || null;
  const responsavel = String(formData.get("responsavel") ?? "").trim() || null;
  const data_prev   = String(formData.get("data_prevista") ?? "").trim() || null;
  const visivel     = formData.get("visivel_cliente") === "on";

  if (!titulo || !cliente_id) return { erro: "Título e cliente são obrigatórios." };

  // próxima ordem para o cliente
  const { data: mx } = await supabase
    .from("expand_etapas")
    .select("ordem")
    .eq("cliente_id", cliente_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("expand_etapas").insert({
    titulo,
    cliente_id,
    ordem: (Number(mx?.ordem) || 0) + 1,
    fase: 1,
    area,
    responsavel: responsavel || "A definir",
    responsavel_atual: responsavel || null,
    status: "idle",
    visivel_cliente: visivel,
    qtd_esperada: 1,
    aprovacao: "qualquer",
    marco: false,
    bloqueado: false,
    chamado: false,
    data_prevista: data_prev,
  });

  if (error) return { erro: error.message };
  revalidatePath("/expand/2026/tarefas");
  return { ok: true };
}

export async function atualizarTarefa2026(id: string, fields: Record<string, unknown>) {
  const { supabase } = await exigirAuth();
  await supabase.from("expand_etapas").update(fields).eq("id", id);
  revalidatePath("/expand/2026/tarefas");
}

// ── Equipe ↔ Cliente ──────────────────────────────────────────────────────────

export async function vincularEquipe2026(formData: FormData) {
  const { supabase } = await exigirAuth();
  const user_id    = String(formData.get("user_id")    ?? "").trim();
  const cliente_id = String(formData.get("cliente_id") ?? "").trim();
  if (!user_id || !cliente_id) return { erro: "Dados incompletos." };

  const { error } = await supabase
    .from("expand_user_clientes")
    .upsert({ user_id, cliente_id }, { onConflict: "user_id,cliente_id" });

  if (error) return { erro: error.message };
  revalidatePath("/expand/2026/clientes");
  return { ok: true };
}

export async function desvincularEquipe2026(formData: FormData) {
  const { supabase } = await exigirAuth();
  const user_id    = String(formData.get("user_id")    ?? "").trim();
  const cliente_id = String(formData.get("cliente_id") ?? "").trim();
  if (!user_id || !cliente_id) return;

  await supabase
    .from("expand_user_clientes")
    .delete()
    .eq("user_id", user_id)
    .eq("cliente_id", cliente_id);

  revalidatePath("/expand/2026/clientes");
}
