import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Nível de acesso da sessão. admin = diretoria (Bruno + Pedro) → dados sensíveis.
// equipe = suas tarefas + operação. cliente = portal. pendente = aguardando aprovação.
export type Acesso = {
  userId: string | null;
  role: string;
  isAdmin: boolean;
  isStaff: boolean;
  membro: string | null;
  cliente: string | null;
};

export async function getAcesso(): Promise<Acesso> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: "anon", isAdmin: false, isStaff: false, membro: null, cliente: null };
  const { data } = await supabase.from("profiles").select("role, expand_membro, expand_cliente").eq("id", user.id).single();
  const role = (data?.role as string) ?? "pendente";
  return {
    userId: user.id,
    role,
    isAdmin: role === "admin",
    isStaff: role === "admin" || role === "equipe",
    membro: (data?.expand_membro as string | null) ?? null,
    cliente: (data?.expand_cliente as string | null) ?? null,
  };
}

// Guarda de rota sensível: só admin passa; o resto volta pro Meu Dia.
export async function exigirAdmin(): Promise<Acesso> {
  const a = await getAcesso();
  if (!a.isAdmin) redirect("/expand");
  return a;
}
