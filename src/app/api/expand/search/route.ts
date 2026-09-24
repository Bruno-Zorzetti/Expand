import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const supabase = await createClient();
  const [{ data: cli }, { data: etapas }, { data: membros }] = await Promise.all([
    supabase.from("expand_clientes").select("id, nome").ilike("nome", `%${q}%`).limit(6),
    supabase.from("expand_etapas").select("id, titulo").ilike("titulo", `%${q}%`).limit(5),
    supabase.from("expand_perfis").select("id, nome, cargo").ilike("nome", `%${q}%`).eq("tipo", "humano").limit(4),
  ]);

  const hits = [
    ...(cli ?? []).map((c: { id: string; nome: string }) => ({ label: c.nome, sub: "Cliente", href: `/expand/clientes/${c.id}` })),
    ...(etapas ?? []).map((e: { id: string; titulo: string }) => ({ label: e.titulo, sub: "Tarefa", href: `/expand/etapa/${e.id}` })),
    ...(membros ?? []).map((m: { id: string; nome: string; cargo?: string }) => ({ label: m.nome, sub: m.cargo ?? "Equipe", href: `/expand/equipe/${m.id}` })),
  ];

  return NextResponse.json(hits);
}
