import { Cinzel } from "next/font/google";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExpandClienteShell from "@/components/expand/ExpandClienteShell";
import type { ReactNode } from "react";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

export default async function PortalLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role, expand_cliente").eq("id", user.id).single();
  const staff = !!me && ["admin", "equipe"].includes(me.role as string);
  const dono = (me?.expand_cliente as string | null) === id;
  if (!staff && !dono) redirect("/cliente");

  const { data: cli } = await supabase.from("expand_cliente_publico").select("nome").eq("id", id).single();
  if (!cli) notFound();

  return (
    <div className={`${cinzel.variable} tema-expand`}>
      <ExpandClienteShell clienteId={id} clienteNome={cli.nome as string}>{children}</ExpandClienteShell>
    </div>
  );
}
