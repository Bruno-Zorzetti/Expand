import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/expand-perfis";
import { QUESTOES_DISC, montarDisc, type DiscKey } from "@/lib/expand-disc";
import { calcularArquetipo, montarArquetipo } from "@/lib/expand-arquetipo";
import { calcularTemperamento, montarTemperamento } from "@/lib/expand-temperamento";
import { montarBlenda } from "@/lib/expand-disc-blenda";
import DiagnosticoForm from "@/components/expand/DiagnosticoForm";

export const dynamic = "force-dynamic";

async function salvarDiagnostico(perfilId: string, disc: number[], arqu: number[], temp: number[]) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  if (!(me?.role === "admin" || (me?.expand_membro as string | null) === perfilId)) return;

  const dsum: Record<DiscKey, number> = { D: 0, I: 0, S: 0, C: 0 };
  QUESTOES_DISC.forEach((q, idx) => { dsum[q.k] += disc[idx] ?? 3; });
  const rd = montarDisc(dsum);
  const aScores = calcularArquetipo(arqu);
  const ra = montarArquetipo(aScores);
  const tScores = calcularTemperamento(temp);
  const rt = montarTemperamento(tScores);
  const bl = montarBlenda(dsum);

  await supabase.from("expand_perfis").update({
    disc: dsum, disc_segmento: rd.discSegmento, disc_blenda: bl.cod,
    arquetipo: aScores, arquetipo_dominante: ra.dominante,
    temperamento: tScores, temperamento_dominante: rt.dominante, temperamento_apoio: rt.apoio,
    comportamental_em: new Date().toISOString(),
  }).eq("id", perfilId);
  await supabase.from("expand_diagnosticos").insert({
    perfil_id: perfilId, disc: dsum, disc_segmento: rd.discSegmento,
    temperamentos: tScores,
    respostas: { disc, arqu, temp, arquetipo: aScores, dominante: ra.dominante, temperamento: rt.rotulo, blenda: bl.cod },
  });
}

export default async function Diagnostico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  const { data } = await supabase.from("expand_perfis").select("*").eq("id", id).single();
  if (!data) notFound();
  const p = data as Perfil;
  if (!(me?.role === "admin" || (me?.expand_membro as string | null) === id)) redirect(`/expand/equipe/${id}`);

  const salvar = salvarDiagnostico.bind(null, id);

  return (
    <>
      <Link href={`/expand/equipe/${id}`} className="ex-back">← Voltar ao perfil</Link>
      <p className="hx-eyebrow">Diagnóstico comportamental</p>
      <h1 className="ex-h1">Como o <span className="hx-accent-text">{p.nome}</span> funciona</h1>
      <p className="ex-sub" style={{ maxWidth: 640, margin: "0 auto 18px", textAlign: "center" }}>Responda pensando no seu jeito natural. No fim geramos seu perfil <b>DISC</b> (com sobreposição — ex.: D com traços de I) e seu <b>arquétipo</b> (metodologia Henrique Toledo), para o time saber como se comunicar e lidar com cada pessoa nas tarefas. Leva alguns minutos e vale mais a sinceridade que a resposta "certa".</p>
      <DiagnosticoForm perfilId={id} nome={p.nome} onSalvar={salvar} />
    </>
  );
}
