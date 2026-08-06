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
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["admin", "equipe"].includes(me.role as string)) redirect("/dashboard");

  const { pessoa, equipe } = await getPessoa();
  const podeTrocar = me.role === "admin";

  return (
    <div className={`${cinzel.variable} tema-expand`}>
      <ExpandTemaInit />
      <ExpandShell pessoa={pessoa} equipe={equipe} podeTrocar={podeTrocar}>{children}</ExpandShell>
    </div>
  );
}
