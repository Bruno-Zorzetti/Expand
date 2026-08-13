"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAcesso } from "@/lib/expand-acesso";

export async function salvarEmpresa(formData: FormData) {
  const { isAdmin } = await getAcesso();
  if (!isAdmin) return;

  const supabase = await createClient();

  const valoresRaw = String(formData.get("valores") ?? "");
  const valores = valoresRaw.split(",").map((v) => v.trim()).filter(Boolean);

  const fundadoresRaw = String(formData.get("fundadores_json") ?? "[]");
  let fundadores: unknown = [];
  try { fundadores = JSON.parse(fundadoresRaw); } catch { fundadores = []; }

  await supabase.from("expand_empresa_config").upsert({
    id: "expand",
    nome: String(formData.get("nome") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim(),
    missao: String(formData.get("missao") ?? "").trim(),
    cnpj: String(formData.get("cnpj") ?? "").trim(),
    setor: String(formData.get("setor") ?? "").trim(),
    site: String(formData.get("site") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    telefone: String(formData.get("telefone") ?? "").trim(),
    endereco: String(formData.get("endereco") ?? "").trim(),
    instagram: String(formData.get("instagram") ?? "").trim(),
    youtube: String(formData.get("youtube") ?? "").trim(),
    linkedin: String(formData.get("linkedin") ?? "").trim(),
    logo_url: String(formData.get("logo_url") ?? "").trim(),
    manual_url: String(formData.get("manual_url") ?? "").trim(),
    cor_primaria: String(formData.get("cor_primaria") ?? "#1B3826").trim(),
    cor_acento: String(formData.get("cor_acento") ?? "#C89B5E").trim(),
    valores: valores.length ? valores : null,
    fundadores,
    atualizado_em: new Date().toISOString(),
  });

  revalidatePath("/expand/empresa");
}
