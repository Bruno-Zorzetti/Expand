"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import { exigirAdmin } from "@/lib/expand-acesso";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { instanciasParaCliente, instanciasDeProduto, type ProdEtapaRow } from "@/lib/expand-tarefas";

type SB = Awaited<ReturnType<typeof createClient>>;
// Registra uma ação no log do sistema (expand_log).
async function logar(supabase: SB, tipo: string, detalhe: string, o?: { cliente_id?: string | null; etapa_id?: string | null; autor?: string | null }) {
  await supabase.from("expand_log").insert({ tipo, detalhe, cliente_id: o?.cliente_id ?? null, etapa_id: o?.etapa_id ?? null, autor: o?.autor ?? null });
}
async function clienteDaEtapa(supabase: SB, etapaId: string): Promise<string | null> {
  const { data } = await supabase.from("expand_etapas").select("cliente_id").eq("id", etapaId).single();
  return (data?.cliente_id as string | null) ?? null;
}
// Cria uma notificação para uma pessoa (membro_id = id do perfil).
async function notificar(supabase: SB, paraId: string | null, tipo: string, texto: string, link?: string | null) {
  if (!paraId) return;
  await supabase.from("expand_notificacoes").insert({ membro_id: paraId, tipo, texto, link: link ?? null });
}
async function perfilIdPorNome(supabase: SB, nome: string): Promise<string | null> {
  if (!nome?.trim()) return null;
  const { data } = await supabase.from("expand_perfis").select("id").ilike("nome", nome.trim()).limit(1).maybeSingle();
  return (data?.id as string | null) ?? null;
}
const DIRETORIA = ["bruno", "pedro", "ana"]; // recebem chamados/bloqueios

// Avisa no grupo de WhatsApp do cliente (se configurado e instância conectada).
async function notificarGrupoCliente(supabase: SB, clienteId: string | null, texto: string) {
  if (!clienteId) return;
  const { data } = await supabase.from("expand_clientes").select("whatsapp_grupo").eq("id", clienteId).maybeSingle();
  const jid = data?.whatsapp_grupo as string | null;
  if (jid) { const { enviarWhatsapp } = await import("@/lib/whatsapp"); await enviarWhatsapp(jid, texto); }
}

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
  // produto escolhido na hora (Board) tem prioridade; persiste no cliente.
  const escolhido = String(formData.get("produtoSlug") ?? "").trim();
  const slug = escolhido || (c?.produto_slug as string | null) || "pide";
  if (escolhido && escolhido !== (c?.produto_slug as string | null)) {
    await supabase.from("expand_clientes").update({ produto_slug: escolhido }).eq("id", clienteId);
  }

  const { data: proc } = await supabase.from("expand_prod_etapas")
    .select("fase_ordem, ordem, titulo, area, responsavel, agente, sla, gatilho, criterio, visivel_cliente, qtd_esperada, aprovacao, marco, depende_de")
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
    etapa_id: etapaId, nome: file.name, path, tipo: "arquivo", enviado_por: pessoa.nome, status: "pendente",
  });
  // primeira entrega tira a etapa do "não iniciada"
  await supabase.from("expand_etapas")
    .update({ status: "run", iniciada_em: new Date().toISOString(), responsavel_atual: pessoa.nome })
    .eq("id", etapaId).eq("status", "idle");
  await logar(supabase, "upload", `Subiu o arquivo "${file.name}"`, { etapa_id: etapaId, cliente_id: await clienteDaEtapa(supabase, etapaId), autor: pessoa.nome });
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
  await logar(supabase, decisao === "aprovado" ? "aprovacao" : "ajuste", decisao === "aprovado" ? "Aprovou um entregável" : "Pediu ajuste num entregável", { etapa_id: etapaId, cliente_id: await clienteDaEtapa(supabase, etapaId), autor: quem });
  revalidatePath(`/expand/etapa/${etapaId}`);
  revalidatePath("/expand/board");
}

// ---- Contador / ciclo de vida da etapa ----
export async function iniciarEtapa(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  if (!etapaId) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const { data: et } = await supabase.from("expand_etapas").select("iniciada_em, cliente_id").eq("id", etapaId).single();
  await supabase.from("expand_etapas").update({
    status: "run", responsavel_atual: pessoa.nome, bloqueado: false,
    ...(et?.iniciada_em ? {} : { iniciada_em: new Date().toISOString() }),
  }).eq("id", etapaId);
  await logar(supabase, "iniciar", "Iniciou a execução (contador ligado)", { etapa_id: etapaId, cliente_id: (et?.cliente_id as string | null) ?? null, autor: pessoa.nome });
  revalidatePath(`/expand/etapa/${etapaId}`);
  revalidatePath("/expand");
  revalidatePath("/expand/v2");
}

export async function concluirEtapa(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  if (!etapaId) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const { data: et } = await supabase.from("expand_etapas").select("iniciada_em, cliente_id").eq("id", etapaId).single();
  const ini = et?.iniciada_em as string | null;
  const dur = ini ? Math.max(1, Math.round((Date.now() - new Date(ini).getTime()) / 60000)) : null;
  await supabase.from("expand_etapas").update({ status: "done", concluida_em: new Date().toISOString(), duracao_min: dur }).eq("id", etapaId);
  await logar(supabase, "concluir", `Concluiu a tarefa${dur != null ? ` em ${dur} min` : ""}`, { etapa_id: etapaId, cliente_id: (et?.cliente_id as string | null) ?? null, autor: pessoa.nome });
  revalidatePath(`/expand/etapa/${etapaId}`);
  revalidatePath("/expand");
  revalidatePath("/expand/v2");
}

