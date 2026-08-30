import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatHub from "./ChatHub";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role as string)) redirect("/expand");

  const meuPerfil = (me.expand_membro as string | null) ?? "";

  const [{ data: membros }, { data: vinc }] = await Promise.all([
    supabase.from("expand_perfis").select("id, nome, cargo, cor, foto_url").eq("tipo", "humano").eq("ativo", true).order("nome"),
    // mapa: auth user id → expand_perfis id
    supabase.from("profiles").select("id, expand_membro").not("expand_membro", "is", null),
  ]);

  const userToMembro: Record<string, string> = {};
  for (const v of vinc ?? []) {
    if (v.expand_membro) userToMembro[v.id as string] = v.expand_membro as string;
  }

  return (
    <ChatHub
      userId={user.id}
      meuPerfil={meuPerfil}
      membros={membros ?? []}
      userToMembro={userToMembro}
    />
  );
}
