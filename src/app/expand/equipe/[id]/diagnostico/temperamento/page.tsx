import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QUESTOES_TEMP, calcularTemperamento, montarTemperamento } from "@/lib/expand-temperamento";
import QuizForm from "@/components/expand/QuizForm";

export const dynamic = "force-dynamic";

async function salvarTemperamento(perfilId: string, respostas: number[]) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  if (!(me?.role === "admin" || (me?.expand_membro as string | null) === perfilId)) return;

  const tScores = calcularTemperamento(respostas);
  const rt = montarTemperamento(tScores);

  await supabase.from("expand_perfis").update({
    temperamento: tScores,
    temperamento_dominante: rt.dominante,
    temperamento_apoio: rt.apoio,
    comportamental_em: new Date().toISOString(),
  }).eq("id", perfilId);

  await supabase.from("expand_diagnosticos").insert({
    perfil_id: perfilId,
    temperamentos: tScores,
    respostas: { temp: respostas, temperamento: tScores, rotulo: rt.rotulo },
  });
}

export default async function DiagnosticoTemperamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  const { data } = await supabase.from("expand_perfis").select("id, nome").eq("id", id).single();
  if (!data) notFound();
  const p = data as { id: string; nome: string };
  if (!(me?.role === "admin" || (me?.expand_membro as string | null) === id)) redirect(`/expand/equipe/${id}`);

  const salvar = salvarTemperamento.bind(null, id);
  const perguntas = QUESTOES_TEMP as string[];

  return (
    <>
      <Link href={`/expand/equipe/${id}/diagnostico`} className="ex-back">← Voltar aos diagnósticos</Link>
      <p className="hx-eyebrow">Diagnóstico · Temperamentos</p>
      <h1 className="ex-h1">Como você <span className="hx-accent-text">sente e reage</span></h1>
      <p className="ex-sub" style={{ maxWidth: 600, margin: "0 auto 22px", textAlign: "center" }}>
        32 afirmações sobre seu jeito natural de ser. Revela seu temperamento dominante
        (Sanguíneo, Colérico, Melancólico ou Fleumático) e como isso molda sua energia e relações.
      </p>
      <QuizForm
        perfilId={id}
        nome={p.nome}
        tipo="Temperamentos"
        perguntas={perguntas}
        voltarHref={`/expand/equipe/${id}/diagnostico`}
        onSalvar={salvar}
      />
    </>
  );
}
