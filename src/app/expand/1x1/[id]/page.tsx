import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAcesso } from "@/lib/expand-acesso";
import SessaoHub from "./SessaoHub";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = {
  trimestral: "Pulso trimestral",
  debriefing: "Debriefing de projeto",
  demanda:    "Sob demanda",
};

async function salvarResposta(fd: FormData) {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return;
  const adminSb = createAdminClient();
  if (!adminSb) return;
  const sessaoId = String(fd.get("sessao_id"));
  const pergunta = String(fd.get("pergunta") ?? "").trim();
  const resposta = String(fd.get("resposta") ?? "").trim();
  if (!pergunta || !resposta) return;
  await adminSb.from("expand_1x1_respostas").insert({ sessao_id: sessaoId, pergunta, resposta });
  revalidatePath(`/expand/1x1/${sessaoId}`);
}

async function salvarConclusao(fd: FormData) {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return;
  const adminSb = createAdminClient();
  if (!adminSb) return;
  const sessaoId = String(fd.get("sessao_id"));

  const combinadosRaw = String(fd.get("combinados") ?? "[]");
  const sinaisRaw     = String(fd.get("sinais") ?? "[]");

  let combinados = [];
  let sinais = [];
  try { combinados = JSON.parse(combinadosRaw); } catch {}
  try { sinais = JSON.parse(sinaisRaw); } catch {}

  await adminSb.from("expand_1x1").update({
    status:        "realizado",
    data_realizado: new Date().toISOString(),
    observacoes:   String(fd.get("observacoes") ?? ""),
    humor:         String(fd.get("humor") ?? ""),
    carga:         String(fd.get("carga") ?? ""),
    combinados,
    sinais,
  }).eq("id", sessaoId);

  revalidatePath(`/expand/1x1/${sessaoId}`);
  revalidatePath("/expand/1x1");
}

async function excluirResposta(fd: FormData) {
  "use server";
  const { userId } = await getAcesso();
  if (!userId) return;
  const adminSb = createAdminClient();
  if (!adminSb) return;
  const id = String(fd.get("id"));
  const sessaoId = String(fd.get("sessao_id"));
  await adminSb.from("expand_1x1_respostas").delete().eq("id", id);
  revalidatePath(`/expand/1x1/${sessaoId}`);
}

export default async function SessaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await getAcesso();
  if (!userId) redirect("/login");

  const sb = await createClient();

  const [{ data: sessaoRaw }, { data: respostasRaw }, { data: perfisRaw }, { data: clientesRaw }] = await Promise.all([
    sb.from("expand_1x1").select("*").eq("id", id).single(),
    sb.from("expand_1x1_respostas").select("*").eq("sessao_id", id).order("criado_em"),
    sb.from("expand_perfis").select("id,nome,cargo,foto_url,cor").eq("tipo", "humano"),
    sb.from("expand_clientes").select("id,nome"),
  ]);

  if (!sessaoRaw) notFound();

  const sessao = sessaoRaw as {
    id: string; tipo: string; membro_id: string; cliente_id: string | null;
    data_agendada: string | null; data_realizado: string | null; status: string;
    observacoes: string | null; combinados: { texto: string; responsavel: string; prazo: string }[] | null;
    sinais: { nivel: string; texto: string }[] | null; humor: string | null; carga: string | null;
    criado_em: string; criado_por: string | null;
  };

  const respostas = (respostasRaw ?? []) as { id: string; pergunta: string; resposta: string; criado_em: string }[];
  const perfis = (perfisRaw ?? []) as { id: string; nome: string; cargo: string | null; foto_url: string | null; cor: string | null }[];
  const clientes = (clientesRaw ?? []) as { id: string; nome: string }[];

  const membro = perfis.find(p => p.id === sessao.membro_id);
  const cliente = clientes.find(c => c.id === sessao.cliente_id);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Link href="/expand/1x1" style={{ fontSize: 12.5, color: "var(--dim)", textDecoration: "none", fontWeight: 600 }}>
          ← 1x1
        </Link>
        <span style={{ color: "var(--line-2)" }}>/</span>
        <span style={{ fontSize: 12.5, color: "var(--mut)" }}>{TIPO_LABEL[sessao.tipo] ?? sessao.tipo}</span>
      </div>

      <SessaoHub
        sessao={sessao}
        respostas={respostas}
        membro={membro ?? null}
        cliente={cliente ?? null}
        salvarResposta={salvarResposta}
        salvarConclusao={salvarConclusao}
        excluirResposta={excluirResposta}
      />
    </>
  );
}
