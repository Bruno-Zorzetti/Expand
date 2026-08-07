import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/expand-perfis";
import { QUESTOES_DISC, QUESTOES_TEMP, montarResultado, type DiscKey, type TempKey } from "@/lib/expand-disc";
import DiagnosticoForm from "@/components/expand/DiagnosticoForm";

export const dynamic = "force-dynamic";

async function salvarDiagnostico(perfilId: string, disc: number[], temp: number[]) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  if (!(me?.role === "admin" || (me?.expand_membro as string | null) === perfilId)) return;

  const dsum: Record<DiscKey, number> = { D: 0, I: 0, S: 0, C: 0 };
  QUESTOES_DISC.forEach((q, idx) => { dsum[q.k] += disc[idx] ?? 3; });
  const tsum: Record<TempKey, number> = { sanguineo: 0, colerico: 0, melancolico: 0, fleumatico: 0 };
  QUESTOES_TEMP.forEach((q, idx) => { tsum[q.k] += temp[idx] ?? 3; });
  const r = montarResultado(dsum, tsum);

  await supabase.from("expand_perfis").update({
    disc: dsum, temperamentos: tsum, disc_segmento: r.discSegmento, temp_segmento: r.tempSegmento, comportamental_em: new Date().toISOString(),
  }).eq("id", perfilId);
  await supabase.from("expand_diagnosticos").insert({
    perfil_id: perfilId, disc: dsum, temperamentos: tsum, disc_segmento: r.discSegmento, temp_segmento: r.tempSegmento, respostas: { disc, temp },
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
      <p className="ex-sub" style={{ maxWidth: 640, margin: "0 auto 18px", textAlign: "center" }}>Responda pensando no seu jeito natural. No fim geramos seu perfil <b>DISC</b> (com sobreposição — ex.: D com traços de I) e seu <b>temperamento</b>, para o time trabalhar em harmonia e colocar a pessoa certa na cadeira certa. Leva ~2 minutos e vale mais a sinceridade que a resposta "certa".</p>
      <DiagnosticoForm perfilId={id} nome={p.nome} onSalvar={salvar} />
    </>
  );
}
