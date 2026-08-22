import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  const { perfilId } = await req.json() as { perfilId?: string };
  if (!perfilId) return NextResponse.json({ error: "perfilId obrigatório" }, { status: 400 });

  const isAdmin = me?.role === "admin";
  const isOwner = (me?.expand_membro as string | null) === perfilId;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const sb = createAdminClient();
  if (!sb) return NextResponse.json({ error: "Erro de configuração" }, { status: 500 });

  await sb.from("expand_google_tokens").delete().eq("perfil_id", perfilId);

  return NextResponse.json({ ok: true });
}
