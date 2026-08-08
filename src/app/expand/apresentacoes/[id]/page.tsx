import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SlidesEditor from "@/components/expand/SlidesEditor";
import { salvarApresentacao } from "../actions";
import type { Deck, Slide } from "@/lib/expand-slides";

export const dynamic = "force-dynamic";

export default async function EditarApresentacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("expand_apresentacoes").select("id, titulo, slides, publico").eq("id", id).maybeSingle();
  if (!data) notFound();
  const deck: Deck = { id: data.id as string, titulo: data.titulo as string, slides: (data.slides as Slide[]) ?? [], publico: !!data.publico };
  return <SlidesEditor deck={deck} salvar={salvarApresentacao} />;
}
