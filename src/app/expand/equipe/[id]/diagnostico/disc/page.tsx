import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QUESTOES_DISC, montarDisc, type DiscKey } from "@/lib/expand-disc";
import { montarBlenda } from "@/lib/expand-disc-blenda";
import QuizForm from "@/components/expand/QuizForm";

export const dynamic = "force-dynamic";

async function salvarDisc(perfilId: string, respostas: number[]) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  if (!(me?.role === "admin" || (me?.expand_membro as string | null) === perfilId)) return;

  const dsum: Record<DiscKey, number> = { D: 0, I: 0, S: 0, C: 0 };
  QUESTOES_DISC.forEach((q, idx) => { dsum[q.k] += respostas[idx] ?? 3; });
  const rd = montarDisc(dsum);
  const bl = montarBlenda(dsum);

  await supabase.from("expand_perfis").update({
    disc: dsum,
    disc_segmento: rd.discSegmento,
    disc_blenda: bl.cod,
    comportamental_em: new Date().toISOString(),
  }).eq("id", perfilId);

  await supabase.from("expand_diagnosticos").insert({
    perfil_id: perfilId,
    disc: dsum,
    disc_segmento: rd.discSegmento,
    respostas: { disc: respostas },
  });
}

export default async function DiagnosticoDisc({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  const { data } = await supabase.from("expand_perfis").select("id, nome").eq("id", id).single();
  if (!data) notFound();
  const p = data as { id: string; nome: string };
  if (!(me?.role === "admin" || (me?.expand_membro as string | null) === id)) redirect(`/expand/equipe/${id}`);

  const salvar = salvarDisc.bind(null, id);
  const perguntas = QUESTOES_DISC.map(q => q.q);

  return (
    <>
      <Link href={`/expand/equipe/${id}/diagnostico`} className="ex-back">← Voltar aos diagnósticos</Link>
      <p className="hx-eyebrow">Diagnóstico · DISC</p>
      <h1 className="ex-h1">Como você <span className="hx-accent-text">age e decide</span></h1>
      <p className="ex-sub" style={{ maxWidth: 600, margin: "0 auto 22px", textAlign: "center" }}>
        12 perguntas. Responda pelo seu jeito natural, não como você acha que deveria ser.
        Seu perfil DISC mostra como você lidera, toma decisões e trabalha sob pressão.
      </p>
      <QuizForm
        perfilId={id}
        nome={p.nome}
        tipo="DISC"
        perguntas={perguntas}
        voltarHref={`/expand/equipe/${id}/diagnostico`}
        onSalvar={salvar}
      />
    </>
  );
}
