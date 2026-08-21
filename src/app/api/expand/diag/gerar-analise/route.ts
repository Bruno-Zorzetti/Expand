import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chamarClaude } from "@/lib/claude";
import {
  promptDisc, promptTemperamento, promptArquetipo, promptVisaoIntegrada,
  type DiscAnalise, type TempAnalise, type ArqAnalise, type VisaoIntegrada,
} from "@/lib/expand-analise-prompt";
import { montarDisc, type DiscKey } from "@/lib/expand-disc";
import { montarTemperamento, type TempKey } from "@/lib/expand-temperamento";
import { montarArquetipo, ARQUETIPOS, type ArqKey } from "@/lib/expand-arquetipo";

export const maxDuration = 60;

function parseJson<T>(text: string): T | null {
  try {
    const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(clean) as T;
  } catch { return null; }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin" && me?.role !== "equipe")
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { perfilId?: string; tipo?: string };
  const { perfilId, tipo } = body;
  if (!perfilId || !tipo) return NextResponse.json({ error: "Parâmetros obrigatórios: perfilId, tipo" }, { status: 400 });

  const { data: perfil } = await supabase
    .from("expand_perfis")
    .select("id, nome, cargo, disc, arquetipo, temperamento, disc_segmento, arquetipo_dominante, temperamento_dominante, temperamento_apoio")
    .eq("id", perfilId)
    .single();
  if (!perfil) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });

  const p = perfil as {
    id: string; nome: string; cargo: string | null;
    disc: Record<DiscKey, number> | null;
    arquetipo: Record<ArqKey, number> | null;
    temperamento: Record<TempKey, number> | null;
    disc_segmento: string | null;
    arquetipo_dominante: ArqKey | null;
    temperamento_dominante: TempKey | null;
    temperamento_apoio: TempKey | null;
  };

  const admin = createAdminClient();
  const MODEL = "claude-haiku-4-5-20251001";

  if (tipo === "disc") {
    if (!p.disc) return NextResponse.json({ error: "Sem dados DISC" }, { status: 400 });
    const rd = montarDisc(p.disc);
    const pmt = promptDisc(p.nome, p.cargo, p.disc, rd.discSegmento, rd.discNome);
    const r = await chamarClaude({ system: pmt.system, messages: [{ role: "user", content: pmt.user }], model: MODEL, maxTokens: 2000 });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
    const analise = parseJson<DiscAnalise>(r.text);
    if (!analise) return NextResponse.json({ error: "JSON inválido da IA" }, { status: 500 });
    await admin!.from("expand_diag_analise").upsert({ perfil_id: perfilId, tipo: "disc", analise, modelo: MODEL, tokens_in: r.usage.input_tokens, tokens_out: r.usage.output_tokens }, { onConflict: "perfil_id,tipo" });
    return NextResponse.json({ ok: true, analise });
  }

  if (tipo === "temperamento") {
    if (!p.temperamento) return NextResponse.json({ error: "Sem dados de Temperamento" }, { status: 400 });
    const rt = montarTemperamento(p.temperamento);
    const pmt = promptTemperamento(p.nome, p.cargo, rt.dominante, rt.apoio ?? null, p.temperamento);
    const r = await chamarClaude({ system: pmt.system, messages: [{ role: "user", content: pmt.user }], model: MODEL, maxTokens: 2000 });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
    const analise = parseJson<TempAnalise>(r.text);
    if (!analise) return NextResponse.json({ error: "JSON inválido da IA" }, { status: 500 });
    await admin!.from("expand_diag_analise").upsert({ perfil_id: perfilId, tipo: "temperamento", analise, modelo: MODEL, tokens_in: r.usage.input_tokens, tokens_out: r.usage.output_tokens }, { onConflict: "perfil_id,tipo" });
    return NextResponse.json({ ok: true, analise });
  }

  if (tipo === "arquetipo") {
    if (!p.arquetipo) return NextResponse.json({ error: "Sem dados de Arquétipo" }, { status: 400 });
    const ra = montarArquetipo(p.arquetipo);
    const top = ra.top.slice(0, 3);
    const pmt = promptArquetipo(p.nome, p.cargo, ra.dominante, ra.apoio ?? null, top[2]?.k ?? null, p.arquetipo);
    const r = await chamarClaude({ system: pmt.system, messages: [{ role: "user", content: pmt.user }], model: MODEL, maxTokens: 2000 });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
    const analise = parseJson<ArqAnalise>(r.text);
    if (!analise) return NextResponse.json({ error: "JSON inválido da IA" }, { status: 500 });
    await admin!.from("expand_diag_analise").upsert({ perfil_id: perfilId, tipo: "arquetipo", analise, modelo: MODEL, tokens_in: r.usage.input_tokens, tokens_out: r.usage.output_tokens }, { onConflict: "perfil_id,tipo" });
    return NextResponse.json({ ok: true, analise });
  }

  if (tipo === "visao_integrada") {
    if (!p.disc || !p.arquetipo_dominante || !p.temperamento_dominante)
      return NextResponse.json({ error: "Complete os 3 diagnósticos antes de gerar a Visão Integrada" }, { status: 400 });
    const rd = montarDisc(p.disc);
    const arqNome = ARQUETIPOS[p.arquetipo_dominante].nome;
    const arqApoio = p.arquetipo ? montarArquetipo(p.arquetipo).apoio : null;
    const arqApoioNome = arqApoio ? ARQUETIPOS[arqApoio].nome : null;
    const TEMP_NOMES: Record<TempKey, string> = { sanguineo: "Sanguíneo", colerico: "Colérico", melancolico: "Melancólico", fleumatico: "Fleumático" };
    const tempNome = p.temperamento_apoio
      ? `${TEMP_NOMES[p.temperamento_dominante]} com traços de ${TEMP_NOMES[p.temperamento_apoio]}`
      : TEMP_NOMES[p.temperamento_dominante];
    const pmt = promptVisaoIntegrada(p.nome, p.cargo, rd.discSegmento, rd.discNome, tempNome, arqNome, arqApoioNome);
    const r = await chamarClaude({ system: pmt.system, messages: [{ role: "user", content: pmt.user }], model: MODEL, maxTokens: 3000 });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
    const analise = parseJson<VisaoIntegrada>(r.text);
    if (!analise) return NextResponse.json({ error: "JSON inválido da IA" }, { status: 500 });
    await admin!.from("expand_diag_analise").upsert({ perfil_id: perfilId, tipo: "visao_integrada", analise, modelo: MODEL, tokens_in: r.usage.input_tokens, tokens_out: r.usage.output_tokens }, { onConflict: "perfil_id,tipo" });
    return NextResponse.json({ ok: true, analise });
  }

  return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
}
