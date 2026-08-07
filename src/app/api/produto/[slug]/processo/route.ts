import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Reordenar (drag) e remover etapas do processo de um produto. Staff only.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role as string)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  if (body.action === "remove") {
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id" }, { status: 400 });
    await supabase.from("expand_prod_etapas").delete().eq("id", id).eq("produto_slug", slug);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reorder") {
    // ids: nova ordem de uma fase. Reatribui os MESMOS valores de `ordem` na nova sequência
    // (permuta dentro da fase, sem colidir com o resto do processo).
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [];
    if (!ids.length) return NextResponse.json({ error: "ids" }, { status: 400 });
    const { data: rows } = await supabase.from("expand_prod_etapas").select("id, ordem").in("id", ids).eq("produto_slug", slug);
    const ordens = (rows ?? []).map((r) => r.ordem as number).sort((a, b) => a - b);
    // aplica em duas passadas para não violar a unique(produto_slug, ordem)
    for (let i = 0; i < ids.length; i++) {
      await supabase.from("expand_prod_etapas").update({ ordem: -1000 - i }).eq("id", ids[i]).eq("produto_slug", slug);
    }
    for (let i = 0; i < ids.length; i++) {
      await supabase.from("expand_prod_etapas").update({ ordem: ordens[i] }).eq("id", ids[i]).eq("produto_slug", slug);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action" }, { status: 400 });
}
