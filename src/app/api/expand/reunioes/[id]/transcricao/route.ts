import { NextRequest, NextResponse } from "next/server";
import { getAcesso } from "@/lib/expand-acesso";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { isAdmin } = await getAcesso();
  if (!isAdmin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const fd = await req.formData();
  const transcricao = String(fd.get("transcricao") ?? "").trim();

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Admin client indisponível" }, { status: 500 });

  const { error } = await admin.from("expand_reunioes").update({ transcricao: transcricao || null }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
