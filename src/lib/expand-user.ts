import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Pessoa = { id: string; nome: string; papel: string; ini: string };

// Resolve a "pessoa da Expand" da sessão:
// 1) cookie de preview (admin "ver como"), 2) vínculo profiles.expand_membro, 3) fallback Ana.
export async function getPessoa(): Promise<{ pessoa: Pessoa; equipe: Pessoa[] }> {
  const supabase = await createClient();
  const { data: eq } = await supabase.from("expand_equipe").select("id,nome,papel,ini").order("ordem");
  const equipe = (eq ?? []) as Pessoa[];

  const jar = await cookies();
  const escolhido = jar.get("expand_pessoa")?.value;

  let mapped: string | undefined;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: p } = await supabase.from("profiles").select("expand_membro").eq("id", user.id).single();
    mapped = (p?.expand_membro as string | null) ?? undefined;
  }

  const id = escolhido ?? mapped ?? "ana";
  const pessoa =
    equipe.find((e) => e.id === id) ??
    equipe.find((e) => e.id === "ana") ??
    equipe[0] ??
    { id: "ana", nome: "Ana", papel: "Gerente de Projetos", ini: "A" };

  return { pessoa, equipe };
}
