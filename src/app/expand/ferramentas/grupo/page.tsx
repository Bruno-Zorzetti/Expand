import { createClient } from "@/lib/supabase/server";
import { exigirAdmin } from "@/lib/expand-acesso";
import { criarGrupo } from "@/app/expand/actions";
import CriarGrupo from "@/components/expand/CriarGrupo";

export const dynamic = "force-dynamic";

export default async function FerramentaGrupo() {
  await exigirAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("expand_clientes").select("id, nome, drive_folder_url").eq("ativo", true).order("nome");
  const clientes = ((data ?? []) as { id: string; nome: string; drive_folder_url: string | null }[]).map((c) => ({ id: c.id, nome: c.nome, drive: c.drive_folder_url }));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <>
      <p className="hx-eyebrow">Ferramentas · WhatsApp</p>
      <h1 className="ex-h1">Criar <span className="hx-accent-text">grupo</span></h1>
      <p className="ex-sub">Cria o grupo oficial do cliente pelo WhatsApp da operação: nome, descrição (já com os links do Drive e da área do cliente), participantes e quem é admin. Ao vincular a um cliente, o grupo já fica salvo no hub dele. Onboarding: “Criar grupo oficial com o cliente”.</p>
      <CriarGrupo clientes={clientes} siteUrl={siteUrl} criar={criarGrupo} />
    </>
  );
}
