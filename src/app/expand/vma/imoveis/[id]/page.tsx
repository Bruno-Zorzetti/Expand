import { exigirAdmin } from "@/lib/expand-acesso";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ImovelForm from "../ImovelForm";
import { atualizarImovel } from "../actions";
import type { VmaImovel } from "../actions";

export default async function EditarImovelPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const { id } = await params;

  const sb = await createClient();
  const { data } = await sb.from("vma_imoveis").select("*").eq("id", id).single();
  if (!data) notFound();

  const imovel = data as unknown as VmaImovel;

  return (
    <>
      <p className="hx-eyebrow">VMA · Imóveis</p>
      <h1 className="ex-h1">
        <span className="hx-accent-text">{imovel.codigo || imovel.id.slice(0, 8)}</span> — {imovel.titulo || "sem título"}
      </h1>
      <p className="ex-sub" style={{ marginBottom: 28 }}>
        Editando imóvel · última atualização {new Date(imovel.atualizado_em).toLocaleDateString("pt-BR")}
      </p>
      <ImovelForm imovel={imovel} action={atualizarImovel} submitLabel="Salvar e publicar" />
    </>
  );
}
