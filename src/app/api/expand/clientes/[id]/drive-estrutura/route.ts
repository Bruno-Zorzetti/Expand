import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAcesso } from "@/lib/expand-acesso";
import { criarEstruturaCliente } from "@/lib/google-drive";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cria a estrutura padrão de pastas no Google Drive para um cliente.
// POST /api/expand/clientes/{id}/drive-estrutura
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { isAdmin } = await getAcesso();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "config" }, { status: 500 });

  const { data: cli } = await admin.from("expand_clientes").select("nome, drive_folder_id, drive_estrutura_criada").eq("id", id).single();
  if (!cli) return NextResponse.json({ error: "cliente não encontrado" }, { status: 404 });
  if (cli.drive_estrutura_criada && cli.drive_folder_id) {
    return NextResponse.json({ error: "Estrutura já criada", link: `https://drive.google.com/drive/folders/${cli.drive_folder_id}` }, { status: 409 });
  }

  // Buscar documentos-modelo para copiar nas pastas corretas
  const { data: docs } = await admin
    .from("expand_config_docs")
    .select("nome, categoria, drive_file_id")
    .not("drive_file_id", "is", null);
  const docsModelo = (docs ?? []) as { nome: string; categoria: string; drive_file_id: string | null }[];

  const estrutura = await criarEstruturaCliente(cli.nome as string, docsModelo);
  if (!estrutura) {
    return NextResponse.json({ error: "Falha ao criar pastas. Verifique se o Google está conectado em Integrações." }, { status: 500 });
  }

  // Salvar o ID e link da pasta raiz no cliente
  await admin.from("expand_clientes").update({
    drive_folder_id: estrutura.rootId,
    drive_folder_url: estrutura.rootLink,
    drive_estrutura_criada: true,
  }).eq("id", id);

  return NextResponse.json({ ok: true, link: estrutura.rootLink, pastas: estrutura.pastas });
}