// Kanban drag — mover status de uma etapa (PMO / admin)
export async function moverStatusEtapa(formData: FormData) {
  const etapaId  = String(formData.get("etapaId") ?? "");
  const novoStatus = String(formData.get("status") ?? "");
  const VALIDOS = ["idle", "wait", "run", "done"];
  if (!etapaId || !VALIDOS.includes(novoStatus)) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const upd: Record<string, unknown> = { status: novoStatus };
  if (novoStatus === "run") { upd.iniciada_em = new Date().toISOString(); }
  if (novoStatus === "done") {
    const { data: et } = await supabase.from("expand_etapas").select("iniciada_em, cliente_id").eq("id", etapaId).single();
    const ini = et?.iniciada_em as string | null;
    if (ini) upd.duracao_min = Math.max(1, Math.round((Date.now() - new Date(ini).getTime()) / 60000));
    upd.concluida_em = new Date().toISOString();
  }
  await supabase.from("expand_etapas").update(upd).eq("id", etapaId);
  await logar(supabase, "status", `→ ${novoStatus} (kanban)`, { etapa_id: etapaId, autor: pessoa.nome });
  revalidatePath("/expand/board");
  revalidatePath("/expand/v2");
}

export async function transferirEtapa(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  const para = String(formData.get("para") ?? "").trim();
  if (!etapaId || !para) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const { data: et } = await supabase.from("expand_etapas").select("responsavel_atual, responsavel, cliente_id, titulo").eq("id", etapaId).single();
  const de = (et?.responsavel_atual ?? et?.responsavel ?? "—") as string;
  await supabase.from("expand_etapas").update({ responsavel_atual: para }).eq("id", etapaId);
  await logar(supabase, "transferir", `Transferiu de ${de} para ${para}`, { etapa_id: etapaId, cliente_id: (et?.cliente_id as string | null) ?? null, autor: pessoa.nome });
  await notificar(supabase, await perfilIdPorNome(supabase, para), "tarefa", `${pessoa.nome} passou a tarefa "${et?.titulo ?? ""}" para você`, `/expand/etapa/${etapaId}`);
  revalidatePath(`/expand/etapa/${etapaId}`);
  revalidatePath("/expand");
}

export async function abrirChamado(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  const msg = String(formData.get("msg") ?? "").trim();
  if (!etapaId || !msg) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  await supabase.from("expand_etapas").update({ chamado: true, chamado_msg: msg }).eq("id", etapaId);
  await logar(supabase, "chamado", `Abriu chamado/dúvida: ${msg}`, { etapa_id: etapaId, cliente_id: await clienteDaEtapa(supabase, etapaId), autor: pessoa.nome });
  for (const d of DIRETORIA) await notificar(supabase, d, "chamado", `${pessoa.nome} abriu um chamado: ${msg}`, `/expand/etapa/${etapaId}`);
  revalidatePath(`/expand/etapa/${etapaId}`);
  revalidatePath("/expand");
}

export async function alternarBloqueio(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!etapaId) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const { data: et } = await supabase.from("expand_etapas").select("bloqueado, cliente_id").eq("id", etapaId).single();
  const bloquear = !et?.bloqueado;
  await supabase.from("expand_etapas").update({ bloqueado: bloquear, bloqueio_motivo: bloquear ? (motivo || "Sem motivo informado") : null }).eq("id", etapaId);
  await logar(supabase, "bloqueio", bloquear ? `Marcou bloqueio: ${motivo || "—"}` : "Desbloqueou a tarefa", { etapa_id: etapaId, cliente_id: (et?.cliente_id as string | null) ?? null, autor: pessoa.nome });
  if (bloquear) for (const d of DIRETORIA) await notificar(supabase, d, "bloqueio", `${pessoa.nome} bloqueou uma tarefa: ${motivo || "—"}`, `/expand/etapa/${etapaId}`);
  revalidatePath(`/expand/etapa/${etapaId}`);
  revalidatePath("/expand");
}

// ---- Entregáveis: link + CRUD ----
export async function adicionarLink(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!etapaId || !nome || !url) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  await supabase.from("expand_arquivos").insert({ etapa_id: etapaId, nome, url, tipo: "link", enviado_por: pessoa.nome, status: "pendente" });
  await supabase.from("expand_etapas").update({ status: "run", iniciada_em: new Date().toISOString(), responsavel_atual: pessoa.nome }).eq("id", etapaId).eq("status", "idle");
  const { data: et } = await supabase.from("expand_etapas").select("cliente_id, titulo, visivel_cliente").eq("id", etapaId).maybeSingle();
  await logar(supabase, "link", `Adicionou o link "${nome}"`, { etapa_id: etapaId, cliente_id: (et?.cliente_id as string | null) ?? null, autor: pessoa.nome });
  if (et?.visivel_cliente) {
    const cid = et.cliente_id as string | null;
    await notificarGrupoCliente(supabase, cid, `📎 *${et.titulo}* — novo material para sua aprovação:\n${nome}: ${url}`);
    if (cid) await supabase.from("expand_notificacoes").insert({ cliente_id: cid, tipo: "aprovacao", texto: `Novo material para aprovar: ${nome}`, link: `/portal/${cid}/aprovacoes` });
  }
  revalidatePath(`/expand/etapa/${etapaId}`);
}

