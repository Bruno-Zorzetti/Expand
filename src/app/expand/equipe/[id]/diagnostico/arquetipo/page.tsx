import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QUESTOES_ARQ, calcularArquetipo, montarArquetipo } from "@/lib/expand-arquetipo";
import QuizForm from "@/components/expand/QuizForm";

export const dynamic = "force-dynamic";

async function salvarArquetipo(perfilId: string, respostas: number[]) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  if (!(me?.role === "admin" || (me?.expand_membro as string | null) === perfilId)) return;

  const aScores = calcularArquetipo(respostas);
  const ra = montarArquetipo(aScores);

  await supabase.from("expand_perfis").update({
    arquetipo: aScores,
    arquetipo_dominante: ra.dominante,
    comportamental_em: new Date().toISOString(),
  }).eq("id", perfilId);

  await supabase.from("expand_diagnosticos").insert({
    perfil_id: perfilId,
    respostas: { arqu: respostas, arquetipo: aScores, dominante: ra.dominante },
  });
}

export default async function DiagnosticoArquetipo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  const { data } = await supabase.from("expand_perfis").select("id, nome").eq("id", id).single();
  if (!data) notFound();
  const p = data as { id: string; nome: string };
  if (!(me?.role === "admin" || (me?.expand_membro as string | null) === id)) redirect(`/expand/equipe/${id}`);

  const salvar = salvarArquetipo.bind(null, id);

  return (
    <>
      <Link href={`/expand/equipe/${id}/diagnostico`} className="ex-back">← Voltar aos diagnósticos</Link>
      <p className="hx-eyebrow">Diagnóstico · Arquétipo</p>
      <h1 className="ex-h1">Quem você <span className="hx-accent-text">é por dentro</span></h1>
      <p className="ex-sub" style={{ maxWidth: 600, margin: "0 auto 22px", textAlign: "center" }}>
        48 afirmações. Marque o quanto cada uma representa você de verdade.
        Baseado na metodologia do Henrique Toledo — identifica seu arquétipo dominante entre 12 perfis.
      </p>
      <QuizForm
        perfilId={id}
        nome={p.nome}
        tipo="Arquétipo"
        perguntas={QUESTOES_ARQ}
        voltarHref={`/expand/equipe/${id}/diagnostico`}
        onSalvar={salvar}
      />
    </>
  );
}
