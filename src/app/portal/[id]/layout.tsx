import { Cinzel } from "next/font/google";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExpandClienteShell from "@/components/expand/ExpandClienteShell";
import AcoesCliente from "@/components/expand/AcoesCliente";
import { versiculoDoDia } from "@/lib/versiculos";
import { solicitarDemanda } from "@/app/expand/actions";
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

  // Link do grupo oficial de WhatsApp (canal de relacionamento) quando configurado.
  let grupoLink: string | null = null;
  if (staff || dono) {
    const { data: g } = await supabase.from("expand_clientes").select("whatsapp_grupo").eq("id", id).maybeSingle();
    const jid = (g?.whatsapp_grupo as string | null) ?? null;
    if (jid) grupoLink = `https://wa.me/?text=${encodeURIComponent("Olá, equipe Expand!")}`;
  }

  return (
    <div className={`${cinzel.variable} tema-expand`}>
      <ExpandClienteShell
        clienteId={id}
        clienteNome={cli.nome as string}
        versiculo={versiculoDoDia()}
        acoes={<AcoesCliente clienteId={id} grupoLink={grupoLink} solicitar={solicitarDemanda} />}
      >{children}</ExpandClienteShell>
    </div>
  );
}
