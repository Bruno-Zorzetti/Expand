import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatHub from "./ChatHub";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role, expand_membro").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role as string)) redirect("/expand");

  // Carregar membros da equipe (humanos) para iniciar DMs
  const { data: membros } = await supabase
    .from("expand_perfis")
    .select("id, nome, cargo, area, cor, foto_url")
    .eq("tipo", "humano")
    .eq("ativo", true)
    .order("nome");

  const meuPerfil = me.expand_membro as string | null;

  return <ChatHub membros={membros ?? []} meuPerfil={meuPerfil} userId={user.id} />;
}
