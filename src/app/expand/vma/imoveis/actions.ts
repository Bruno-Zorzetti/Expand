"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type VmaImovel = {
  id: string;
  codigo: string | null;
  titulo: string;
  finalidade: "Venda" | "Locação" | "Venda e Locação";
  tipo: string;
  subtipo: string;
  status: "Ativo" | "Suspenso" | "Vendido" | "Locado";
  pais: string;
  estado: string;
  cidade: string;
  bairro: string;
  endereco: string;
  numero: string;
  complemento: string;
  cep: string;
  latitude: number | null;
  longitude: number | null;
  preco_venda: number;
  preco_locacao: number;
  preco_condominio: number;
  preco_iptu: number;
  area_total: number;
  area_util: number;
  quartos: number;
  suites: number;
  banheiros: number;
  vagas: number;
  salas: number;
  piscina: boolean;
  churrasqueira: boolean;
  sauna: boolean;
  varanda: boolean;
  varanda_gourmet: boolean;
  mobiliado: boolean;
  ar_condicionado: boolean;
  elevador: boolean;
  academia: boolean;
  portaria: boolean;
  descricao: string;
  link_video: string;
  link_tour: string;
  fotos: { url: string; principal: boolean; nome: string }[];
  portais: Record<string, boolean>;
  criado_em: string;
  atualizado_em: string;
};

function n(v: unknown): number { return Number(v) || 0; }
function b(v: unknown): boolean { return !!v; }
function s(v: unknown): string { return String(v ?? ""); }

function formToPayload(fd: FormData) {
  const fotosRaw = fd.get("fotos_json");
  const fotos = fotosRaw ? JSON.parse(String(fotosRaw)) : [];

  return {
    codigo:          fd.get("codigo") || null,
    titulo:          s(fd.get("titulo")),
    finalidade:      s(fd.get("finalidade")),
    tipo:            s(fd.get("tipo")),
    subtipo:         s(fd.get("subtipo")),
    status:          s(fd.get("status")),
    pais:            s(fd.get("pais")) || "Brasil",
    estado:          s(fd.get("estado")),
    cidade:          s(fd.get("cidade")),
    bairro:          s(fd.get("bairro")),
    endereco:        s(fd.get("endereco")),
    numero:          s(fd.get("numero")),
    complemento:     s(fd.get("complemento")),
    cep:             s(fd.get("cep")),
    latitude:        fd.get("latitude") ? n(fd.get("latitude")) : null,
    longitude:       fd.get("longitude") ? n(fd.get("longitude")) : null,
    preco_venda:      n(fd.get("preco_venda")),
    preco_locacao:    n(fd.get("preco_locacao")),
    preco_condominio: n(fd.get("preco_condominio")),
    preco_iptu:       n(fd.get("preco_iptu")),
    area_total:      n(fd.get("area_total")),
    area_util:       n(fd.get("area_util")),
    quartos:         n(fd.get("quartos")),
    suites:          n(fd.get("suites")),
    banheiros:       n(fd.get("banheiros")),
    vagas:           n(fd.get("vagas")),
    salas:           n(fd.get("salas")),
    piscina:         b(fd.get("piscina")),
    churrasqueira:   b(fd.get("churrasqueira")),
    sauna:           b(fd.get("sauna")),
    varanda:         b(fd.get("varanda")),
    varanda_gourmet: b(fd.get("varanda_gourmet")),
    mobiliado:       b(fd.get("mobiliado")),
    ar_condicionado: b(fd.get("ar_condicionado")),
    elevador:        b(fd.get("elevador")),
    academia:        b(fd.get("academia")),
    portaria:        b(fd.get("portaria")),
    descricao:       s(fd.get("descricao")),
    link_video:      s(fd.get("link_video")),
    link_tour:       s(fd.get("link_tour")),
    fotos,
    portais: {
      olx:          b(fd.get("portal_olx")),
      chavenamao:   b(fd.get("portal_chavenamao")),
      mercadolivre: b(fd.get("portal_mercadolivre")),
    },
  };
}

// ── Análise por portal ───────────────────────────────────────────────────────

export type PortalAnalise = {
  portal: string;
  label: string;
  ok: boolean;
  erros: string[];
  avisos: string[];
};

type Payload = ReturnType<typeof formToPayload>;

