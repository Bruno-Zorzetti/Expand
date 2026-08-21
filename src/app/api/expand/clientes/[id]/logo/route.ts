import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAcesso } from "@/lib/expand-acesso";

export const dynamic = "force-dynamic";

// Upload da logo do cliente → Supabase Storage → atualiza logo_url na tabela
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { isAdmin } = await getAcesso();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "form inválido" }, { status: 400 });

  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "arquivo" }, { status: 400 });

  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Máximo 5MB" }, { status: 413 });
  if (!/^image\//.test(file.type)) return NextResponse.json({ error: "Somente imagens" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "png";
  const path = `logos/${id}/${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  // Usar admin client para ter acesso ao storage sem RLS
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "config" }, { status: 500 });

  const { error: storageErr } = await admin.storage
    .from("expand-entregaveis")
    .upload(path, buf, { contentType: file.type, upsert: true });

  if (storageErr) return NextResponse.json({ error: "storage: " + storageErr.message }, { status: 500 });

  const { data: urlData } = admin.storage.from("expand-entregaveis").getPublicUrl(path);
  const url = urlData.publicUrl;

  await admin.from("expand_clientes").update({ logo_url: url }).eq("id", id);

  return NextResponse.json({ ok: true, url });
}
