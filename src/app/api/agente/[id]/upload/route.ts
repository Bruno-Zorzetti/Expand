import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Upload de material direto do chat → vira nó na memória (RAG) do agente. Staff only.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role as string)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "arquivo" }, { status: 400 });
  const descricao = String(form.get("descricao") ?? "").trim();

  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `conhecimento/${id}/${Date.now()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from("expand-entregaveis").upload(path, buf, { contentType: file.type || undefined, upsert: false });
  if (error) return NextResponse.json({ error: "storage" }, { status: 500 });

  let conteudo: string | null = descricao || null;
  if (/\.(txt|md|markdown|csv|json|srt|vtt)$/i.test(file.name)) { try { conteudo = buf.toString("utf8").slice(0, 40000); } catch { /* noop */ } }

  await supabase.from("expand_conhecimento").insert({
    agente_id: id, tipo: "biblioteca", titulo: file.name, conteudo, fonte: "Anexo do chat",
    criado_por: (me.role as string) === "admin" ? "Admin" : "Equipe", arquivo_path: path, arquivo_nome: file.name,
  });
  return NextResponse.json({ ok: true, nome: file.name });
}
