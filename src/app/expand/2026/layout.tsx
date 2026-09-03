import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExpandShell2026 from "@/components/expand/ExpandShell2026";

export default async function Layout2026({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/expand/2026");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as string) ?? "pendente";
  if (role === "cliente") redirect("/cliente");
  if (role !== "admin" && role !== "equipe") redirect("/aguardando");

  const { data: perfil } = await supabase
    .from("expand_perfis")
    .select("nome, cargo")
    .eq("user_id", user.id)
    .maybeSingle();

  const nome = perfil?.nome ?? profile?.full_name ?? user.email ?? "Usuário";
  const papel = perfil?.cargo ?? (role === "admin" ? "Administrador" : "Equipe");
  const ini = nome.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <ExpandShell2026 user={{ id: user.id, nome, papel, ini, role }}>
      {children}
    </ExpandShell2026>
  );
}
