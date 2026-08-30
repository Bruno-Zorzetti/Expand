import { createClient } from "@/lib/supabase/server";

// Plain async functions — unstable_cache removed because createClient()
// reads cookies() which is forbidden inside the cache boundary in Next.js 15+.
// Pages are force-dynamic anyway so per-request fetches are fine.

export async function getPerfisCache() {
  const sb = await createClient();
  const { data } = await sb
    .from("expand_perfis")
    .select("id,nome,cargo,cor,foto_url,tipo,ativo")
    .eq("ativo", true)
    .order("nome");
  return data ?? [];
}

export async function getClientesCache() {
  const sb = await createClient();
  const { data } = await sb
    .from("expand_clientes")
    .select("id,nome,status,responsavel")
    .order("nome");
  return data ?? [];
}

export async function getProdutosCache() {
  const sb = await createClient();
  const { data } = await sb
    .from("expand_produtos")
    .select("slug,nome,descricao,icone,ativo,ordem")
    .eq("ativo", true)
    .order("ordem");
  return data ?? [];
}

export async function getCanaisCache() {
  const sb = await createClient();
  const { data } = await sb
    .from("expand_chat_canais")
    .select("id,nome,descricao,icone,membros,cliente_id,tipo")
    .eq("publico", true)
    .order("id");
  return data ?? [];
}
