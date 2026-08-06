"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import { instanciasParaCliente, instanciasDeProduto, type ProdEtapaRow } from "@/lib/expand-tarefas";

// Instancia a esteira de um cliente (idempotente) a partir do PROCESSO DO PRODUTO
// que a conta segue (expand_prod_etapas). Cai para a esteira estática se o produto
// ainda não tiver processo cadastrado.
export async function garantirEtapas(formData: FormData) {
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!clienteId) return;
  const supabase = await createClient();
  const { data: existe } = await supabase.from("expand_etapas").select("id").eq("cliente_id", clienteId).limit(1);
  if (existe && existe.length) return;
  const { data: c } = await supabase.from("expand_clientes").select("maturidade, produto_slug").eq("id", clienteId).single();
  const maturidade = (c?.maturidade as string | null) ?? null;
  const slug = (c?.produto_slug as string | null) ?? "pide";

  const { data: proc } = await supabase.from("expand_prod_etapas")
    .select("fase_ordem, ordem, titulo, area, responsavel, agente, sla, gatilho, criterio, visivel_cliente, qtd_esperada, aprovacao")
    .eq("produto_slug", slug).order("ordem");

  const rows = proc && proc.length
    ? instanciasDeProduto(clienteId, maturidade, proc as ProdEtapaRow[])
    : instanciasParaCliente(clienteId, maturidade);
  await supabase.from("expand_etapas").insert(rows);
  revalidatePath("/expand/board");
}

// Sobe um arquivo entregável para uma etapa (Storage + metadados).
export async function subirArquivo(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  const file = formData.get("file") as File | null;
  if (!etapaId || !file || file.size === 0) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${etapaId}/${Date.now()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from("expand-entregaveis").upload(path, buf, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) return;
  await supabase.from("expand_arquivos").insert({
    etapa_id: etapaId, nome: file.name, path, enviado_por: pessoa.nome, status: "pendente",
  });
  // primeira entrega tira a etapa do "não iniciada"
  await supabase.from("expand_etapas")
    .update({ status: "run", iniciada_em: new Date().toISOString(), responsavel_atual: pessoa.nome })
    .eq("id", etapaId).eq("status", "idle");
  revalidatePath(`/expand/etapa/${etapaId}`);
  revalidatePath("/expand/board");
}

// Aprova ou pede ajuste em um arquivo. Cliente OU gestor podem aprovar.
export async function decidirArquivo(formData: FormData) {
  const arquivoId = String(formData.get("arquivoId") ?? "");
  const etapaId = String(formData.get("etapaId") ?? "");
  const decisao = String(formData.get("decisao") ?? "");
  if (!arquivoId || !etapaId || !["aprovado", "ajuste"].includes(decisao)) return;
  const supabase = await createClient();
  // "quem" pode vir do portal do cliente; senão, a pessoa da equipe logada
  const quem = String(formData.get("quem") ?? "") || (await getPessoa()).pessoa.nome;
  await supabase.from("expand_arquivos")
    .update({ status: decisao, aprovado_por: quem, aprovado_em: new Date().toISOString() })
    .eq("id", arquivoId);

  // etapa conclui quando os aprovados atingem a quantidade esperada
  const { data: et } = await supabase.from("expand_etapas").select("qtd_esperada").eq("id", etapaId).single();
  const { count } = await supabase.from("expand_arquivos")
    .select("id", { count: "exact", head: true }).eq("etapa_id", etapaId).eq("status", "aprovado");
  if (et && count != null && count >= ((et.qtd_esperada as number) ?? 1)) {
    await supabase.from("expand_etapas").update({ status: "done", concluida_em: new Date().toISOString() }).eq("id", etapaId);
  }
  revalidatePath(`/expand/etapa/${etapaId}`);
  revalidatePath("/expand/board");
}
