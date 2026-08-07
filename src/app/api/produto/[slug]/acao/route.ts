import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Executa uma melhoria proposta pelo PMO, APÓS aprovação humana. Lista branca de ações. Staff only.
const TIPOS = ["sla", "responsavel", "agente", "marco", "depende_de"] as const;
type Tipo = (typeof TIPOS)[number];

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role as string)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const tipo = String(body.tipo ?? "") as Tipo;
  const ordem = Number(body.etapa);
  const valor = String(body.valor ?? "").trim();
  if (!TIPOS.includes(tipo) || !ordem) return NextResponse.json({ error: "acao inválida" }, { status: 400 });

  const { data: et } = await supabase.from("expand_prod_etapas").select("id, titulo, sla, responsavel, agente, marco, depende_de").eq("produto_slug", slug).eq("ordem", ordem).single();
  if (!et) return NextResponse.json({ error: "etapa não encontrada" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  let de = "", para = "";
  if (tipo === "sla") { de = et.sla ?? "—"; para = valor; patch.sla = valor || null; }
  else if (tipo === "responsavel") { de = et.responsavel ?? "—"; para = valor; patch.responsavel = valor || null; }
  else if (tipo === "agente") { de = et.agente ?? "—"; para = valor || "nenhum"; patch.agente = /nenhum|nao|none|—/i.test(valor) || !valor ? null : valor; }
  else if (tipo === "marco") { const v = /sim|true|1|marco/i.test(valor); de = et.marco ? "marco" : "não-marco"; para = v ? "marco" : "não-marco"; patch.marco = v; }
  else if (tipo === "depende_de") { de = et.depende_de ? `#${et.depende_de}` : "—"; const n = /nenhum|nao|remover|0/i.test(valor) ? null : Number(valor.replace(/\D/g, "")) || null; para = n ? `#${n}` : "nenhum"; patch.depende_de = n; }

  await supabase.from("expand_prod_etapas").update(patch).eq("id", et.id);

  const resumo = `Etapa #${ordem} "${et.titulo}": ${tipo} de "${de}" para "${para}".`;
  await supabase.from("expand_conhecimento").insert({
    agente_id: "gerente-projetos", tipo: "acerto", titulo: `Melhoria executada · ${slug}`,
    conteudo: `${resumo}${body.motivo ? ` Motivo: ${body.motivo}.` : ""} Aprovado por ${(me.role as string) === "admin" ? "Admin" : "Gestor"}.`,
    fonte: `Processo ${slug}`, criado_por: (me.role as string) === "admin" ? "Admin" : "Gestor",
  });

  return NextResponse.json({ ok: true, resumo });
}
