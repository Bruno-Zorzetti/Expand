import { Cinzel } from "next/font/google";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExpandClienteShell from "@/components/expand/ExpandClienteShell";
import AcoesCliente from "@/components/expand/AcoesCliente";
import SinoCliente, { type NotifCli } from "@/components/expand/SinoCliente";
import { solicitarDemanda, marcarNotifCliente } from "@/app/expand/actions";
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

  // Link do grupo oficial de WhatsApp — o botão só aparece quando o link existe.
  const { data: g } = await supabase.from("expand_clientes").select("whatsapp_grupo_link").eq("id", id).maybeSingle();
  const grupoLink = (g?.whatsapp_grupo_link as string | null) ?? null;

  // Notificações do cliente: as guardadas + as aprovações pendentes (ao vivo, sempre no topo).
  const { data: nData } = await supabase
    .from("expand_notificacoes")
    .select("id, tipo, texto, link, lida, criado_em")
    .eq("cliente_id", id).order("criado_em", { ascending: false }).limit(30);
  const notas: NotifCli[] = ((nData ?? []) as NotifCli[]);

  const { data: etIds } = await supabase.from("expand_etapas").select("id, titulo").eq("cliente_id", id).eq("visivel_cliente", true);
  const mapaEtapa = new Map((etIds ?? []).map((e) => [e.id as string, e.titulo as string]));
  if (mapaEtapa.size) {
    const { data: pend } = await supabase.from("expand_arquivos").select("id, etapa_id, nome, criado_em").in("etapa_id", [...mapaEtapa.keys()]).eq("status", "pendente");
    for (const p of (pend ?? []) as { id: string; etapa_id: string; nome: string; criado_em: string }[]) {
      notas.unshift({
        id: `aprov-${p.id}`, tipo: "aprovacao", lida: false, criado_em: p.criado_em,
        texto: `"${p.nome}" espera sua aprovação — ${mapaEtapa.get(p.etapa_id) ?? "entrega"}`,
        link: `/portal/${id}/aprovacoes`,
      });
    }
  }

  const qtdPendentes = notas.filter(n => n.tipo === "aprovacao" && !n.lida).length;

  return (
    <div className={cinzel.variable}>
      <ExpandClienteShell
        clienteId={id}
        clienteNome={cli.nome as string}
        qtdPendentes={qtdPendentes}
        grupoLink={grupoLink}
        sino={<SinoCliente notas={notas} marcarLida={marcarNotifCliente} />}
        acoes={<AcoesCliente clienteId={id} grupoLink={grupoLink} solicitar={solicitarDemanda} />}
      >{children}</ExpandClienteShell>
    </div>
  );
}