function regrasOlx(p: Payload): PortalAnalise {
  const erros: string[] = [];
  const avisos: string[] = [];
  const fin = (p.finalidade ?? "").toLowerCase();

  if (p.titulo.length < 20)      erros.push("Título muito curto (mínimo 20 caracteres)");
  if (!p.tipo)                   erros.push("Tipo de imóvel é obrigatório");
  if (!p.cidade)                 erros.push("Cidade é obrigatória");
  if (!p.estado)                 erros.push("Estado é obrigatório");
  if (!p.bairro)                 avisos.push("Bairro recomendado para maior visibilidade");
  if (fin.includes("venda") && !p.preco_venda)   erros.push("Preço de venda obrigatório");
  if (fin.includes("loca")  && !p.preco_locacao) erros.push("Preço de locação obrigatório");
  if (p.fotos.length === 0)      erros.push("Pelo menos 1 foto é obrigatória");
  else if (p.fotos.length < 3)   avisos.push("Recomendado mínimo 3 fotos");
  if (p.descricao.length < 50)   avisos.push("Descrição com ≥ 50 caracteres recomendada");
  if (!p.area_total && !p.area_util) avisos.push("Área do imóvel recomendada");

  return { portal: "olx", label: "OLX Canal Pro", ok: erros.length === 0, erros, avisos };
}

function regrasChaveNaMao(p: Payload): PortalAnalise {
  const erros: string[] = [];
  const avisos: string[] = [];
  const fin = (p.finalidade ?? "").toLowerCase();

  if (!p.titulo)                 erros.push("Título obrigatório");
  if (!p.tipo)                   erros.push("Tipo de imóvel obrigatório");
  if (!p.cidade)                 erros.push("Cidade obrigatória");
  if (fin.includes("venda") && !p.preco_venda)   erros.push("Preço de venda obrigatório");
  if (fin.includes("loca")  && !p.preco_locacao) erros.push("Preço de locação obrigatório");
  if (p.fotos.length === 0)      erros.push("Pelo menos 1 foto obrigatória");
  if (p.descricao.length < 30)   avisos.push("Descrição recomendada");

  return { portal: "chavenamao", label: "Chave na Mão", ok: erros.length === 0, erros, avisos };
}

function regrasMercadoLivre(p: Payload): PortalAnalise {
  const erros: string[] = [];
  const avisos: string[] = [];
  const fin = (p.finalidade ?? "").toLowerCase();

  if (p.titulo.length < 10)      erros.push("Título muito curto");
  if (!p.tipo)                   erros.push("Tipo de imóvel obrigatório");
  if (!p.cidade)                 erros.push("Cidade obrigatória");
  if (!p.estado)                 erros.push("Estado obrigatório");
  if (fin.includes("venda") && !p.preco_venda)   erros.push("Preço de venda obrigatório");
  if (fin.includes("loca")  && !p.preco_locacao) erros.push("Preço de locação obrigatório");
  if (p.fotos.length === 0)      erros.push("Mínimo 1 foto obrigatória");
  else if (p.fotos.length < 5)   avisos.push("Recomendado mínimo 5 fotos para ML");
  if (p.descricao.length < 80)   avisos.push("Descrição com ≥ 80 caracteres recomendada para ML");

  return { portal: "mercadolivre", label: "Mercado Livre", ok: erros.length === 0, erros, avisos };
}

function analisarPortais(p: Payload): PortalAnalise[] {
  const resultado: PortalAnalise[] = [];
  if (p.portais.olx)          resultado.push(regrasOlx(p));
  if (p.portais.chavenamao)   resultado.push(regrasChaveNaMao(p));
  if (p.portais.mercadolivre) resultado.push(regrasMercadoLivre(p));
  return resultado;
}

// ── Ações CRUD ────────────────────────────────────────────────────────────────

export async function criarImovel(_prev: unknown, fd: FormData) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const payload = formToPayload(fd);
  const { data, error } = await sb.from("vma_imoveis").insert({ ...payload, criado_por: user.id }).select("id").single();
  if (error) return { error: error.message };

  revalidatePath("/expand/vma");
  revalidatePath("/expand/vma/imoveis");

  const analise = analisarPortais(payload);
  return { success: true as const, imovelId: data.id, analise, feedUrl: "/api/vma/feed" };
}

export async function atualizarImovel(_prev: unknown, fd: FormData) {
  const id = s(fd.get("id"));
  if (!id) return { error: "ID não informado" };

  const payload = formToPayload(fd);
  const sb = await createClient();
  const { error } = await sb.from("vma_imoveis").update(payload).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/expand/vma");
  revalidatePath("/expand/vma/imoveis");
  revalidatePath(`/expand/vma/imoveis/${id}`);

  const analise = analisarPortais(payload);
  return { success: true as const, imovelId: id, analise, feedUrl: "/api/vma/feed" };
}

export async function excluirImovel(id: string) {
  const sb = await createClient();
  const { error } = await sb.from("vma_imoveis").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/expand/vma");
  redirect("/expand/vma/imoveis");
}

export async function alterarStatus(id: string, status: string) {
  const sb = await createClient();
  await sb.from("vma_imoveis").update({ status }).eq("id", id);
  revalidatePath("/expand/vma/imoveis");
}
