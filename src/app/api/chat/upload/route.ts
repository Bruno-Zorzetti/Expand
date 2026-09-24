import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function inferTipo(mime: string): "imagem" | "audio" | "arquivo" {
  if (mime.startsWith("image/")) return "imagem";
  if (mime.startsWith("audio/")) return "audio";
  return "arquivo";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!prof || !["admin", "equipe"].includes(prof.role as string))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const roomKey = (form.get("room_key") as string | null) ?? "geral";

  if (!file) return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "";
  const path = `chat/${roomKey}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from("expand-entregaveis")
    .upload(path, buf, { contentType: file.type, upsert: false });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: signed } = await supabase.storage
    .from("expand-entregaveis")
    .createSignedUrl(path, 86400 * 7); // 7 dias

  return NextResponse.json({
    url: signed?.signedUrl ?? "",
    path,
    tipo: inferTipo(file.type),
    nome: file.name,
    ext,
  });
}
