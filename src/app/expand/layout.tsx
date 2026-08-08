import { Cinzel } from "next/font/google";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import ExpandShell from "@/components/expand/ExpandShell";
import ExpandTemaInit from "@/components/expand/ExpandTemaInit";
import type { ReactNode } from "react";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

export default async function ExpandLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role, acessos").eq("id", user.id).single();
  const role = (me?.role as string) ?? "pendente";
  if (role === "cliente") redirect("/cliente");
  if (!["admin", "equipe"].includes(role)) redirect("/aguardando"); // pendente / sem papel

  const { pessoa, equipe } = await getPessoa();
  const isAdmin = role === "admin";
  const acessos = (me?.acessos as string[] | null) ?? [];

  return (
    <div className={`${cinzel.variable} tema-expand`}>
      <ExpandTemaInit />
      <ExpandShell pessoa={pessoa} equipe={equipe} podeTrocar={isAdmin} isAdmin={isAdmin} acessos={acessos}>{children}</ExpandShell>
    </div>
  );
}
