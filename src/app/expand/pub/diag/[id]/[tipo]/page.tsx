import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QUESTOES_DISC, montarDisc, type DiscKey } from "@/lib/expand-disc";
import { montarBlenda } from "@/lib/expand-disc-blenda";
import { QUESTOES_ARQ, calcularArquetipo, montarArquetipo } from "@/lib/expand-arquetipo";
import { QUESTOES_TEMP, calcularTemperamento, montarTemperamento } from "@/lib/expand-temperamento";
import QuizForm from "@/components/expand/QuizForm";

export const dynamic = "force-dynamic";

// ── Salvar DISC (sem auth) ──────────────────────────────────────────────────
async function salvarDiscPub(perfilId: string, respostas: number[]) {
  "use server";
  const sb = createAdminClient();
  if (!sb) return;
  const dsum: Record<DiscKey, number> = { D: 0, I: 0, S: 0, C: 0 };
  QUESTOES_DISC.forEach((q, idx) => { dsum[q.k] += respostas[idx] ?? 3; });
  const rd = montarDisc(dsum);
  const bl = montarBlenda(dsum);
  await sb.from("expand_perfis").update({
    disc: dsum, disc_segmento: rd.discSegmento, disc_blenda: bl.cod,
    comportamental_em: new Date().toISOString(),
  }).eq("id", perfilId);
}

// ── Salvar Arquétipo (sem auth) ─────────────────────────────────────────────
async function salvarArquetipoPub(perfilId: string, respostas: number[]) {
  "use server";
  const sb = createAdminClient();
  if (!sb) return;
  const scores = calcularArquetipo(respostas);
  const ra = montarArquetipo(scores);
  await sb.from("expand_perfis").update({
    arquetipo: scores, arquetipo_dominante: ra.dominante,
    comportamental_em: new Date().toISOString(),
  }).eq("id", perfilId);
}

// ── Salvar Temperamento (sem auth) ──────────────────────────────────────────
async function salvarTemperamentoPub(perfilId: string, respostas: number[]) {
  "use server";
  const sb = createAdminClient();
  if (!sb) return;
  const scores = calcularTemperamento(respostas);
  const rt = montarTemperamento(scores);
  await sb.from("expand_perfis").update({
    temperamento: scores,
    temperamento_dominante: rt.dominante,
    temperamento_apoio: rt.apoio,
    comportamental_em: new Date().toISOString(),
  }).eq("id", perfilId);
}

export default async function PublicQuiz({ params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { id, tipo } = await params;
  const sb = await createClient();
  const { data } = await sb.from("expand_perfis").select("id, nome").eq("id", id).single();
  if (!data) notFound();
  const p = data as { id: string; nome: string };

  let perguntas: string[];
  let salvar: (respostas: number[]) => Promise<void>;
  let nomeDiag: string;
  let desc: string;
  let voltarHref: string;

  switch (tipo) {
    case "disc":
      perguntas = QUESTOES_DISC.map(q => q.q);
      salvar = salvarDiscPub.bind(null, id);
      nomeDiag = "DISC";
      desc = "12 perguntas sobre como você age e decide. Responda pelo seu jeito natural.";
      voltarHref = `/expand/pub/diag/${id}`;
      break;
    case "arquetipo":
      perguntas = QUESTOES_ARQ as string[];
      salvar = salvarArquetipoPub.bind(null, id);
      nomeDiag = "Arquétipo";
      desc = "48 afirmações. Indique o quanto cada uma descreve você.";
      voltarHref = `/expand/pub/diag/${id}`;
      break;
    case "temperamento":
      perguntas = QUESTOES_TEMP as string[];
      salvar = salvarTemperamentoPub.bind(null, id);
      nomeDiag = "Temperamentos";
      desc = "32 afirmações sobre como você sente e se relaciona.";
      voltarHref = `/expand/pub/diag/${id}`;
      break;
    default:
      notFound();
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--txt)", padding: "24px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link href={voltarHref} style={{ fontSize: 12.5, color: "var(--dim)", textDecoration: "none", display: "inline-block", marginBottom: 20 }}>← Voltar</Link>
        <p className="hx-eyebrow">Diagnóstico · {nomeDiag}</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>
          {p.nome} — <span style={{ color: "var(--accent)" }}>{nomeDiag}</span>
        </h1>
        <p style={{ fontSize: 13, color: "var(--mut)", marginBottom: 22 }}>{desc}</p>
        <QuizForm
          perfilId={id}
          nome={p.nome}
          tipo={nomeDiag}
          perguntas={perguntas}
          voltarHref={voltarHref}
          onSalvar={salvar}
        />
      </div>
    </main>
  );
}
