"use server";
import { createAdminClient } from "@/lib/supabase/admin";

// Lê uma chave: primeiro env var, depois system_config no banco.
export async function lerConfig(key: string): Promise<string | null> {
  const envVal = process.env[key];
  if (envVal) return envVal;
  try {
    const sb = createAdminClient();
    if (!sb) return null;
    const { data } = await sb.from("system_config").select("value").eq("key", key).single();
    return (data?.value as string | null) ?? null;
  } catch {
    return null;
  }
}

// Upsert de um valor no banco (admin apenas — chamado por server actions).
export async function salvarConfig(key: string, value: string, userId?: string): Promise<void> {
  const sb = createAdminClient();
  if (!sb) throw new Error("Admin client não configurado (SUPABASE_SERVICE_ROLE_KEY ausente)");
  await sb.from("system_config").upsert(
    { key, value, updated_at: new Date().toISOString(), updated_by: userId ?? null },
    { onConflict: "key" }
  );
}

// Lê todas as configs do banco de uma vez (retorna map key→value).
export async function lerTodasConfigs(): Promise<Record<string, string>> {
  try {
    const sb = createAdminClient();
    if (!sb) return {};
    const { data } = await sb.from("system_config").select("key, value");
    return Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  } catch {
    return {};
  }
}