export async function editarArquivo(formData: FormData) {
  const arquivoId = String(formData.get("arquivoId") ?? "");
  const etapaId = String(formData.get("etapaId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!arquivoId || !nome) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const patch: Record<string, unknown> = { nome };
  const url = String(formData.get("url") ?? "").trim();
  const obs = String(formData.get("obs") ?? "").trim();
  if (formData.has("url")) patch.url = url || null;
  patch.obs = obs || null;
  await supabase.from("expand_arquivos").update(patch).eq("id", arquivoId);
  await logar(supabase, "edicao", `Editou o entregável "${nome}"`, { etapa_id: etapaId, cliente_id: await clienteDaEtapa(supabase, etapaId), autor: pessoa.nome });
  revalidatePath(`/expand/etapa/${etapaId}`);
}

export async function removerArquivo(formData: FormData) {
  const arquivoId = String(formData.get("arquivoId") ?? "");
  const etapaId = String(formData.get("etapaId") ?? "");
  if (!arquivoId) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const { data: a } = await supabase.from("expand_arquivos").select("nome, path").eq("id", arquivoId).single();
  if (a?.path) await supabase.storage.from("expand-entregaveis").remove([a.path as string]);
  await supabase.from("expand_arquivos").delete().eq("id", arquivoId);
  await logar(supabase, "remocao", `Removeu o entregável "${a?.nome ?? ""}"`, { etapa_id: etapaId, cliente_id: await clienteDaEtapa(supabase, etapaId), autor: pessoa.nome });
  revalidatePath(`/expand/etapa/${etapaId}`);
}

// ---- Cria uma tarefa/evento direto pelo calendário ----
export async function criarEtapaCal(formData: FormData) {
  const titulo        = String(formData.get("titulo")          ?? "").trim();
  const tipo          = String(formData.get("tipo")            ?? "reuniao");
  const clienteId     = String(formData.get("clienteId")       ?? "");
  const date          = String(formData.get("date")            ?? "").trim();
  const membroNome    = String(formData.get("membroNome")      ?? "").trim();
  const horarioInicio = String(formData.get("horario_inicio")  ?? "").trim() || null;
  const horarioFim    = String(formData.get("horario_fim")     ?? "").trim() || null;
  if (!titulo || !clienteId) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const { data: inserted } = await supabase.from("expand_etapas").insert({
    titulo,
    area: tipo,
    responsavel: membroNome || pessoa.nome,
    responsavel_atual: membroNome || pessoa.nome,
    status: "idle",
    marco: false,
    data_prevista: date || null,
    cliente_id: clienteId,
    horario_inicio: horarioInicio,
    horario_fim:    horarioFim,
  }).select("id").single();
  if (inserted?.id) {
    await logar(supabase, "criacao", `Criou evento de calendário: ${titulo} (${tipo})`, {
      etapa_id: inserted.id as string,
      cliente_id: clienteId,
      autor: pessoa.nome,
    });
  }
  revalidatePath("/expand/planejamento");
}

// ---- Agenda: data prevista da tarefa (planejamento semanal) ----
export async function agendarEtapa(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  if (!etapaId) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const data = String(formData.get("data") ?? "").trim();
  await supabase.from("expand_etapas").update({ data_prevista: data || null }).eq("id", etapaId);
  await logar(supabase, "agenda", data ? `Agendou para ${data}` : "Removeu a data prevista", { etapa_id: etapaId, cliente_id: await clienteDaEtapa(supabase, etapaId), autor: pessoa.nome });
  revalidatePath(`/expand/etapa/${etapaId}`);
  revalidatePath("/expand/planejamento");
  revalidatePath("/expand");
}

// ---- Editar a tarefa (CRUD por cliente): SLA, responsável, o que fazer, etc. ----
export async function editarEtapa(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  if (!etapaId) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const str = (k: string) => { const v = String(formData.get(k) ?? "").trim(); return v || null; };
  const depende = String(formData.get("depende_de") ?? "").trim();
  const qtd = Number(formData.get("qtd_esperada") ?? 1);
  const patch = {
    titulo: String(formData.get("titulo") ?? "").trim() || "Sem título",
    criterio: str("criterio"),
    gatilho: str("gatilho"),
    sla: str("sla"),
    responsavel: str("responsavel"),
    agente: str("agente"),
    qtd_esperada: Number.isFinite(qtd) && qtd > 0 ? Math.round(qtd) : 1,
    depende_de: depende ? Number(depende) : null,
    marco: formData.get("marco") === "on",
    visivel_cliente: formData.get("visivel_cliente") === "on",
  };
  const { data: et } = await supabase.from("expand_etapas").select("cliente_id").eq("id", etapaId).single();
  await supabase.from("expand_etapas").update(patch).eq("id", etapaId);
  await logar(supabase, "editar", `Editou a tarefa "${patch.titulo}"`, { etapa_id: etapaId, cliente_id: (et?.cliente_id as string | null) ?? null, autor: pessoa.nome });
  revalidatePath(`/expand/etapa/${etapaId}`);
  revalidatePath("/expand/board");
}

// ---- Modelos & exemplos por tarefa (o que fazer aqui) ----
export async function addModeloEtapa(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!etapaId || !titulo) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  await supabase.from("expand_etapa_modelos").insert({
    etapa_id: etapaId, titulo,
    conteudo: String(formData.get("conteudo") ?? "").trim() || null,
    url: String(formData.get("url") ?? "").trim() || null,
    criado_por: pessoa.nome,
  });
  revalidatePath(`/expand/etapa/${etapaId}`);
}
export async function removeModeloEtapa(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const etapaId = String(formData.get("etapaId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("expand_etapa_modelos").delete().eq("id", id);
  revalidatePath(`/expand/etapa/${etapaId}`);
}

// ---- PMO: aplicar o squad sugerido (define responsável por área nas tarefas abertas) ----
export async function aplicarSquad(formData: FormData) {
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!clienteId) return;
  const areas = formData.getAll("alocArea").map(String);
  const pessoas = formData.getAll("alocPessoa").map(String);
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  let aplicadas = 0;
  for (let i = 0; i < areas.length; i++) {
    const area = areas[i], resp = (pessoas[i] ?? "").trim();
    if (!area || !resp) continue;
    // só as tarefas abertas daquela área desta conta
    const { data: upd } = await supabase.from("expand_etapas")
      .update({ responsavel: resp }).eq("cliente_id", clienteId).eq("area", area).neq("status", "done").select("id");
    aplicadas += (upd?.length ?? 0);
  }
  await logar(supabase, "squad", `PMO montou o squad: ${aplicadas} tarefa(s) atribuída(s) em ${areas.length} área(s)`, { cliente_id: clienteId, autor: pessoa.nome });
  revalidatePath(`/expand/board?c=${clienteId}`);
  revalidatePath(`/expand/board/squad?c=${clienteId}`);
}

// ---- Disponibilidade: folgas/feriados por pessoa (PJ escolhe quais observa) ----
export async function marcarFolga(formData: FormData) {
  const perfilId = String(formData.get("perfilId") ?? "");
  const data = String(formData.get("data") ?? "").trim();
  if (!perfilId || !data) return;
  const supabase = await createClient();
  await supabase.from("expand_perfil_folga").upsert(
    { perfil_id: perfilId, data, motivo: String(formData.get("motivo") ?? "").trim() || null },
    { onConflict: "perfil_id,data" }
  );
  revalidatePath(`/expand/equipe/${perfilId}`);
}
export async function removerFolga(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const perfilId = String(formData.get("perfilId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("expand_perfil_folga").delete().eq("id", id);
  revalidatePath(`/expand/equipe/${perfilId}`);
}

// ---- Justificativa de atraso ----
export async function justificarAtraso(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "");
  const texto = String(formData.get("justificativa") ?? "").trim();
  if (!etapaId) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  await supabase.from("expand_etapas").update({ justificativa: texto || null }).eq("id", etapaId);
  await logar(supabase, "justificativa", texto ? `Justificou atraso: ${texto}` : "Removeu justificativa", { etapa_id: etapaId, cliente_id: await clienteDaEtapa(supabase, etapaId), autor: pessoa.nome });
  revalidatePath("/expand");
  revalidatePath(`/expand/etapa/${etapaId}`);
}

// ---- Comentários de tarefa ----
export async function comentarEtapa(formData: FormData) {
  const etapaId = String(formData.get("etapaId") ?? "").trim();
  const texto   = String(formData.get("texto")   ?? "").trim();
  if (!etapaId || !texto) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const cli = await clienteDaEtapa(supabase, etapaId);
  await logar(supabase, "comentario", texto, { etapa_id: etapaId, cliente_id: cli, autor: pessoa.nome });
  revalidatePath(`/expand/etapa/${etapaId}`);
  revalidatePath("/expand/v2");
}

// ---- Sala do time (chat interno) ----
export async function postarSala(formData: FormData) {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  await supabase.from("expand_sala").insert({ autor_id: pessoa.id, autor: pessoa.nome, texto });
  revalidatePath("/expand/sala");
}

// ---- Anotações pessoais (Meu Dia) ----
export async function salvarNota(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const conteudo = String(formData.get("conteudo") ?? "");
  const cor = String(formData.get("cor") ?? "amarelo");
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  await supabase.from("expand_notas").upsert(
    { id, membro_id: pessoa.id, conteudo, cor, atualizado_em: new Date().toISOString() },
    { onConflict: "id" }
  );
}
export async function excluirNota(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  await supabase.from("expand_notas").delete().eq("id", id).eq("membro_id", pessoa.id);
}

// ---- Notificações ----
export async function marcarNotificacaoLida(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  await supabase.from("expand_notificacoes").update({ lida: true }).eq("id", id).eq("membro_id", pessoa.id);
  revalidatePath("/expand");
}
export async function marcarTodasNotificacoes() {
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  await supabase.from("expand_notificacoes").update({ lida: true }).eq("membro_id", pessoa.id).eq("lida", false);
  revalidatePath("/expand");
}

// ---- Novas atividades / demandas ----
export async function adicionarEtapaCliente(formData: FormData) {
  const clienteId = String(formData.get("clienteId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!clienteId || !titulo) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const { data: mx } = await supabase.from("expand_etapas").select("ordem, fase").eq("cliente_id", clienteId).order("ordem", { ascending: false }).limit(1).maybeSingle();
  await supabase.from("expand_etapas").insert({
    cliente_id: clienteId, ordem: (Number(mx?.ordem) || 0) + 1, fase: Number(mx?.fase) || 1, titulo,
    criterio: String(formData.get("criterio") ?? "").trim() || null,
    responsavel: String(formData.get("responsavel") ?? "").trim() || "A definir",
    sla: String(formData.get("sla") ?? "").trim() || null,
    area: String(formData.get("area") ?? "").trim() || null,
    status: "idle", origem: "adhoc", qtd_esperada: 1, aprovacao: "gestor", visivel_cliente: true,
  });
  await logar(supabase, "nova-tarefa", `Nova tarefa "${titulo}"`, { cliente_id: clienteId, autor: pessoa.nome });
  revalidatePath("/expand/board");
  revalidatePath("/expand");
}

// cliente (ou staff) solicita demanda pelo portal → função segura + notifica diretoria
export async function solicitarDemanda(formData: FormData) {
  const clienteId = String(formData.get("clienteId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!clienteId || !titulo) return;
  const supabase = await createClient();
  await supabase.rpc("solicitar_demanda", { p_cliente: clienteId, p_titulo: titulo, p_desc: String(formData.get("desc") ?? "").trim() });
  revalidatePath(`/portal/${clienteId}`);
}

// promove uma tarefa da conta para o PROCESSO PADRÃO do produto (admin) → futuros clientes recebem
export async function promoverParaProcesso(formData: FormData) {
  await exigirAdmin();
  const etapaId = String(formData.get("etapaId") ?? "");
  if (!etapaId) return;
  const supabase = await createClient();
  const { data: e } = await supabase.from("expand_etapas").select("cliente_id, titulo, area, responsavel, agente, sla, gatilho, criterio, visivel_cliente, qtd_esperada, aprovacao, marco, depende_de").eq("id", etapaId).single();
  if (!e) return;
  const { data: c } = await supabase.from("expand_clientes").select("produto_slug").eq("id", e.cliente_id as string).single();
  const slug = (c?.produto_slug as string) || "pide";
  const { data: mx } = await supabase.from("expand_prod_etapas").select("ordem, fase_ordem").eq("produto_slug", slug).order("ordem", { ascending: false }).limit(1).maybeSingle();
  await supabase.from("expand_prod_etapas").insert({
    produto_slug: slug, fase_ordem: Number(mx?.fase_ordem) || 1, ordem: (Number(mx?.ordem) || 0) + 1,
    titulo: e.titulo, area: e.area, responsavel: e.responsavel, agente: e.agente, sla: e.sla,
    gatilho: e.gatilho, criterio: e.criterio, visivel_cliente: e.visivel_cliente, qtd_esperada: e.qtd_esperada,
    aprovacao: e.aprovacao, marco: e.marco, depende_de: e.depende_de,
  });
  revalidatePath(`/expand/etapa/${etapaId}`);
}

// ---- Ferramenta: criar grupo de WhatsApp (uazapi) ----
type GrupoRes = { jid?: string; link?: string; nome?: string; avisos?: string[]; erro?: string } | null;
export async function criarGrupo(_prev: GrupoRes, formData: FormData): Promise<GrupoRes> {
  await exigirAdmin();
  const url = process.env.UAZAPI_URL, token = process.env.UAZAPI_TOKEN;
  if (!url || !token) return { erro: "Configure UAZAPI_URL e UAZAPI_TOKEN no Vercel (e Redeploy)." };
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Dê um nome ao grupo." };
  const descricao = String(formData.get("descricao") ?? "").trim();
  const clienteId = String(formData.get("clienteId") ?? "").trim();
  const nums = (s: FormDataEntryValue | null) => String(s ?? "").split(/[\n,;]+/).map((x) => x.replace(/\D/g, "")).filter((x) => x.length >= 10);
  const participants = nums(formData.get("participantes"));
  const admins = nums(formData.get("admins"));
  const base = url.replace(/\/$/, "");
  const H = { "Content-Type": "application/json; charset=utf-8", token };
  const avisos: string[] = [];
  try {
    const res = await fetch(`${base}/group/create`, { method: "POST", headers: H, body: JSON.stringify({ name: nome, participants }) });
    const j = (await res.json()) as Record<string, unknown>;
    const g = ((j.group ?? j.instance ?? j) as Record<string, unknown>) ?? {};
    const jid = (g.JID ?? g.jid ?? g.id ?? g.groupJid) as string | undefined;
    if (!jid) return { erro: String(j.error ?? j.message ?? "O servidor não retornou o JID do grupo.") };
    if (descricao) { try { await fetch(`${base}/group/updateDescription`, { method: "POST", headers: H, body: JSON.stringify({ groupjid: jid, description: descricao }) }); } catch { avisos.push("descrição não aplicada — ajuste no grupo"); } }
    if (admins.length) { try { await fetch(`${base}/group/updateParticipants`, { method: "POST", headers: H, body: JSON.stringify({ groupjid: jid, action: "promote", participants: admins }) }); } catch { avisos.push("admins não promovidos"); } }
    let link: string | undefined;
    try { const r = await fetch(`${base}/group/inviteLink`, { method: "POST", headers: H, body: JSON.stringify({ groupjid: jid }) }); const jl = (await r.json()) as Record<string, unknown>; link = (jl.link ?? jl.inviteLink ?? jl.url) as string | undefined; } catch { /* opcional */ }
    if (clienteId) { const supabase = await createClient(); await supabase.from("expand_clientes").update({ whatsapp_grupo: jid, whatsapp_grupo_nome: nome, whatsapp_grupo_link: link ?? null }).eq("id", clienteId); revalidatePath(`/expand/clientes/${clienteId}`); }
    return { jid, link, nome, avisos };
  } catch (e) { return { erro: String((e as Error)?.message ?? e) }; }
}

// ---- Diagnóstico do cliente: Temperamento (com arquétipo) ----
export async function salvarTemperamentoCliente(formData: FormData) {
  const clienteId = String(formData.get("clienteId") ?? "");
  const nome = String(formData.get("pessoa_nome") ?? "").trim();
  if (!clienteId || !nome) return;
  let respostas: number[] = [];
  try { respostas = JSON.parse(String(formData.get("respostas") ?? "[]")) as number[]; } catch { respostas = []; }
  if (!respostas.some(Boolean)) return;
  const { calcularTemperamento, montarTemperamento } = await import("@/lib/expand-temperamento");
  const scores = calcularTemperamento(respostas);
  const r = montarTemperamento(scores);
  const supabase = await createClient();
  await supabase.from("expand_diag_cliente").insert({
    cliente_id: clienteId, tipo: "temperamento",
    pessoa_nome: nome,
    pessoa_papel: String(formData.get("pessoa_papel") ?? "").trim() || null,
    pessoa_email: String(formData.get("pessoa_email") ?? "").trim() || null,
    respostas, scores, dominante: r.dominante, apoio: r.apoio, rotulo: r.rotulo,
    segundos: parseInt(String(formData.get("segundos") ?? "0"), 10) || null,
  });
  revalidatePath(`/portal/${clienteId}/diagnosticos`);
  redirect(`/portal/${clienteId}/diagnosticos`);
}

// ---- Diagnóstico do cliente: Arquétipo de MARCA (teste do Henrique, 12 arquétipos) ----
export async function salvarArquetipoMarca(formData: FormData) {
  const clienteId = String(formData.get("clienteId") ?? "");
  const nome = String(formData.get("pessoa_nome") ?? "").trim();
  if (!clienteId || !nome) return;
  let respostas: number[] = [];
  try { respostas = JSON.parse(String(formData.get("respostas") ?? "[]")) as number[]; } catch { respostas = []; }
  if (!respostas.some(Boolean)) return;
  const { calcularArquetipo, montarArquetipo } = await import("@/lib/expand-arquetipo");
  const scores = calcularArquetipo(respostas);
  const r = montarArquetipo(scores);
  const supabase = await createClient();
  await supabase.from("expand_diag_cliente").insert({
    cliente_id: clienteId, tipo: "arquetipo_marca",
    pessoa_nome: nome,
    pessoa_papel: String(formData.get("pessoa_papel") ?? "").trim() || null,
    respostas, scores, dominante: r.dominante, apoio: r.apoio ?? null, rotulo: r.segmento,
    segundos: parseInt(String(formData.get("segundos") ?? "0"), 10) || null,
  });
  revalidatePath(`/portal/${clienteId}/diagnosticos`);
  redirect(`/portal/${clienteId}/diagnosticos`);
}

// ---- Notificações do cliente (portal) ----
export async function marcarNotifCliente(formData: FormData) {
  const notifId = String(formData.get("notifId") ?? "");
  if (!notifId) return;
  const supabase = await createClient();
  await supabase.from("expand_notificacoes").update({ lida: true }).eq("id", notifId);
}

// Avisa o cliente no sino do portal. Regra: toda notificação leva a um lugar,
// exceto alertas/avisos (tipo 'alerta' | 'aviso'), que são informativos.
export async function notificarCliente(clienteId: string, tipo: string, texto: string, link: string | null) {
  const supabase = await createClient();
  await supabase.from("expand_notificacoes").insert({ cliente_id: clienteId, tipo, texto, link });
}

// Solicita 1x1 com Humberto (especialista em pessoas) a partir do portal do cliente.
export async function solicitarHumberto(formData: FormData) {
  const clienteId = String(formData.get("clienteId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!clienteId) return;
  const supabase = await createClient();
  const texto = nome ? `${nome} solicitou um 1x1 com o Humberto (diagnóstico comportamental).` : "Solicitação de 1x1 com Humberto recebida pelo portal.";
  await supabase.from("expand_notificacoes").insert({
    cliente_id: clienteId, tipo: "alerta",
    texto, link: `/portal/${clienteId}/diagnosticos`,
  });
  revalidatePath(`/portal/${clienteId}/diagnosticos`);
}

// ---- Plano de Ação interno (Grupo Expand) ----
export async function alternarPlanoAcao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const { data } = await supabase.from("expand_plano_acao").select("status, titulo").eq("id", id).maybeSingle();
  const feito = data?.status === "done";
  await supabase.from("expand_plano_acao").update({ status: feito ? "idle" : "done", concluida_em: feito ? null : new Date().toISOString() }).eq("id", id);
  await logar(supabase, "plano", `${feito ? "Reabriu" : "Concluiu"}: ${data?.titulo ?? id}`, { autor: pessoa.nome });
  revalidatePath("/expand/plano");
}

export async function novaAcaoPlano(formData: FormData) {
  await exigirAdmin();
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;
  const resp = String(formData.get("responsaveis") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const data_limite = String(formData.get("data_limite") ?? "").trim() || null;
  const prioridade = String(formData.get("prioridade") ?? "normal").trim() || "normal";
  const detalhe    = String(formData.get("detalhe") ?? "").trim() || null;
  const supabase = await createClient();
  await supabase.from("expand_plano_acao").insert({ titulo, responsaveis: resp, data_limite, prioridade, detalhe, origem: "manual" });
  revalidatePath("/expand/plano");
}

export async function deletarAcaoPlano(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("expand_plano_acao").delete().eq("id", id);
  revalidatePath("/expand/plano");
}

export async function editarAcaoPlano(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const titulo     = String(formData.get("titulo") ?? "").trim() || null;
  const resp       = String(formData.get("responsaveis") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const data_limite = String(formData.get("data_limite") ?? "").trim() || null;
  const prioridade = String(formData.get("prioridade") ?? "normal").trim() || "normal";
  const detalhe    = String(formData.get("detalhe") ?? "").trim() || null;
  const supabase = await createClient();
  await supabase.from("expand_plano_acao").update({ titulo, responsaveis: resp, data_limite, prioridade, detalhe }).eq("id", id);
  revalidatePath("/expand/plano");
}

// ---- Equipe: incluir membro + convite de acesso ----
type ConviteRes = { ok?: boolean; id?: string; nome?: string; link?: string | null; aviso?: string | null; erro?: string } | null;
function slugPessoa(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "membro";
}
export async function convidarMembro(_prev: ConviteRes, formData: FormData): Promise<ConviteRes> {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  const cargo = String(formData.get("cargo") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!nome) return { erro: "Informe o nome do membro." };
  const supabase = await createClient();
  let id = slugPessoa(nome);
  const { data: ex } = await supabase.from("expand_perfis").select("id").eq("id", id).maybeSingle();
  if (ex) id = `${id}-${Math.random().toString(36).slice(2, 5)}`;
  await supabase.from("expand_perfis").insert({ id, nome, tipo: "humano", cargo: cargo || null, area: area || null, cor: "#2f80ff" });

  let link: string | null = null, aviso: string | null = null;
  if (email) {
    const admin = createAdminClient();
    if (!admin) aviso = "Membro criado no time, mas o convite por link precisa de SUPABASE_SERVICE_ROLE_KEY no Vercel.";
    else {
      const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email, options: { redirectTo: `${siteUrl()}/definir-senha` } });
      if (error) aviso = `Membro criado. O convite não foi gerado: ${error.message} (se o e-mail já tem conta, aprove em Acessos).`;
      else {
        link = (data?.properties as { action_link?: string } | undefined)?.action_link ?? null;
        const uid = data?.user?.id;
        if (uid) await admin.from("profiles").update({ role: "equipe", expand_membro: id, full_name: nome, email }).eq("id", uid);
      }
    }
  }
  revalidatePath("/expand/equipe");
  return { ok: true, id, nome, link, aviso };
}

// ---- Rotinas (play/pause, intervalo, rodar agora) ----
export async function alternarRotina(formData: FormData) {
  await exigirAdmin();
  const chave = String(formData.get("chave") ?? "");
  if (!chave) return;
  const supabase = await createClient();
  const { data } = await supabase.from("expand_rotina").select("ativa").eq("chave", chave).maybeSingle();
  await supabase.from("expand_rotina").update({ ativa: !(data?.ativa ?? true) }).eq("chave", chave);
  revalidatePath("/expand/rotinas");
}

export async function ajustarIntervalo(formData: FormData) {
  await exigirAdmin();
  const chave = String(formData.get("chave") ?? "");
  const min = parseInt(String(formData.get("intervalo_min") ?? "1440"), 10);
  if (!chave || !Number.isFinite(min) || min < 5) return;
  const supabase = await createClient();
  await supabase.from("expand_rotina").update({ intervalo_min: min }).eq("chave", chave);
  revalidatePath("/expand/rotinas");
}

export async function rodarRotinaResumo() {
  await exigirAdmin();
  const supabase = await createClient();
  const { data: cls } = await supabase.from("expand_clientes").select("id, nome, whatsapp_grupo").eq("ativo", true).not("whatsapp_grupo", "is", null);
  const { processarResumoCliente } = await import("@/lib/resumo");
  let tin = 0, tout = 0, custo = 0;
  for (const c of (cls ?? []) as { id: string; nome: string; whatsapp_grupo: string | null }[]) {
    const r = await processarResumoCliente(supabase, c);
    tin += r.tokensIn; tout += r.tokensOut; custo += r.custo;
  }
  const { data: rr } = await supabase.from("expand_rotina").select("tokens_total, custo_total").eq("chave", "resumo-diario").maybeSingle();
  await supabase.from("expand_rotina").update({ ultima_exec: new Date().toISOString(), tokens_total: Number(rr?.tokens_total ?? 0) + tin + tout, custo_total: Number(rr?.custo_total ?? 0) + custo }).eq("chave", "resumo-diario");
  revalidatePath("/expand/rotinas");
}

// ---- Fase B: resumo diário do grupo (rodar manual + adotar demanda) ----
export async function rodarResumoAgora(formData: FormData) {
  await exigirAdmin();
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!clienteId) return;
  const supabase = await createClient();
  const { data: c } = await supabase.from("expand_clientes").select("id, nome, whatsapp_grupo").eq("id", clienteId).maybeSingle();
  if (!c) return;
  const { processarResumoCliente } = await import("@/lib/resumo");
  const r = await processarResumoCliente(supabase, c as { id: string; nome: string; whatsapp_grupo: string | null });
  const { data: rot } = await supabase.from("expand_rotina").select("tokens_total, custo_total").eq("chave", "resumo-diario").maybeSingle();
  await supabase.from("expand_rotina").update({ ultima_exec: new Date().toISOString(), tokens_total: Number(rot?.tokens_total ?? 0) + r.tokensIn + r.tokensOut, custo_total: Number(rot?.custo_total ?? 0) + r.custo }).eq("chave", "resumo-diario");
  revalidatePath(`/expand/clientes/${clienteId}`);
}

// Adoção de demanda pelo PMO: escopo (este cliente / todos os ativos / processo padrão)
// + responsável (uma pessoa OU o PMO IA). Gera etapa(s) no lugar certo.
export async function adotarDemanda(formData: FormData) {
  await exigirAdmin();
  const clienteId = String(formData.get("clienteId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!clienteId || !titulo) return;
  const escopo = String(formData.get("escopo") ?? "cliente");        // cliente | todos | padrao
  const responsavel = String(formData.get("responsavel") ?? "ia").trim(); // id da pessoa OU 'ia'
  const ehIA = responsavel === "ia" || responsavel === "";
  const supabase = await createClient();
  const { pessoa } = await getPessoa();

  let respNome = "PMO IA";
  if (!ehIA) { const { data: p } = await supabase.from("expand_perfis").select("nome").eq("id", responsavel).maybeSingle(); respNome = (p?.nome as string) ?? responsavel; }

  async function proxOrdem(cid: string) {
    const { data: mx } = await supabase.from("expand_etapas").select("ordem").eq("cliente_id", cid).order("ordem", { ascending: false }).limit(1).maybeSingle();
    return Number(mx?.ordem ?? 0) + 1;
  }
  const etapa = (cid: string, ordem: number) => ({ cliente_id: cid, titulo, ordem, fase: 99, area: "cs", status: "idle", origem: "resumo", visivel_cliente: false, aprovacao: "qualquer", responsavel: respNome, agente: ehIA ? "gerente-projetos" : null });

  if (escopo === "todos") {
    const { data: cls } = await supabase.from("expand_clientes").select("id").eq("ativo", true);
    for (const c of (cls ?? []) as { id: string }[]) await supabase.from("expand_etapas").insert(etapa(c.id, await proxOrdem(c.id)));
  } else if (escopo === "padrao") {
    const { data: cli } = await supabase.from("expand_clientes").select("produto_slug").eq("id", clienteId).maybeSingle();
    const slug = cli?.produto_slug as string | null;
    if (slug) {
      const { data: mx } = await supabase.from("expand_prod_etapas").select("ordem").eq("produto_slug", slug).order("ordem", { ascending: false }).limit(1).maybeSingle();
      await supabase.from("expand_prod_etapas").insert({ produto_slug: slug, fase_ordem: 99, ordem: Number(mx?.ordem ?? 0) + 1, titulo, area: "cs", responsavel: respNome, agente: ehIA ? "gerente-projetos" : null, sla: "Sob demanda", gatilho: "Melhoria adotada", criterio: "Concluída e validada", qtd_esperada: 1, aprovacao: "qualquer", visivel_cliente: false, marco: false });
    }
    await supabase.from("expand_etapas").insert(etapa(clienteId, await proxOrdem(clienteId))); // aplica também na conta atual
  } else {
    await supabase.from("expand_etapas").insert(etapa(clienteId, await proxOrdem(clienteId)));
  }

  await logar(supabase, "demanda", `Adotou do resumo (${escopo} · resp. ${respNome}): "${titulo}"`, { cliente_id: clienteId, autor: pessoa.nome });
  revalidatePath(`/expand/clientes/${clienteId}`);
}

// ---- Área do Cliente: pasta do Drive ----
export async function salvarLinkDrive(formData: FormData) {
  await exigirAdmin();
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!clienteId) return;
  const url = String(formData.get("url") ?? "").trim();
  // Extrai o id da pasta de um link do Drive (…/folders/<id>…) quando possível.
  const m = url.match(/[-\w]{25,}/);
  const supabase = await createClient();
  await supabase.from("expand_clientes").update({ drive_folder_url: url || null, drive_folder_id: m ? m[0] : null }).eq("id", clienteId);
  revalidatePath(`/expand/clientes/${clienteId}`);
}

// ---- WhatsApp: grupo do cliente (avisos/links/aprovações) ----
export async function salvarGrupoCliente(formData: FormData) {
  await exigirAdmin();
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!clienteId) return;
  const jid = String(formData.get("jid") ?? "").trim();
  let nome: string | null = null;
  if (jid) { const { listarGrupos } = await import("@/lib/whatsapp"); const g = await listarGrupos(); nome = g.find((x) => x.jid === jid)?.nome ?? null; }
  const supabase = await createClient();
  await supabase.from("expand_clientes").update({ whatsapp_grupo: jid || null, whatsapp_grupo_nome: nome }).eq("id", clienteId);
  revalidatePath("/expand/board");
}

// Salva o link de convite do grupo — cola manual, ou busca no uazapi se já houver grupo.
export async function salvarLinkGrupo(formData: FormData) {
  await exigirAdmin();
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!clienteId) return;
  const manual = String(formData.get("link") ?? "").trim();
  const supabase = await createClient();
  let link: string | null = manual || null;
  if (!link) {
    const { data: c } = await supabase.from("expand_clientes").select("whatsapp_grupo").eq("id", clienteId).maybeSingle();
    const jid = c?.whatsapp_grupo as string | null;
    if (jid) { const { linkConviteGrupo } = await import("@/lib/whatsapp"); link = await linkConviteGrupo(jid); }
  }
  await supabase.from("expand_clientes").update({ whatsapp_grupo_link: link }).eq("id", clienteId);
  revalidatePath(`/expand/clientes/${clienteId}`);
}

export async function testarGrupoCliente(formData: FormData) {
  await exigirAdmin();
  const clienteId = String(formData.get("clienteId") ?? "");
  if (!clienteId) return;
  const supabase = await createClient();
  const { data: c } = await supabase.from("expand_clientes").select("nome, whatsapp_grupo").eq("id", clienteId).maybeSingle();
  const jid = c?.whatsapp_grupo as string | null;
  if (!jid) return;
  const { enviarWhatsapp } = await import("@/lib/whatsapp");
  await enviarWhatsapp(jid, `✅ Teste da Expand — este grupo de *${c?.nome ?? "cliente"}* está conectado. A partir de agora, avisos, links e aprovações chegam por aqui.`);
  revalidatePath("/expand/board");
}

// ── Custo da etapa → Financeiro ───────────────────────────────────────────────
export async function gerarCustoFinanceiro(payload: {
  etapaId: string;
  area: string;
  agente: string | null;
  duracao_min: number;
  responsavel: string | null;
  custo_responsavel: number;
  custo_agente: number;
  custo_total: number;
  detalhes: string; // JSON serializado
}) {
  const supabase = await createClient();
  const { pessoa } = await getPessoa();
  const autor = pessoa?.nome ?? "sistema";

  const clienteId = await clienteDaEtapa(supabase, payload.etapaId);

  await logar(supabase, "custo_financeiro", payload.detalhes, {
    etapa_id: payload.etapaId,
    cliente_id: clienteId,
    autor,
  });

  // Notifica quem tiver papel admin/financeiro
  const { data: financeiros } = await supabase
    .from("expand_perfis")
    .select("id")
    .in("papel", ["admin", "financeiro"]);

  for (const f of financeiros ?? []) {
    await notificar(
      supabase,
      f.id as string,
      "custo",
      `Custo de etapa gerado: R$ ${payload.custo_total.toFixed(2)} (${payload.area})`,
      `/expand/etapa/${payload.etapaId}`,
    );
  }

  revalidatePath(`/expand/etapa/${payload.etapaId}`);
}
