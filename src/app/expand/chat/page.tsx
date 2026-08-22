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

  const [{ data: canais }, { data: membros }, { data: userProfiles }] = await Promise.all([
    supabase.from("expand_chat_canais").select("id, nome, descricao, icone").eq("publico", true).order("id"),
    supabase.from("expand_perfis").select("id, nome, cargo, cor, foto_url").eq("ativo", true).order("nome"),
    // Map auth UUID → expand_membro para mostrar nome/avatar em mensagens de canal
    supabase.from("profiles").select("id, expand_membro").not("expand_membro", "is", null),
  ]);

  const meuPerfil = me.expand_membro as string | null;

  // Monta mapa: authUserId → perfil info
  const perfilById = Object.fromEntries((membros ?? []).map(m => [m.id, m]));
  const userMap: Record<string, { nome: string; cargo: string | null; cor: string | null; foto_url: string | null }> = {};
  for (const up of userProfiles ?? []) {
    const perfil = perfilById[up.expand_membro as string];
    if (perfil) userMap[up.id] = perfil;
  }
  // Inclui o próprio usuário
  if (meuPerfil && perfilById[meuPerfil]) userMap[user.id] = perfilById[meuPerfil];

  return (
    <ChatHub
      canais={canais ?? []}
      membros={membros ?? []}
      meuPerfil={meuPerfil}
      userId={user.id}
      userMap={userMap}
    />
  );
}
