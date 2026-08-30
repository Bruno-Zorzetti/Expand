import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const tipo = (form.get("tipo") as string) ?? "foto"; // "foto" | "hero"

  if (!file) return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `perfis/${user.id}/${tipo}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await sb.storage
    .from("expand-entregaveis")
    .upload(path, buf, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: signed } = await sb.storage
    .from("expand-entregaveis")
    .createSignedUrl(path, 86400 * 365); // 1 ano

  return NextResponse.json({ url: signed?.signedUrl ?? "" });
}
