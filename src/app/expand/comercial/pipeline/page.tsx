import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import PipelineBoard from "@/components/expand/PipelineBoard";

export const dynamic = "force-dynamic";

export type Op = {
  id: string; nome: string; empresa: string | null; telefone: string | null;
  email: string | null; etapa: string; board: string;
  produto_slug: string | null; valor: number | null;
  responsavel: string | null; origem: string | null;
  observacoes: string | null; data_reuniao: string | null;
  motivo_perda: string | null; created_at: string; updated_at: string;
};

async function criar(fd: FormData) {
  "use server";
  const sb = await createClient();
  const v = (k: string) => String(fd.get(k) ?? "").trim() || null;
  const board = String(fd.get("board") ?? "atendimento");
  await sb.from("expand_oportunidades").insert({
    nome: String(fd.get("nome")),
    empresa: v("empresa"), telefone: v("telefone"), email: v("email"),
    etapa: v("etapa") ?? (board === "captacao" ? "prospectando" : "novo_lead"),
    board,
    produto_slug: v("produto_slug"),
    valor: fd.get("valor") ? Number(fd.get("valor")) : null,
    responsavel: v("responsavel"), origem: v("origem"), observacoes: v("observacoes"),
  });
  revalidatePath("/expand/comercial/pipeline");
}

async function mover(fd: FormData) {
  "use server";
  const sb = await createClient();
  await sb.from("expand_oportunidades").update({
    etapa: String(fd.get("etapa")),
    board: String(fd.get("board") ?? "atendimento"),
    motivo_perda: String(fd.get("motivo_perda") ?? "").trim() || null,
  }).eq("id", String(fd.get("id")));
  revalidatePath("/expand/comercial/pipeline");
}

async function salvar(fd: FormData) {
  "use server";
  const sb = await createClient();
  const v = (k: string) => String(fd.get(k) ?? "").trim() || null;
  await sb.from("expand_oportunidades").update({
    nome: String(fd.get("nome")), empresa: v("empresa"), telefone: v("telefone"),
    email: v("email"), produto_slug: v("produto_slug"),
    valor: fd.get("valor") ? Number(fd.get("valor")) : null,
    responsavel: v("responsavel"), origem: v("origem"), observacoes: v("observacoes"),
    data_reuniao: v("data_reuniao"),
  }).eq("id", String(fd.get("id")));
  revalidatePath("/expand/comercial/pipeline");
}

async function excluir(fd: FormData) {
  "use server";
  const sb = await createClient();
  await sb.from("expand_oportunidades").delete().eq("id", String(fd.get("id")));
  revalidatePath("/expand/comercial/pipeline");
}

async function moverParaAtendimento(fd: FormData) {
  "use server";
  const sb = await createClient();
  await sb.from("expand_oportunidades").update({
    board: "atendimento", etapa: "novo_lead",
  }).eq("id", String(fd.get("id")));
  revalidatePath("/expand/comercial/pipeline");
}

export default async function Pipeline({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const sp = await searchParams;
  const board = sp.board === "captacao" ? "captacao" : "atendimento";

  const sb = await createClient();
  const { pessoa } = await getPessoa();

  const { data } = await sb
    .from("expand_oportunidades")
    .select("*")
    .order("updated_at", { ascending: false });

  const { data: perfisData } = await sb
    .from("expand_perfis")
    .select("id, nome")
    .eq("tipo", "humano")
    .order("nome");

  const allOps = (data ?? []) as Op[];
  const perfis = (perfisData ?? []) as { id: string; nome: string }[];

  // Ops do board selecionado — fallback para ops sem board no atendimento
  const ops = allOps.filter((o) => {
    const b = o.board ?? "atendimento";
    return b === board;
  });

  // KPIs gerais (ambos os boards)
  const ativas = allOps.filter((o) => !["cliente", "perda", "fechado", "perdido"].includes(o.etapa));
  const arrAtivo = ativas.reduce((s, o) => s + (o.valor ?? 0), 0);
  const agora = new Date();
  const clientesMes = allOps.filter((o) => {
    if (!["cliente", "fechado"].includes(o.etapa)) return false;
    const d = new Date(o.updated_at);
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
  });
  const arrMes = clientesMes.reduce((s, o) => s + (o.valor ?? 0), 0);
  const taxa = allOps.length > 0 ? Math.round((allOps.filter((o) => ["cliente", "fechado"].includes(o.etapa)).length / allOps.length) * 100) : 0;

  const captTotal = allOps.filter((o) => (o.board ?? "atendimento") === "captacao").length;
  const funiTotal = allOps.filter((o) => (o.board ?? "atendimento") === "atendimento").length;

  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <p className="hx-eyebrow">Comercial · Pipeline</p>
        <h1 className="ex-h1" style={{ margin: 0 }}>
          Funil de <span className="hx-accent-text">vendas</span>
        </h1>
      </div>
      <p className="ex-sub" style={{ marginBottom: 14 }}>
        Dois kanbans separados: <strong>Captação</strong> (prospecção ativa) e <strong>Atendimento</strong> (funil de fechamento).
      </p>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 18 }}>
        {[
          { l: "Em disputa", v: String(ativas.length), u: `R$ ${arrAtivo.toLocaleString("pt-BR")}` },
          { l: "Clientes este mês", v: String(clientesMes.length), u: `R$ ${arrMes.toLocaleString("pt-BR")}` },
          { l: "Taxa de conversão", v: `${taxa}%`, u: "leads → cliente" },
          { l: "Em captação", v: String(captTotal), u: "prospectando" },
          { l: "No funil", v: String(funiTotal), u: "atendimento" },
        ].map((k) => (
          <div key={k.l} className="ex-kpi hx-glass">
            <span className="ex-kpi-l">{k.l}</span>
            <span className="ex-kpi-v">{k.v}</span>
            {k.u && <span className="ex-kpi-u">{k.u}</span>}
          </div>
        ))}
      </div>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: 4, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 4, marginBottom: 18, width: "fit-content" }}>
        {[
          { key: "captacao", label: "Captação", desc: "prospecção ativa" },
          { key: "atendimento", label: "Atendimento", desc: "funil de fechamento" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/expand/comercial/pipeline?board=${t.key}`}
            style={{
              padding: "7px 18px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 700,
              background: board === t.key ? "var(--accent)" : "none",
              color: board === t.key ? "#0A1512" : "var(--mut)",
            }}
          >
            {t.label}
            <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 5, opacity: 0.7 }}>{t.desc}</span>
          </Link>
        ))}
      </div>

      <PipelineBoard
        ops={ops}
        board={board}
        perfis={perfis}
        pessoaId={pessoa.id}
        criar={criar}
        mover={mover}
        salvar={salvar}
        excluir={excluir}
        moverParaAtendimento={moverParaAtendimento}
      />
    </>
  );
}
