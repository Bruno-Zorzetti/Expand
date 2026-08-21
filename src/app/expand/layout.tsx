import { Cinzel } from "next/font/google";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPessoa } from "@/lib/expand-user";
import ExpandShell from "@/components/expand/ExpandShell";
import ExpandTemaInit from "@/components/expand/ExpandTemaInit";
import { marcarNotificacaoLida, marcarTodasNotificacoes } from "@/app/expand/actions";
import type { Notif } from "@/components/expand/Notificacoes";
import type { ReactNode } from "react";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["500", "600", "700"] });

export default async function ExpandLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role, acessos, expand_modulos").eq("id", user.id).single();
  const role = (me?.role as string) ?? "pendente";
  if (role === "cliente") redirect("/cliente");
  if (!["admin", "equipe"].includes(role)) redirect("/aguardando"); // pendente / sem papel

  const { pessoa, equipe } = await getPessoa();
  const isAdmin = role === "admin";
  // acessos = permissões legacy (ex: "comercial") + módulos RBAC (ex: "tarefas.meudia")
  const acessosBase = (me?.acessos as string[] | null) ?? [];
  const modulos = (me?.expand_modulos as string[] | null) ?? [];
  const acessos = [...new Set([...acessosBase, ...modulos])];

  const { data: nData } = await supabase.from("expand_notificacoes")
    .select("id, tipo, texto, link, lida, criado_em").eq("membro_id", pessoa.id)
    .order("criado_em", { ascending: false }).limit(30);
  const notif = (nData ?? []) as Notif[];

  return (
    <div className={`${cinzel.variable} tema-expand`}>
      <ExpandTemaInit />
      <ExpandShell pessoa={pessoa} equipe={equipe} podeTrocar={isAdmin} isAdmin={isAdmin} acessos={acessos}
        notif={notif} marcarLida={marcarNotificacaoLida} marcarTodas={marcarTodasNotificacoes}
        >{children}</ExpandShell>
    </div>
  );
}
