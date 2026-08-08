import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SlidesPresent from "@/components/expand/SlidesPresent";
import type { Slide } from "@/lib/expand-slides";

export const dynamic = "force-dynamic";

export default async function Apresentar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("expand_apresentacoes").select("slides").eq("id", id).maybeSingle();
  if (!data) notFound();
  const slides = (data.slides as Slide[]) ?? [];
  return <SlidesPresent slides={slides} voltar={`/expand/apresentacoes/${id}`} />;
}
