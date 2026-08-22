import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listarEventos } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  const perfilId = req.nextUrl.searchParams.get("perfilId") ?? "";
  if (!perfilId) return NextResponse.json({ error: "perfilId obrigatório" }, { status: 400 });

  const isAdmin = me?.role === "admin";
  const isOwner = (me?.expand_membro as string | null) === perfilId;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const eventos = await listarEventos(perfilId, 8);
  return NextResponse.json({ eventos });
}
