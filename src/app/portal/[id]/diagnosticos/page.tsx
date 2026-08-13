import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { salvarTemperamentoCliente, salvarArquetipoMarca, solicitarHumberto } from "@/app/expand/actions";
import TesteTemperamento from "@/components/expand/TesteTemperamento";
import TesteArquetipoMarca from "@/components/expand/TesteArquetipoMarca";
import DiagnosticosClient from "@/components/expand/DiagnosticosClient";

export const dynamic = "force-dynamic";

type Diag = {
  id: string;
  pessoa_nome: string;
  pessoa_papel: string | null;
  tipo: string;
  scores: Record<string, number>;
  dominante: string | null;
  apoio: string | null;
  rotulo: string | null;
  segundos: number | null;
  criado_em: string;
};

export default async function Diagnosticos({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const { id } = await params;
  const { novo } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("expand_diag_cliente")
    .select("id, pessoa_nome, pessoa_papel, tipo, scores, dominante, apoio, rotulo, segundos, criado_em")
    .eq("cliente_id", id)
    .order("criado_em", { ascending: false });

  const diags = (data ?? []) as Diag[];
  const temps = diags.filter(d => d.tipo === "temperamento");
  const marcas = diags.filter(d => d.tipo === "arquetipo_marca");

  // ── Tela do teste de Arquétipo de Marca ──────────────────────────────────────
  if (novo === "marca") {
    return (
      <>
        <div className="ex-hero">
          <div className="eb">Diagnóstico · posicionamento</div>
          <h2>Arquétipo de Marca</h2>
          <p>Este é sobre a <b style={{ color: "var(--txt)" }}>sua empresa</b>, não sobre você. Ele revela a personalidade da marca — o que ela representa para quem compra — e orienta o tom da comunicação, o visual e as histórias que contamos. São 48 afirmações; responda pensando na marca.</p>
        </div>
        <TesteArquetipoMarca clienteId={id} salvar={salvarArquetipoMarca} />
      </>
    );
  }

  // ── Tela do teste de Temperamento ────────────────────────────────────────────
  if (novo === "temperamento" || (!temps.length && !marcas.length && novo !== "0")) {
    return (
      <>
        <div className="ex-hero">
          <div className="eb">Diagnóstico 1 · pessoa</div>
          <h2>Temperamento</h2>
          <p>Entender como você funciona nos ajuda a trabalhar do seu jeito: como comunicamos, com que ritmo entregamos e como conduzimos as decisões. São {32} afirmações — responda pensando em como você é de verdade, não em como gostaria de ser. Leva cerca de 5 minutos.</p>
        </div>
        <TesteTemperamento clienteId={id} salvar={salvarTemperamentoCliente} />
      </>
    );
  }

  // ── Sem diagnósticos — convite ────────────────────────────────────────────────
  if (!diags.length) {
    return (
      <>
        <div className="ex-hero">
          <div className="eb">Perfil comportamental</div>
          <h2>Diagnósticos</h2>
          <p>Ainda não temos diagnósticos preenchidos. Comece pelo Temperamento — leva 5 minutos e nos ajuda a trabalhar do jeito certo com você.</p>
        </div>
        <Link href={`/portal/${id}/diagnosticos?novo=temperamento`} className="hx-btn hx-btn-primary" style={{ textDecoration: "none" }}>
          Começar: Temperamento
        </Link>
      </>
    );
  }

  // ── Resultados com tabs ───────────────────────────────────────────────────────
  return (
    <>
      <div className="ex-hero">
        <div className="eb">Perfil comportamental</div>
        <h2>Diagnósticos</h2>
        <p>O que já sabemos sobre quem toca este projeto. Cada sócio ou responsável pode fazer o seu — quanto mais gente, melhor a leitura do time.</p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        <Link href={`/portal/${id}/diagnosticos?novo=temperamento`} className="hx-btn" style={{ textDecoration: "none", fontSize: 13 }}>＋ Temperamento</Link>
        {temps.length > 0 && (
          <Link href={`/portal/${id}/diagnosticos?novo=marca`} className="hx-btn" style={{ textDecoration: "none", fontSize: 13 }}>＋ Arquétipo de Marca</Link>
        )}
      </div>

      <DiagnosticosClient diags={diags} clienteId={id} solicitarHumberto={solicitarHumberto} />
    </>
  );
}
