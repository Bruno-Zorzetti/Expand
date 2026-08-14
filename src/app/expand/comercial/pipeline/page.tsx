import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import PipelineBoard from "@/components/expand/PipelineBoard";

export const dynamic = "force-dynamic";

export type Op = {
  id: string; nome: string; empresa: string | null; telefone: string | null;
  email: string | null; etapa: string; produto_slug: string | null;
  valor: number | null; responsavel: string | null; origem: string | null;
  observacoes: string | null; data_reuniao: string | null;
  motivo_perda: string | null; created_at: string; updated_at: string;
};

async function criar(fd: FormData) {
  "use server";
  const sb = await createClient();
  const v = (k: string) => String(fd.get(k) ?? "").trim() || null;
  await sb.from("expand_oportunidades").insert({
    nome: String(fd.get("nome")), empresa: v("empresa"), telefone: v("telefone"),
    email: v("email"), etapa: v("etapa") ?? "lead",
    produto_slug: v("produto_slug"), valor: fd.get("valor") ? Number(fd.get("valor")) : null,
    responsavel: v("responsavel"), origem: v("origem"), observacoes: v("observacoes"),
  });
  revalidatePath("/expand/comercial/pipeline");
}

async function mover(fd: FormData) {
  "use server";
  const sb = await createClient();
  await sb.from("expand_oportunidades").update({
    etapa: String(fd.get("etapa")),
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

export default async function Pipeline() {
  const sb = await createClient();
  const { pessoa } = await getPessoa();

  const { data } = await sb
    .from("expand_oportunidades")
    .select("*")
    .order("updated_at", { ascending: false });

  const { data: perfisData } = await sb
    .from("expand_perfis")
    .select("id, nome")
    .in("tipo", ["humano"])
    .order("nome");

  const ops = (data ?? []) as Op[];
  const perfis = (perfisData ?? []) as { id: string; nome: string }[];

  const ativas = ops.filter((o) => !["fechado", "perdido"].includes(o.etapa));
  const arrAtivo = ativas.reduce((s, o) => s + (o.valor ?? 0), 0);
  const agora = new Date();
  const fechadasMes = ops.filter((o) => {
    if (o.etapa !== "fechado") return false;
    const d = new Date(o.updated_at);
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
  });
  const arrMes = fechadasMes.reduce((s, o) => s + (o.valor ?? 0), 0);
  const total = ops.length;
  const fechados = ops.filter((o) => o.etapa === "fechado").length;
  const taxa = total > 0 ? Math.round((fechados / total) * 100) : 0;

  const kpis = [
    { l: "No pipeline", v: String(ativas.length), u: "oportunidades" },
    { l: "ARR em disputa", v: `R$ ${arrAtivo.toLocaleString("pt-BR")}`, u: "" },
    { l: "Fechados este mês", v: String(fechadasMes.length), u: `R$ ${arrMes.toLocaleString("pt-BR")}` },
    { l: "Taxa de conversão", v: `${taxa}%`, u: "lead → fechado" },
  ];

  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <p className="hx-eyebrow">Comercial · Funil</p>
        <h1 className="ex-h1" style={{ margin: 0 }}>
          Pipeline de <span className="hx-accent-text">vendas</span>
        </h1>
      </div>
      <p className="ex-sub" style={{ marginBottom: 18 }}>
        Cada oportunidade do primeiro contato ao fechamento.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(148px,1fr))",
          gap: 10,
          marginBottom: 22,
        }}
      >
        {kpis.map((k) => (
          <div key={k.l} className="ex-kpi hx-glass">
            <span className="ex-kpi-l">{k.l}</span>
            <span className="ex-kpi-v">{k.v}</span>
            {k.u && <span className="ex-kpi-u">{k.u}</span>}
          </div>
        ))}
      </div>

      <PipelineBoard
        ops={ops}
        perfis={perfis}
        pessoaId={pessoa.id}
        criar={criar}
        mover={mover}
        salvar={salvar}
        excluir={excluir}
      />
    </>
  );
}
